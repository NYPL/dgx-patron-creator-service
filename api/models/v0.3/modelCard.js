const PatronValidator = () => {
  this.UNVALIDATED_ADDRESS_ERROR = `Address has not been validated.
    Validate address at /validate/address.`;
  
  this.validate = (patron) => {
    if (patron.work_address) {
      // There is a work address so the home address needs to be present,
      // confirmed, and normalized, but it doesn't need to meet the usual
      // home address policy requirements.
      patron.address = patron.address.normalized_version
      if (!patron.address) {
        patron.errors["address"].push(this.UNVALIDATED_ADDRESS_ERROR);
      }

      // The work address needs to be valid for a card.
      // patron = ??
      validate_address(patron, patron.work_address, "work_address", true)
    } else {
      // Without a work address, the home address must be valid for a card.
      validate_address(patron, patron.address, "work_address")
    }

    if (!patron.has_available_username) {
      patron.errors["username"].push(
        `Username has not been validated. Validate username at /validate/username.`
      );
    }

    if (patron.email && !patron.email.match(/\A[^@]+@[^@]+\z/)) {
      patron.errors["email"].push("Email address must be valid");
    }

    if (patron.birthdate) {
      validate_birthdate(patron, patron.birthdate)
    }

    return patron;
  };

  const validate_address = (patron, address, address_key, work_address=null) => {
    let valid_address = address.validated_version(patron.policy, work_address);

    if (valid_address) {
      // Check patron.policy for address limitations.
      if (patron.card_denied(valid_address, work_address)) {
        const message = Card.RESPONSES["card_denied"]["message"];
        patron.errors[address_key].push(message);
      } else if (valid_address.address_for_temporary_card(work_address)) {
        patron.set_temporary();
      }
      // Reset the patron's address to the validated version.
      let address_attribute_setter = (address_key.toString() + '=');
      patron.send(address_attribute_setter, valid_address);
    } else {
      patron.errors[address_key].push(this.UNVALIDATED_ADDRESS_ERROR);
    }

    // ?
    return patron;
  };

  const validate_birthdate = (patron, birthdate) => {
    if (patron.required_by_policy(birthdate)) {
      let min_age = patron.policy.minimum_age; //.year.ago;

      // TODO acquire an appropriate error message here for below minimum_age.
      if (!(min_age > birthdate)) {
        patron.errors[birthdate].push(
          "Date of birth is below the minimum age of 13."
        );
      }
    }
  };
};


