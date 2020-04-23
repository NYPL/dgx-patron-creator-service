/* eslint-disable */
import AddressValidationApi from "../../controllers/v0.3/AddressValidationAPI";
import UsernameValidationApi from "../../controllers/v0.3/UsernameValidationAPI";
// import NameValidationApi from "../../controllers/v0.3/NameValidationAPI";

/**
 * A validator class to verify a card's address and birthdate. Doesn't
 * directly talk to an API so in this same file as a simple class.
 */
export class CardValidator {
  validate(card) {
    if (card.work_address) {
      // There is a work address so the home address needs to be present,
      // confirmed, and normalized, but it doesn't need to meet the usual
      // home address policy requirements.
      card.address = card.address.normalized_version();
      if (!card.address) {
        card.errors["address"] = [CardValidator.UNVALIDATED_ADDRESS_ERROR];
      }

      // The work address needs to be valid for a card.
      card = validate_address(card, card.work_address, "work_address", true);
    } else {
      // Without a work address, the home address must be valid for a card.
      card = validate_address(card, card.address, "address");
    }

    if (!card.check_valid_username()) {
      card.errors["username"] = [
        `Username has not been validated. Validate username at /validate/username.`,
      ];
    }

    if (card.email && !/\A[^@]+@[^@]+\z/.test(card.email)) {
      card.errors["email"] = ["Email address must be valid"];
    }

    if (card.birthdate) {
      card = validate_birthdate(card);
    }

    if (Object.keys(card.errors).length === 0) {
      return true;
    } else {
      return false;
    }
  }

  validate_address(card, address, address_key, work_address = null) {
    let valid_address = address.validated_version(work_address);

    if (valid_address) {
      // Check card.policy for address limitations.
      if (card.card_denied(valid_address, work_address)) {
        const message = Card.RESPONSES["card_denied"]["message"];
        card.errors[address_key].push(message);
      } else if (valid_address.address_for_temporary_card(work_address)) {
        card.set_temporary();
      }
      // Reset the card's address to the validated version.
      let address_attribute_setter = address_key + "=";
      card.send(address_attribute_setter, valid_address);
    } else {
      card.errors[address_key].push(CardValidator.UNVALIDATED_ADDRESS_ERROR);
    }

    return card;
  }

  validate_birthdate(card) {
    if (card.required_by_policy("birthdate")) {
      const min_age = card.policy.policyField("minimumAge"); //.year.ago;

      const today = new Date();
      const birthDate = new Date(card.birthdate);
      const age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age = age - 1;
      }

      if (min_age > age) {
        // TODO acquire an appropriate error message here for below minimum_age.
        card.errors["age"] = ["Date of birth is below the minimum age of 13."];
      }
    }
    return card;
  }
}
CardValidator.UNVALIDATED_ADDRESS_ERROR = `Address has not been validated.
    Validate address at /validate/address.`;

const cardValidator = new CardValidator();

/**
 * A card class to create proper Card data structure and validations
 * on that data.
 */
class Card {
  constructor(args) {
    this.name = args["name"];
    this.address = args["address"];
    this.username = args["username"];
    this.pin = args["pin"];
    this.email = args["email"] || "";
    this.birthdate = this.normalized_birthdate(args["birthdate"]);
    this.work_address = args["work_address"] || "";
    this.ecommunications_pref = args["ecommunications_pref"] || "";
    this.policy = args["policy"] || "";
    this.is_temporary = false;
    this.errors = {};

    // Attributes set during processing
    this.barcode = undefined;
    this.ptype = undefined;
    this.patron_id = undefined;
    this.has_valid_name = undefined;
    this.has_valid_username = undefined;
    this.valid = false;

    this.name_validation_disabled = true;
    // Card types for /validate/* responses
    this.TEMPORARY_CARD_TYPE = "temporary";
    this.STANDARD_CARD_TYPE = "standard";
  }

  validate() {
    const validate_by_policy = ["email", "birthdate"];
    // These four values are necessary
    if (!this.name || !this.address || !this.username || !this.pin) {
      return false;
    }
    if (!/\A\d{4}\z/.test(this.pin)) {
      this.errors["pin"] = "pin must be 4 numbers";
      return false;
    }
    validate_by_policy.forEach((attr) => {
      if (this.required_by_policy(attr) && this[attr] === "") {
        this.errors[attr] = `${attr} cannot be empty`;
      }
    });
    // Nope, some attributes are empty and required by the specific policy.
    if (Object.keys(this.errors).length === 0) {
      return false;
    }
    const is_valid = cardValidator.validate(this);
    if (is_valid) {
      this.valid = true;
    }
    return is_valid;
  }

  check_valid_name() {
    this.has_valid_name =
      this.has_valid_name !== undefined
        ? this.has_valid_name
        : this.name_validation_disabled || this.check_name_validity();
    return this.has_valid_name;
  }

