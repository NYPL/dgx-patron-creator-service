/* eslint-disable */
import AddressValidationApi from "../../controllers/v0.3/AddressValidationAPI";
import UsernameValidationApi from "../../controllers/v0.3/UsernameValidationAPI";
import NameValidationApi from "../../controllers/v0.3/NameValidationAPI";

/**
 * A validator class to verify a card's address and birthdate. Doesn't
 * directly talk to an API so in this same file as a simple class.
 */
export const CardValidator = () => {
  const UNVALIDATED_ADDRESS_ERROR = `Address has not been validated.
    Validate address at /validate/address.`;

  const validate = (card) => {
    if (card.workAddress) {
      // There is a work address so the home address needs to be present,
      // confirmed, and normalized, but it doesn't need to meet the usual
      // home address policy requirements.
      card.address = card.address.normalizedVersion();
      if (!card.address) {
        card.errors["address"] = [UNVALIDATED_ADDRESS_ERROR];
      }

      // The work address needs to be valid for a card.
      card = validateAddress(card, "workAddress", true);
    } else {
      // Without a work address, the home address must be valid for a card.
      card = validateAddress(card, "address");
    }

    if (!card.checkValidUsername()) {
      card.errors["username"] = [
        `Username has not been validated. Validate username at /validate/username.`,
      ];
    }

    if (card.email && !/\A[^@]+@[^@]+\z/.test(card.email)) {
      card.errors["email"] = ["Email address must be valid"];
    }

    if (card.birthdate) {
      card = validateBirthdate(card);
    }

    if (Object.keys(card.errors).length === 0) {
      return true;
    } else {
      return false;
    }
  };

  const validateAddress = (card, addressType, workAddress = null) => {
    let validAddress = card[addressType].validatedVersion(workAddress);

    if (validAddress) {
      // Check card.policy for address limitations.
      if (card.cardDenied(validAddress, workAddress)) {
        const message = Card.RESPONSES["cardDenied"]["message"];
        card.errors[addressType].push(message);
      } else if (validAddress.addressForTemporaryCard(workAddress)) {
        card.setTemporary();
      }
      // Reset the card's address type input to the validated version.
      card[addressType] = validAddress;
    } else {
      card.errors[addressType].push(UNVALIDATED_ADDRESS_ERROR);
    }

    return card;
  };

  const validateBirthdate = (card) => {
    if (card.requiredByPolicy("birthdate")) {
      const minAge = card.policy.policyField("minimumAge");

      const today = new Date();
      const birthdate = new Date(card.birthdate);
      const age = today.getFullYear() - birthdate.getFullYear();
      const m = today.getMonth() - birthdate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
        age = age - 1;
      }

      if (minAge > age) {
        // TODO acquire an appropriate error message here for below minimum age.
        card.errors["age"] = [
          `Date of birth is below the minimum age of ${minAge}.`,
        ];
      }
    }
    return card;
  };

  return {
    // Main function to use
    validate,
    // Exposing to test
    validateAddress,
    validateBirthdate,
  };
};