const Card = (args) => {
  this.name = args["name"];
  this.address = args["address"];
  this.username = args["username"];
  this.pin = args["pin"];
  this.email = args["email"];
  this.birthdate = normalized_birthdate(args["birthdate"]);
  this.work_address = args["work_address"];
  this.ecommunications_pref = args["ecommunications_pref"];
  this.policy = args["policy"];
  this.is_temporary = false;

  // # Attributes set during processing
  this.barcode = undefined;
  this.ptype = undefined;
  this.patron_id = undefined;
  this.is_temporary = undefined;

  // validates_presence_of name, address, username, pin
  // validates_each [email, birthdate] do |card, attr, value|
  //   if card.required_by_policy(attr) && value.blank
  //      card.errors.push([attr, "can't be empty"])
  // validates [pin] { with: /\A\d{4}\z/, message: "must be 4 numbers" }

  const InvalidIlsDataError = () => {
    return "Some error with ILS";
  };

  this.NAME_VALIDATION_DISABLED = true;
  // # Card types for /validate/* responses
  this.TEMPORARY_CARD_TYPE = "temporary";
  this.STANDARD_CARD_TYPE = "standard";


  this.RESPONSES = {
    card_denied: {
      type: AddressValidationApi.VALID_ADDRESS_TYPE,
      card_type: null,
      message: `Library cards are only available for residents of New
        York State or students and commuters working in New York City.`
    },
    temporary_card: {
      type: AddressValidationApi.VALID_ADDRESS_TYPE,
      card_type: this.TEMPORARY_CARD_TYPE,
      message: `This valid address will result in a temporary library
        card. You must visit an NYPL branch within the next 30 days to
        receive a standard card.`,
    },
    standard_card: {
      type: AddressValidationApi.VALID_ADDRESS_TYPE,
      card_type: this.STANDARD_CARD_TYPE,
      message: 'This valid address will result in a standard library card.'
    }
  };

  const has_valid_name = () => {
    this.has_valid_name = this.has_valid_name !== undefined ? this.has_valid_username
      : (this.NAME_VALIDATION_DISABLED || check_name_validity());
    return this.has_valid_name;
  };

  const has_available_username = () => {
    this.has_valid_username = this.has_valid_username !== undefined ?
      this.has_valid_username : check_username_availability();
    return this.has_valid_username;
  };

  const required_by_policy = (field) => policy.is_required(field);
  const works_in_city = () => (
    this.work_address && this.work_address.in_city(this.policy)
  );
  const lives_or_works_in_city = () => 
    this.address.in_city(this.policy) || works_in_city();
  const lives_in_state = () => this.address.in_state(this.policy);
  // how to check validity?
  const valid_for_ils = () => valid && this.ptype.present;

  const set_barcode = () => this.barcode = Barcode.next_available;
  const set_ptype = () => this.ptype = this.policy.determine_ptype(this);

  const set_temporary = () => this.is_temporary = true;

  const card_denied = (address, is_work_address) => {
    if (this.policy.service_area.present) {
      return !address.in_state(policy) ||
        (is_work_address && !address.in_city(policy));
    }
    return false;
  };

  // # Convert MM/DD/YYYY to Date object.
  const normalized_birthdate = (birthdate = null) => {
    let date;
    if (birthdate) {
      const [month, day, year] = birthdate.split('/');
      // TODO convert to integer
      date = Date.new(year.to_i, month.to_i, day.to_i)
    }
    return date;
  };

  const create_ils_patron = () => {
    if (this.policy.is_required(this.barcode)) {
      set_barcode();
    };
    set_ptype();
    if (! valid_for_ils()) {
      throw new Error("InvalidIlsDataError");
    }

    // create the patron
    const client = IlsHelper.new();
    const response = client.create_patron(this);
    return response === typeof IlsHelper.IlsError ? false : response;
  };

  const set_patron_id = (response) =>
    this.patron_id = IlsHelper.get_patron_id_from_response(response);

  const set_temporary_barcode = () => {
    // Set patron_id as temporary barcode removing the check digit wrapper.
    this.barcode = this.patron_id; // get from values [1, 7]

    const client = IlsHelper.new();
    const response = client.update_patron(this);
    return response === typeof IlsHelper.IlsError ? false : response;
  };

  const check_card_type_policy = (valid_address, work_address=null) => {
    if (card_denied(valid_address, work_address)) {
      return {
        ...this.RESPONSES["card_denied"],
        address: valid_address.to_hash()
      };
    } else if (valid_address.address_for_temporary_card(work_address)) {
      return {
        ...this.RESPONSES["temporary_card"],
        address: valid_address.to_hash()
      };
    } else {
      return {
        ...this.RESPONSES["standard_card"],
        address: valid_address.to_hash()
      };
    }
  };

  const details = () => {
    let details = {
      barcode: this.barcode,
      username: this.username,
      pin: this.pin,
      temporary: this.is_temporary,
      message: select_message()
    };

    if (this.patron_id) {
      details = {
        ...details,
        patron_id: this.patron_id // from (1..7)
      };
    }

    return details;
  };

  // private

  const check_name_validity = () => {
    let validation = (new NameValidationApi()).validate(this.name);
    return (typeof validation === "object") &&
      (validation["type"] === NameValidationApi.VALID_NAME_TYPE);
  };

  const check_username_availability = () => {
    let validation = (new UsernameValidationApi()).validate(this.username);
    return (typeof validation === "object") &&
      (validation["type"] === UsernameValidationApi.AVAILABLE_USERNAME_TYPE);
  };

  const select_message = () => {
    if (!this.is_temporary) {
      return "Your library card has been created.";
    }

    const residential_work_address = (this.work_address && this.work_address.is_residential);
    let reason;
    if (!this.address.is_residential) {
      reason = "address";
    } else if (residential_work_address) {
      reason = "work address";
    } else {
      reason = "personal information";
    }

    // convert to right type
    let expiration = this.policy.card_type["temporary"] / 1; //.day.to_i
    return `Your library card is temporary because your ${reason} could not be
       verified. Visit your local NYPL branch within
       ${expiration} days to upgrade to a
       standard card.`;
  };
};

module.exports = {
  card: Card,
};
