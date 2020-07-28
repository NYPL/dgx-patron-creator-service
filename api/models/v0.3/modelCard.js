/* eslint-disable */
const UsernameValidationApi = require("../../controllers/v0.3/UsernameValidationAPI");
const Address = require("./modelAddress");
const Barcode = require("./modelBarcode");
const { strToBool } = require("../../helpers/utils");

const {
  DatabaseError,
  MissingRequiredValues,
  IncorrectPin,
  NotILSValid,
  TermsNotAccepted,
  AgeGateFailure,
} = require("../../helpers/errors");

/**
 * A validator class to verify a card's address and birthdate. Doesn't
 * directly talk to an API so it's placed in this same file as a simple class.
 */
const CardValidator = () => {
  const NO_ADDRESS_ERROR = "An address was not added to the card.";

  /**
   * validate(card)
   * Validates that the card has a correct and valid address, username, email,
   * and birthdate.
   *
   * @param {Card object} card
   */

  const validate = async (card) => {
    // Will throw an error if the username is not valid.
    const validUsername = await card.checkValidUsername();
    if (!validUsername.available) {
      card.errors["username"] = validUsername.response.message;
    }

    // Validating the home address and an optional work address:
    card = await validateAddresses(card);

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

  const validateAddresses = async (card) => {
    if (!card.address) {
      card.errors["address"] = NO_ADDRESS_ERROR;
      // There's no home address so don't bother checking the work address.
      return card;
    } else {
      // The home address must be validated for a card.
      card = await validateAddress(card, "address");
    }

    // Work Address is optional.
    if (card.workAddress) {
      // The work address needs to be valid for a card. It's okay if the
      // work address is not valid, use the home address only instead.
      card = await validateAddress(card, "workAddress");
    }

    // Now the card object has updated home and work addresses that have been
    // validated by Service Objects. Now check to see what type of card the
    // patron gets based on the policy and addresses.
    // it will be denied for home addresses not in nys. if not in nys but there's
    // a work address in nyc, then grant a temporary card.
    card.cardType = card.getCardType();
    // If the card is denied, return the error and don't go any further. This
    // includes not having a work address to check if the patron at least
    // works in NYC.
    if (!card.cardType.cardType) {
      card.errors["address"] = card.cardType.message;
    }

    return card;
  };

  /**
   * validateAddress(card, addressType, workAddress)
   * Returns the card object with updated validated address or errors based
   * on policy and Service Objects verification.
   *
   * @param {Card object} card
   * @param {string} addressType - "address" or "workAddress"
   */
  const validateAddress = async (card, addressType = "address") => {
    // If the address has already been validated by the
    // /api/validations/address endpoint, then don't make a request to Service
    // Objects to validate the address. Just return the card because the
    // address is already correct.
    if (card[addressType].hasBeenValidated) {
      return card;
    }

    // Otherwise, let's make a call to Service Objects.
    let addressResponse = await card[addressType].validate();
    if (addressResponse.address) {
      // The validated address from SO is not an Address object, so create it:
      const address = new Address(
        {
          ...addressResponse.address,
          hasBeenValidated: addressResponse.address.hasBeenValidated,
        },
        card[addressType].soLicenseKey
      );
      // Reset the card's address type input to the validated version.
      card[addressType] = address;
    } else {
      card.errors[addressType] = addressResponse.error.message;
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
        card.errors[
          "age"
        ] = `Date of birth is below the minimum age of ${minAge}.`;
      }
    }
    return card;
  };

  return {
    // Main function to use
    validate,
    // Exposing to test
    validateAddress,
    validateAddresses,
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
    this.address = this.getOrCreateAddress(args["address"]);
    this.workAddress = this.getOrCreateAddress(args["workAddress"]);
    this.username = args["username"];
    this.usernameHasBeenValidated = !!args["usernameHasBeenValidated"];
    this.pin = args["pin"];
    this.email = args["email"] || "";
    this.birthdate = this.normalizedBirthdate(args["birthdate"]);
    this.ageGate = strToBool(args["ageGate"]);
    this.ecommunicationsPref = !!args["ecommunicationsPref"];
    this.policy = args["policy"] || "";
    this.isTemporary = false;
    this.varFields = args["varFields"] || {};
    // SimplyE will always set the home library to the `eb` code. Eventually,
    // the web app will pass a `homeLibraryCode` parameter with a patron's
    // home library. For now, `eb` is hardcoded.
    this.homeLibraryCode = args["homeLibraryCode"] || "eb";
    this.acceptTerms = strToBool(args["acceptTerms"]);
    this.errors = {};

    this.ilsClient = args["ilsClient"];

    // Attributes set during processing
    this.barcode = undefined;
    this.ptype = undefined;
    this.patronId = undefined;
    this.hasValidUsername = undefined;
    this.expirationDate = undefined;
    this.agency = undefined;
    this.valid = false;
    this.cardType = {};
  }

  /**
   * getOrCreateAddress(address)
   * If the address argument is an Address object, then return it. Otherwise,
   * create a new Addres object with the argument object.
   * @param {object} address
   */
  getOrCreateAddress(address) {
    if (!address) {
      return;
    }
    return address instanceof Address ? address : new Address(address);
  }

  /**
   * validate()
   * Runs simple validations to make sure that the arguments are present and
   * passes the needed requirements, and once those pass, then validates the
   * card's address and username against the ILS.
   */
  async validate() {
    // First check if the terms were accepted.
    if (!this.acceptTerms) {
      throw new TermsNotAccepted();
    }

    // For "simplye" policy types, the user must pass through the age gate,
    // which is simply a checkbox and boolean value that the patron is over
    // the age of 13.
    if (this.policy.policyType === "simplye" && !this.ageGate) {
      throw new AgeGateFailure();
    }

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
        throw new MissingRequiredValues(
          `${attr} cannot be empty for this policy type.`
        );
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
    let userNameResponse;

    // If the username has already been validated using
    // /api/validations/username, then don't make the API request to the ILS.
    if (this.usernameHasBeenValidated) {
      userNameResponse = responses.available;
    } else {
      userNameResponse = await validate(this.username);
    }

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

  /**
   * getExpirationDays()
   * Get the number of days that the current card is set to expired
   * based on the current policy.
   */
  getExpirationDays() {
    const policy = this.policy.policy;
    return this.isTemporary
      ? policy.cardType["temporary"]
      : policy.cardType["standard"];
  }
  /**
   * setExpirationDate()
   * Set's the expiration date for the account based on the current policy and
   * whether the card is temporary or not. The card validation must be
   * executed before this function to check whether the card is temporary or
   * it will always be set to temporary.
   */
  setExpirationDate() {
    const now = new Date();
    const policyDays = this.getExpirationDays();
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

  /**
   * checkWorkType()
   * This is used in the /validations/address endpoint only.
   * The `address` is used as a work address, so never return a standard
   * card. Now check if the work address is in the city. If it is,
   * it is a temporary card, otherwise it's denied.
   */
  checkWorkType() {
    return this.address.inCity(this.policy)
      ? Card.RESPONSES["temporaryCard"]
      : Card.RESPONSES["cardDenied"];
  }

  /**
   * getCardType()
   * Returns an object response with what type of card, based on the policy and
   * the patron's address, is processed.
   * - Web applicants always get a temporary card.
   * - For simplye applicants:
   *   denied - if the home address is not in NYS and there is no work address
   *           or the work address is not in NYC.
   *   temporary - 1 - if the home address is not in NYS but the work address
   *           is in NYC.
   *             - 2 - if they are in NYC but the address is not residential
   *   standard - the patron is in NYC and has a residential home address,
   *           regardless if they have a work address or not.
   */
  getCardType() {
    // Is this card for a web applicant? They always get a temporary card since
    // the webApplicant policy doesn't have a service area.
    if (!this.policy.policy.serviceArea) {
      this.setTemporary();
      return {
        ...Card.RESPONSES["temporaryCard"],
        reason: "The policy for this card is web applicant.",
      };
    }

    // Otherwise it's a simplye policy. They are denied if the card's home
    // address is not in NY state and there is no work address, or there is a
    // work address but it's not in NYC.
    if (!this.livesInState()) {
      if (this.worksInCity()) {
        this.setTemporary();
        return {
          ...Card.RESPONSES["temporaryCard"],
          reason:
            "The home address is not in New York State but the work address is in New York City.",
        };
      }
      return Card.RESPONSES["cardDenied"];
    }

    // they're in nys but make sure they are in nyc and is a residential
    // address for a standard card.
    if (
      !(this.address.inCity(this.policy) && this.address.address.isResidential)
    ) {
      this.setTemporary();
      return {
        ...Card.RESPONSES["temporaryCard"],
        reason: "The home address is in NYC but is not residential.",
      };
    }

    return Card.RESPONSES["standardCard"];
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
   * setPatronId(data)
   * Parses the id from the response `link` string from the ILS, and sets
   * it on `this.patronId`.
   * @param {object} data
   */
  setPatronId(data) {
    if (data && data.link) {
      this.patronId = parseInt(data.link.split("/").pop(), 10);
    }
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
        return {
          status: 400,
          data: error.message,
        };
      }
    }

    // Now create the patron in the ILS.
    try {
      response = await this.ilsClient.createPatron(this);
      this.setPatronId(response.data);
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
   * details()
   * Returns a simple object with all the card's current values.
   */
  details() {
    let details = {
      type: "card-granted",
      barcode: this.barcode,
      username: this.username,
      pin: this.pin,
      temporary: this.isTemporary,
      message: this.selectMessage(),
    };

    if (this.patronId) {
      details = {
        ...details,
        patronId: this.patronId,
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
      return this.cardType.message;
    }

    const { message, reason = "" } = this.cardType;

    // Expiration in days.
    const expiration = this.policy.policy.cardType["temporary"];
    const expirationString = `Visit your local NYPL branch within ${expiration} days to upgrade to a standard card.`;
    return `${message} ${reason} ${expirationString}`;
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
    message: "The library card will be a temporary library card.",
  },
  standardCard: {
    cardType: "standard",
    message: "The library card will be a standard library card.",
  },
};

module.exports = {
  CardValidator,
  Card,
};