const cardValidator = CardValidator();

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
    this.birthdate = this.normalizedBirthdate(args["birthdate"]);
    this.workAddress = args["workAddress"] || "";
    this.ecommunicationsPref = args["ecommunicationsPref"] || "";
    this.policy = args["policy"] || "";
    this.isTemporary = false;
    this.errors = {};

    // Attributes set during processing
    this.barcode = undefined;
    this.ptype = undefined;
    this.patronId = undefined;
    this.hasValidName = undefined;
    this.hasValidUsername = undefined;
    this.valid = false;

    this.nameValidationDisabled = true;
    // Card types for /validate/* responses
    this.TEMPORARY_CARD_TYPE = "temporary";
    this.STANDARD_CARD_TYPE = "standard";
  }

  validate() {
    const validateByPolicy = ["email", "birthdate"];
    // These four values are necessary
    if (!this.name || !this.address || !this.username || !this.pin) {
      return false;
    }
    if (!/\A\d{4}\z/.test(this.pin)) {
      this.errors["pin"] = "pin must be 4 numbers";
      return false;
    }
    validateByPolicy.forEach((attr) => {
      if (this.requiredByPolicy(attr) && this[attr] === "") {
        this.errors[attr] = `${attr} cannot be empty`;
      }
    });
    // Nope, some attributes are empty and required by the specific policy.
    if (Object.keys(this.errors).length === 0) {
      return false;
    }
    const isValid = cardValidator.validate(this);
    if (isValid) {
      this.valid = true;
    }
    return isValid;
  }

  checkValidName() {
    this.hasValidName =
      this.hasValidName !== undefined
        ? this.hasValidName
        : this.nameValidationDisabled || this.checkNameValidity();
    return this.hasValidName;
  }

  checkNameValidity() {
    const { validate } = NameValidationApi();
    const validatedName = validate(this.name);
    return (
      typeof validatedName === "object" &&
      validatedName["type"] === NameValidationApi.VALID_NAME_TYPE
    );
  }

  checkValidUsername() {
    this.hasValidUsername =
      this.hasValidUsername !== undefined
        ? this.hasValidUsername
        : this.checkUsernameAvailability();
    return this.hasValidUsername;
  }

  checkUsernameAvailability() {
    const { responses, validate } = UsernameValidationApi();
    let validation = validate(this.username);
    return typeof validation === "object" && validation === responses.available;
  }

  requiredByPolicy(field) {
    return this.policy.isRequiredField(field);
  }
  worksInCity() {
    return this.workAddress && this.workAddress.inCity(this.policy.policy);
  }
  livesOrWorksInCity() {
    return this.address.inCity(this.policy.policy) || this.worksInCity();
  }
  livesInState() {
    return this.address.inState(this.policy.policy);
  }
  // how to check validity?
  validForIls() {
    return !!(this.valid && this.ptype);
  }

  setBarcode() {
    return (this.barcode = Barcode.nextAvailable);
  }
  setPtype() {
    return (this.ptype = this.policy.determinePtype(this));
  }

  setTemporary() {
    return (this.isTemporary = true);
  }

  cardDenied(address, isWorkAddress) {
    if (this.policy.serviceArea.present) {
      return (
        !address.inState(policy) || (isWorkAddress && !address.inCity(policy))
      );
    }
    return false;
  }

  // # Convert MM/DD/YYYY to Date object.
  normalizedBirthdate(birthdate = null) {
    if (birthdate) {
      return new Date(birthdate);
    }
    return;
  }

  createIlsPatron() {
    if (this.policy.isRequiredField(this.barcode)) {
      this.setBarcode();
    }
    this.setPtype();
    if (!this.validForIls()) {
      throw new Error("Some error with ILS");
    }

    // create the patron
    const client = IlsHelper.new();
    const response = client.createPatron(this);
    return response === typeof IlsHelper.IlsError ? false : response;
  }

  setPatronId(response) {
    return (this.patronId = IlsHelper.getPatronIdFromResponse(response));
  }

  setTemporaryBarcode() {
    // Set patronId as temporary barcode removing the check digit wrapper.
    this.barcode = this.patronId; // get from values [1, 7]

    const client = IlsHelper.new();
    const response = client.updatePatron(this);
    return response === typeof IlsHelper.IlsError ? false : response;
  }

  checkCardTypePolicy(validAddress, workAddress = null) {
    if (this.cardDenied(validAddress, workAddress)) {
      return {
        ...Card.RESPONSES["cardDenied"],
        address: validAddress.address,
      };
    } else if (validAddress.addressForTemporaryCard(workAddress)) {
      return {
        ...Card.RESPONSES["temporaryCard"],
        address: validAddress.address,
      };
    } else {
      return {
        ...Card.RESPONSES["standardCard"],
        address: validAddress.address,
      };
    }
  }

  details() {
    let details = {
      barcode: this.barcode,
      username: this.username,
      pin: this.pin,
      temporary: this.isTemporary,
      message: this.selectMessage(),
    };

    if (this.patronId) {
      details = {
        ...details,
        patronId: this.patronId.substring(1, 7), // from (1..7)
      };
    }

    return details;
  }

  selectMessage() {
    if (!this.isTemporary) {
      return "Your library card has been created.";
    }

    const residentialWorkAddress =
      this.workAddress && this.workAddress.isResidential;
    let reason;
    if (!this.address.isResidential) {
      reason = "address";
    } else if (residentialWorkAddress) {
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
  cardDenied: {
    type: AddressValidationApi.VALID_ADDRESS_TYPE,
    cardType: null,
    message: `Library cards are only available for residents of New
      York State or students and commuters working in New York City.`,
  },
  temporaryCard: {
    type: AddressValidationApi.VALID_ADDRESS_TYPE,
    cardType: Card.TEMPORARY_CARD_TYPE,
    message: `This valid address will result in a temporary library
      card. You must visit an NYPL branch within the next 30 days to
      receive a standard card.`,
  },
  standardCard: {
    type: AddressValidationApi.VALID_ADDRESS_TYPE,
    cardType: Card.STANDARD_CARD_TYPE,
    message: "This valid address will result in a standard library card.",
  },
};

export default Card;