  check_name_validity() {
    let validation = new NameValidationApi().validate(this.name);
    return (
      typeof validation === "object" &&
      validation["type"] === NameValidationApi.VALID_NAME_TYPE
    );
  }

  check_valid_username() {
    this.has_valid_username =
      this.has_valid_username !== undefined
        ? this.has_valid_username
        : this.check_username_availability();
    return this.has_valid_username;
  }

  check_username_availability() {
    let validation = new UsernameValidationApi().validate(this.username);
    return (
      typeof validation === "object" &&
      validation["type"] === UsernameValidationApi.AVAILABLE_USERNAME_TYPE
    );
  }

  required_by_policy(field) {
    return this.policy.isRequiredField(field);
  }
  works_in_city() {
    return this.work_address && this.work_address.in_city(this.policy.policy);
  }
  lives_or_works_in_city() {
    return this.address.in_city(this.policy.policy) || this.works_in_city();
  }
  lives_in_state() {
    return this.address.in_state(this.policy.policy);
  }
  // how to check validity?
  valid_for_ils() {
    return !!(this.valid && this.ptype);
  }

  set_barcode() {
    return (this.barcode = Barcode.next_available);
  }
  set_ptype() {
    return (this.ptype = this.policy.determine_ptype(this));
  }

  set_temporary() {
    return (this.is_temporary = true);
  }

  card_denied(address, is_work_address) {
    if (this.policy.service_area.present) {
      return (
        !address.in_state(policy) ||
        (is_work_address && !address.in_city(policy))
      );
    }
    return false;
  }

  // # Convert MM/DD/YYYY to Date object.
  normalized_birthdate(birthdate = null) {
    if (birthdate) {
      return new Date(birthdate);
    }
    return;
  }

  create_ils_patron() {
    if (this.policy.isRequiredField(this.barcode)) {
      this.set_barcode();
    }
    this.set_ptype();
    if (!this.valid_for_ils()) {
      throw new Error("Some error with ILS");
    }

    // create the patron
    const client = IlsHelper.new();
    const response = client.create_patron(this);
    return response === typeof IlsHelper.IlsError ? false : response;
  }

  set_patron_id(response) {
    return (this.patron_id = IlsHelper.getPatronIdFromResponse(response));
  }

  set_temporary_barcode() {
    // Set patron_id as temporary barcode removing the check digit wrapper.
    this.barcode = this.patron_id; // get from values [1, 7]

    const client = IlsHelper.new();
    const response = client.update_patron(this);
    return response === typeof IlsHelper.IlsError ? false : response;
  }

  check_card_type_policy(valid_address, work_address = null) {
    if (this.card_denied(valid_address, work_address)) {
      return {
        ...Card.RESPONSES["card_denied"],
        address: valid_address.address,
      };
    } else if (valid_address.address_for_temporary_card(work_address)) {
      return {
        ...Card.RESPONSES["temporary_card"],
        address: valid_address.address,
      };
    } else {
      return {
        ...Card.RESPONSES["standard_card"],
        address: valid_address.address,
      };
    }
  }

  details() {
    let details = {
      barcode: this.barcode,
      username: this.username,
      pin: this.pin,
      temporary: this.is_temporary,
      message: this.select_message(),
    };

    if (this.patron_id) {
      details = {
        ...details,
        patron_id: this.patron_id.substring(1, 7), // from (1..7)
      };
    }

    return details;
  }

  select_message() {
    if (!this.is_temporary) {
      return "Your library card has been created.";
    }

    const residential_work_address =
      this.work_address && this.work_address.is_residential;
    let reason;
    if (!this.address.is_residential) {
      reason = "address";
    } else if (residential_work_address) {
      reason = "work address";
    } else {
      reason = "personal information";
    }

    // convert to right type
    let expiration = this.policy.cardType["temporary"] / 1; //.day.to_i
    return `Your library card is temporary because your ${reason} could not be
       verified. Visit your local NYPL branch within
       ${expiration} days to upgrade to a
       standard card.`;
  }
}

Card.RESPONSES = {
  card_denied: {
    type: AddressValidationApi.VALID_ADDRESS_TYPE,
    card_type: null,
    message: `Library cards are only available for residents of New
      York State or students and commuters working in New York City.`,
  },
  temporary_card: {
    type: AddressValidationApi.VALID_ADDRESS_TYPE,
    card_type: Card.TEMPORARY_CARD_TYPE,
    message: `This valid address will result in a temporary library
      card. You must visit an NYPL branch within the next 30 days to
      receive a standard card.`,
  },
  standard_card: {
    type: AddressValidationApi.VALID_ADDRESS_TYPE,
    card_type: Card.STANDARD_CARD_TYPE,
    message: "This valid address will result in a standard library card.",
  },
};

export default Card;
