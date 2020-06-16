/* eslint-disable */
const AddressValidationAPI = require("../../controllers/v0.3/AddressValidationAPI");
const UsernameValidationApi = require("../../controllers/v0.3/UsernameValidationAPI");
const Barcode = require("./modelBarcode");
const {
  DatabaseError,
  MissingRequiredValues,
  IncorrectPin,
  NotILSValid,
} = require("../../helpers/errors");

/**
 * A validator class to verify a card's address and birthdate. Doesn't
 * directly talk to an API so it's placed in this same file as a simple class.
 */
const CardValidator = () => {
  const UNVALIDATED_ADDRESS_ERROR = "Address has not been validated.";

  /**
   * validate(card)
   * Validates that the card has a correct and valid address, username, email,
   * and birthdate.
   *
   * @param {Card object} card
   */
  const validate = async (card) => {
    if (card.workAddress) {
      // There is a work address so the home address needs to be present,
      // confirmed, and normalized, but it doesn't need to meet the usual
      // home address policy requirements.
      if (!card.address || !card.address.hasBeenValidated) {
        card.errors["address"] = UNVALIDATED_ADDRESS_ERROR;
      }

      // The work address needs to be valid for a card.
      card = validateAddress(card, "workAddress", true);
    } else {
      // Without a work address, the home address must be valid for a card.
      card = validateAddress(card, "address");
    }

    // Will throw an error if the username is not valid.
    const validUsername = await card.checkValidUsername();
    if (!validUsername.available) {
      card.errors["username"] = validUsername.response.message;
    }

    if (card.email && !/^[^@]+@[^@]+$/.test(card.email)) {
      card.errors["email"] = "Email address must be valid";
    }

    if (card.birthdate) {
      card = validateBirthdate(card);
    }

    if (Object.keys(card.errors).length === 0) {
      card.setExpirationDate();
      return { card, valid: true };
    } else {
      return { card, valid: false };
    }
  };

  /**
   * validateAddress(card, addressType, workAddress)
   * Returns the card object with updated validated address or errors based
   * on policy and ILS verification.
   *
   * @param {Card object} card
   * @param {string} addressType - "address" or "workAddress"
   * @param {boolean} isWorkAddress
   */
  const validateAddress = (card, addressType, workAddress = null) => {
    let validAddress = card[addressType].validatedVersion(workAddress);

    if (validAddress) {
      // Check card.policy for address limitations.
      if (card.cardDenied(validAddress, workAddress)) {
        const message = Card.RESPONSES["cardDenied"]["message"];
        card.errors[addressType] = message;
      } else if (validAddress.addressForTemporaryCard(workAddress)) {
        card.setTemporary();
      }
      // Reset the card's address type input to the validated version.
      card[addressType] = validAddress;
    } else {
      card.errors[addressType] = UNVALIDATED_ADDRESS_ERROR;
    }

    return card;
  };

  /**
   * validateBirthdate(card)
   * Validates the card's birthdate.
   *
   * @param {Card object} card
   */
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
 *
 * @param {object} args - Object consisting of the name string,
 *  address Address object, username string, pin string, email string,
 *  birthdate string, workAddress Address object, ecommunicationsPref string,
 *  and policy Policy object.
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
    this.ecommunicationsPref = args["ecommunicationsPref"] || false;
    this.policy = args["policy"] || "";
    this.isTemporary = false;
    this.varFields = args["varFields"] || {};
    // SimplyE will always set the home library to the `eb` code. Eventually,
    // the web app will pass a `homeLibraryCode` parameter with a patron's
    // home library. For now, `eb` is hardcoded.
    this.homeLibraryCode = args["homeLibraryCode"] || "eb";
    this.errors = {};

    this.ilsClient = args["ilsClient"];

    // Attributes set during processing
    this.barcode = undefined;
    this.ptype = undefined;
    this.patronId = undefined;
    this.hasValidName = undefined;
    this.hasValidUsername = undefined;
    this.expirationDate = undefined;
    this.agency = undefined;
    this.valid = false;

    this.nameValidationDisabled = true;
    // Card types for /validate/* responses
    this.TEMPORARY_CARD_TYPE = "temporary";
    this.STANDARD_CARD_TYPE = "standard";
  }

  /**
   * validate()
   * Runs simple validations to make sure that the arguments are present and
   * passes the needed requirements, and once those pass, then validates the
   * card's address and username against the ILS.
   */
  async validate() {
    // These four values are necessary for a Card object:
    // name, address, username, pin
    if (!this.name || !this.address || !this.username || !this.pin) {
      throw new MissingRequiredValues(
        "'name', 'address', 'username', and 'pin' are all required."
      );
    }
    // The pin must be a 4 digit string. Throw an error if it's incorrect.
    if (!/^\d{4}$/.test(this.pin)) {
      throw new IncorrectPin();
    }
    const validateByPolicy = ["email", "birthdate"];
    // Depending on the policy, some fields are required. Throw an error
    // if a required field is missing.
    validateByPolicy.forEach((attr) => {
      if (this.requiredByPolicy(attr) && !this[attr]) {
        throw new MissingRequiredValues(`${attr} cannot be empty`);
      }
    });
    // Now that all values have gone through a basic validation process,
    // do the more in-depth validation.
    const validated = await cardValidator.validate(this);
    if (validated.valid) {
      this.valid = true;
    }
    return { valid: this.valid, errors: this.errors };
  }

  /**
   * checkValidUsername()
   * Check if the username is available. If it available (true) or
   * not available (false), return that value. Otherwise, the username
   * hasn't been checked so check its availability against the
   * UsernameValidation API. This works as an internal cache so it won't
   * call the ILS API if it already received a value.
   */
  async checkValidUsername() {
    this.hasValidUsername =
      this.hasValidUsername !== undefined
        ? this.hasValidUsername
        : await this.checkUsernameAvailability();
    return this.hasValidUsername;
  }

  /**
   * checkUsernameAvailability()
   * Verifies that the current username is valid against the
   * UsernameValidation API.
   */
  async checkUsernameAvailability() {
    const { responses, validate } = UsernameValidationApi({
      ilsClient: this.ilsClient,
    });
    let userNameResponse = await validate(this.username);

    return {
      available:
        typeof userNameResponse === "object" &&
        userNameResponse.type === responses.available.type,
      response: userNameResponse,
    };
  }

  /**
   * requiredByPolicy(field)
   * Checks if the field is required in the current policy.
   *
   * @param {string} field
   */
  requiredByPolicy(field) {
    return this.policy.isRequiredField(field);
  }

  /**
   * worksInCity()
   * Checks if the card has a work address in NYC.
   */
  worksInCity() {
    return !!(this.workAddress && this.workAddress.inCity(this.policy));
  }

  /**
   * livesOrWorksInCity()
   * Checks if the card has an address in NYC or a work address in NYC.
   */
  livesOrWorksInCity() {
    return !!(this.address.inCity(this.policy) || this.worksInCity());
  }

  /**
   * livesInState()
   * Checks if the card has an address in NY state.
   */
  livesInState() {
    return this.address.inState(this.policy);
  }

  /**
   * validForIls()
   * Checks if the current card is valid and has a ptype.
   */
  validForIls() {
    return !!(this.valid && this.ptype);
  }

  /**
   * setBarcode()
   * Sets this card's barcode to the next available barcode in the ILS.
   */
  async setBarcode() {
    const barcode = new Barcode({ ilsClient: this.ilsClient });
    this.barcode = await barcode.getNextAvailableBarcode();

    // Throw an error so no attempt to create the patron in the ILS is made.
    if (!this.barcode) {
      throw new DatabaseError(
        "Could not generate a new barcode. Please try again."
      );
    }
  }

  /**
   * freeBarcode()
   * Sets the current barcode's `used` value to false, possibly because
   * creating a patron in the ILS failed and the barcode is now free to use.
   */
  async freeBarcode() {
    const barcode = new Barcode({ ilsClient: this.ilsClient });
    await barcode.freeBarcode(this.barcode);

    this.barcode = "";
  }

  /**
   * setPtype()
   * Sets the ptype for the current card based on the current policy.
   */
  setPtype() {
    this.ptype = this.policy.determinePtype(this);
  }

  /**
   * setAgency()
   * Sets the agency for the current card based on the current policy.
   */
  setAgency() {
    this.agency = this.policy.policy.agency;
  }

  /**
   * setTemporary()
   * Sets the current card to temporary.
   */
  setTemporary() {
    this.isTemporary = true;
  }

  setExpirationDate() {
    let now = new Date();
    let policy = this.policy.policy;

    let policyDays = this.determinePermanentCard()
      ? policy.cardType["standard"]
      : policy.cardType["temporary"];

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const expirationDate = new Date(
      currentYear,
      currentMonth,
      currentDay + policyDays
    );

    this.expirationDate = expirationDate;
  }

  determinePermanentCard() {
    // False if a patron's existing work address isn't commercial
    if (this.workAddress && this.workAddress.isResidential) {
      return false;
    }

    // False if patron provides a home address that is not residential
    // False if patron does not have a recognized name
    // False if patron policy is not the default (simplye)
    return this.address.address.isResidential && this.policy.isDefault;
  }

  /**
   * cardDenied()
   * Returns true if the card's address is not in NY state. Returns false if
   * the card is for a web applicant (no serviceArea fields), if they don't
   * live in NY state but work in NYC.
   */
  cardDenied(address, isWorkAddress) {
    if (this.policy.policy.serviceArea) {
      // If they are not in NY state, check to see if the patron
      // works in NYC.
      if (!address.inState(this.policy)) {
        if (isWorkAddress) {
          return false;
        }
        return true;
      }
    }
    return false;
  }

  /**
   * normalizedBirthdate(birthdate)
   * Convert a MM/DD/YYYY date string to a Date object.
   */
  normalizedBirthdate(birthdate) {
    if (birthdate) {
      return new Date(birthdate);
    }
    return;
  }

  /**
   * createIlsPatron()
   * If the current card is valid, then create it against the ILS API.
   */
  async createIlsPatron() {
    let response;
    this.setPtype();
    this.setAgency();

    if (!this.validForIls()) {
      throw new NotILSValid("The card has not been validated or has no ptype.");
    }

    // For patrons with the `simplye` policy type, the barcode is required,
    // so let's create one. If no barcode is created, an error will be thrown
    // an the patron won't be created in the ILS.
    if (this.policy.isRequiredField("barcode")) {
      try {
        await this.setBarcode();
      } catch (error) {
        // Could not generate a new barcode so return that as the response.
        // TODO: Throw a better error.
        return {
          status: 400,
          data: error.message,
        };
      }
    }

    // Now create the patron in the ILS.
    try {
      response = await this.ilsClient.createPatron(this);
    } catch (error) {
      if (this.policy.isRequiredField("barcode")) {
        // We want to catch the error from creating a patron here to be able to
        // free up the barcode in the database. Continue to send the same error
        // as an API response.
        await this.freeBarcode(this.barcode);
      }
      throw error;
    }

    return response;
  }

  /**
   * checkCardTypePolicy(validAddress, workAddress)
   * Returns a response object based on the type of card that is set.
   *
   * @param {Address object} validAddress
   * @param {boolean} workAddress
   */
  checkCardTypePolicy(validAddress, workAddress = null) {
    if (this.cardDenied(validAddress, workAddress)) {
      return Card.RESPONSES["cardDenied"];
    } else if (validAddress.addressForTemporaryCard(workAddress)) {
      return Card.RESPONSES["temporaryCard"];
    } else {
      return Card.RESPONSES["standardCard"];
    }
  }

  /**
   * details()
   * Returns a simple object with all the card's current values.
   */
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

  /**
   * selectMessage()
   * Returns the appropriate messaged based on the card's validity or errors.
   */
  selectMessage() {
    if (!this.isTemporary) {
      return "Your library card has been created.";
    }

    const residentialWorkAddress =
      this.workAddress && this.workAddress.address.isResidential;
    let reason;

    if (!this.address.address.isResidential) {
      reason = "address";
    } else if (residentialWorkAddress) {
      reason = "work address";
    } else {
      reason = "personal information";
    }

    // Expiration in days.
    const expiration = this.policy.policy.cardType["temporary"];
    return `Your library card is temporary because your ${reason} could not be
        verified. Visit your local NYPL branch within ${expiration} days to
        upgrade to a standard card.`;
  }
}

Card.RESPONSES = {
  cardDenied: {
    cardType: null,
    message:
      "Library cards are only available for residents of New York State or students and commuters working in New York City.",
  },
  temporaryCard: {
    cardType: "temporary",
    message:
      "This address will result in a temporary library card. You must visit an NYPL branch within the next 30 days to receive a standard card.",
  },
  standardCard: {
    cardType: "standard",
    message: "This valid address will result in a standard library card.",
  },
};

module.exports = {
  CardValidator,
  Card,
};
