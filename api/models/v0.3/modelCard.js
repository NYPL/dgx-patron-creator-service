const UsernameValidationApi = require("../../controllers/v0.3/UsernameValidationAPI");
const Address = require("./modelAddress");
const Barcode = require("./modelBarcode");
const { strToBool } = require("../../helpers/utils");
const {
  DatabaseError,
  InvalidRequest,
  NotILSValid,
  TermsNotAccepted,
  AgeGateFailure,
} = require("../../helpers/errors");

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
    this.name = args.name;
    this.address = this.getOrCreateAddress(args.address);
    this.workAddress = this.getOrCreateAddress(args.workAddress);
    this.location = args.location || "";
    this.username = args.username;
    this.usernameHasBeenValidated = !!args.usernameHasBeenValidated;
    this.pin = args.pin;
    this.email = args.email;
    this.birthdate = this.normalizedBirthdate(args.birthdate);
    this.ageGate = strToBool(args.ageGate);
    this.ecommunicationsPref = !!args.ecommunicationsPref;
    this.policy = args.policy;
    this.varFields = args.varFields || {};
    // SimplyE will always set the home library to the `eb` code. Eventually,
    // the web app will pass a `homeLibraryCode` parameter with a patron's
    // home library. For now, `eb` is hardcoded.
    this.homeLibraryCode = args.homeLibraryCode || "eb";
    this.acceptTerms = strToBool(args.acceptTerms);
    this.ilsClient = args.ilsClient;

    this.errors = {};
    this.addressError = "";

    // Attributes set during processing
    this.isTemporary = false;
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
    // First check if the terms and conditions were accepted. If not, we don't
    // bother to check the rest of the request values.
    if (!this.acceptTerms) {
      throw new TermsNotAccepted();
    }

    // These values are necessary for a Card object:
    // name, address, email, username, pin, birthdate or ageGate.
    // First check and return an error for any empty values.
    if (
      !this.name ||
      !this.address ||
      !this.username ||
      !this.pin ||
      !this.email
    ) {
      throw new InvalidRequest(
        "'name', 'address', 'username', 'pin', and 'email' are all required fields."
      );
    }

    // For "simplye" policy types, the user must pass through the age gate,
    // which is simply a checkbox and boolean value that the patron is over
    // the age of 13.
    if (this.requiredByPolicy("ageGate") && !this.ageGate) {
      throw new AgeGateFailure();
    }
    if (this.requiredByPolicy("birthdate") && !this.birthdate) {
      throw new InvalidRequest("'birthdate' is a required field.");
    }

    // Now that we have all values, validate each field and if there are any
    // errors, collect them in the `errors` object which will be returned
    // to the user.
    if (this.email && !/^[^@]+@[^@]+$/.test(this.email)) {
      this.errors["email"] = "Email address must be valid.";
    }

    // The pin must be a 4 digit string. Throw an error if it's incorrect.
    if (!/^\d{4}$/.test(this.pin)) {
      this.errors["pin"] =
        "PIN should be 4 numeric characters only. Please revise your PIN.";
    }

    if (this.requiredByPolicy("birthdate")) {
      this.validateBirthdate();
    }

    // Will throw an error if the username is not valid.
    const validUsername = await this.checkValidUsername();
    if (!validUsername.available) {
      this.errors["username"] = validUsername.response.message;
    }

    // Validating the home address and an optional work address:
    await this.validateAddresses();

    if (Object.keys(this.errors).length === 0) {
      this.valid = true;
      // For valid data, set the ptype.
      this.setPtype();
      // Now set the expiration date based on the ptype.
      this.setExpirationDate();
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
   * worksInNYCity()
   * Checks if the card has a work address in NYC.
   */
  worksInNYCity() {
    return !!(this.workAddress && this.workAddress.inNYCity());
  }

  livesInNYCity() {
    return !!this.address.inNYCity();
  }

  /**
   * livesOrWorksInNYCity()
   * Checks if the card has an address in NYC or a work address in NYC.
   */
  livesOrWorksInNYCity() {
    return !!(this.livesInNYCity() || this.worksInNYCity());
  }

  /**
   * livesInUS
   * Checks if the card has an address in the US.
   */
  livesInUS() {
    return this.address.inUS();
  }

  /**
   * livesInUS
   * Checks if the card has an address in the US.
   */
  worksInUS() {
    return this.workAddress.inUS();
  }

  /**
   * livesInNYState()
   * Checks if the card has an address in NY state.
   */
  livesInNYState() {
    return this.address.inNYState();
  }

  /**
   * addressHasBeenValidated()
   * Checks if the card's home address has been validated by Service Objects.
   */
  addressHasBeenValidated() {
    return this.address.hasBeenValidated;
  }

  /**
   * addressIsResidential()
   * Checks if the card's home address is residential.
   */
  addressIsResidential() {
    return this.address.address.isResidential;
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
    // TODO: Get/set barcode values based on ptype when that's settled.
    // For now this is mocked.
    const barcodeStartSequence = "288888"; // "25555";
    const barcode = new Barcode({ ilsClient: this.ilsClient });
    this.barcode = await barcode.getNextAvailableBarcode(barcodeStartSequence);

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
    const expirationPolicies = this.policy.getExpirationPoliciesForPtype(
      this.ptype
    );
    return this.isTemporary
      ? expirationPolicies["temporary"]
      : expirationPolicies["standard"];
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
    return this.address.inNYCity()
      ? Card.RESPONSES["temporaryCard"]
      : Card.RESPONSES["cardDenied"];
  }

  /**
   * getCardType()
   * Returns an object response with what type of card, based on the policy and
   * the patron's address, is processed.
   * - "SimplyE Juveniles" always get a standard card.
   * - "Web applicants" get a temporary card or standard card:
   *   temporary - 1 - if the home address is not in NYS but the work address
   *           is in NYC.
   *             - 2 - if they are in NYS but the address is not residential
   *   standard - the patron is in NYS and has a residential home address,
   *           regardless if they have a work address or not.
   * - "Simplye" applicants get a denied, temporary, or standard card:
   *   denied - if the home address is not in NYS and there is no work address
   *           or the work address is not in NYC.
   *   temporary - 1 - if the home address is not in NYS but the work address
   *           is in NYC.
   *             - 2 - if they are in NYC but the address is not residential
   *   standard - the patron is in NYC and has a residential home address,
   *           regardless if they have a work address or not.
   */
  getCardType() {
    // This policy type always get a standard card.
    if (this.policy.policyType === "simplyeJuvenile") {
      return Card.RESPONSES["standardCard"];
    }

    if (this.policy.policyType === "webApplicant") {
      return Card.RESPONSES["temporaryCard"];
    }

    // The user is denied if the card's home address is not in NY state and
    // there is no work address, or there is a work address but it's not in NYC.
    if (!this.livesInNYState()) {
      // If the work address is in NYC or the policy type is "webApplicant",
      // the user gets a temporary card.
      if (this.worksInNYCity()) {
        let reason =
          "The home address is not in New York State but the work address is in New York City.";
        if (this.addressError) {
          reason = `${reason} ${this.addressError}`;
        }

        return {
          ...Card.RESPONSES["temporaryCard"],
          reason,
        };
      }

      return Card.RESPONSES["cardDenied"];
    }

    // The user is in NYS. We must make sure they are in NYC and their address
    // is residential for a standard card. Otherwise, the user gets a
    // temporary card.
    if (!(this.address.inNYCity() && this.address.address.isResidential)) {
      let reason = "The home address is in NYC but is not residential.";
      if (this.addressError) {
        reason = `${reason} ${this.addressError}`;
      }

      return {
        ...Card.RESPONSES["temporaryCard"],
        reason,
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
    this.setAgency();

    // To prevent calling this function before validating the data and
    // setting a ptype.
    if (!this.validForIls()) {
      throw new NotILSValid("The card has not been validated or has no ptype.");
    }

    // The barcode is required for all ptypes we will assign. If no barcode
    // is created, an error will be thrown and the patron won't be created
    // in the ILS.
    await this.setBarcode();

    // Now create the patron in the ILS.
    console.log("this card", this);
    try {
      response = await this.ilsClient.createPatron(this);
      this.setPatronId(response.data);
    } catch (error) {
      // We want to catch the error from creating a patron here to be able to
      // free up the barcode in the database. Continue to send the same error
      // as an API response.
      await this.freeBarcode(this.barcode);
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
      detail: this.selectMessage(),
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
   * Returns the appropriate message based on the card's validity or errors.
   */
  selectMessage() {
    if (!this.isTemporary) {
      return this.cardType.message;
    }

    const { message, reason = "" } = this.cardType;

    // Expiration in days.
    const expiration = this.getExpirationDays();
    const expirationString = `Visit your local NYPL branch within ${expiration} days to upgrade to a standard card.`;
    return `${message} ${reason} ${expirationString}`;
  }

  async validateAddresses() {
    if (!this.address) {
      this.errors["address"] = "An address was not added to the card.";
      // There's no home address so don't bother checking the work address.
      return;
    } else {
      // The home address must be validated for a card.
      await this.validateAddress("address");
    }

    // Work Address is optional.
    if (this.workAddress) {
      // The work address needs to be valid for a card. It's okay if the
      // work address is not valid, use the home address only instead.
      await this.validateAddress("workAddress");
    }

    // Now the card object has updated home and work addresses that have been
    // validated by Service Objects. Now check to see what type of card the
    // patron gets based on the policy and addresses. It will be denied for
    // home addresses not in NYS. If the address is not in NYS but there's
    // a work address in NYC, then grant a temporary card.
    this.cardType = this.getCardType();
    // If the result is a temporary policy, set the card to temporary.
    if (this.cardType.cardType === "temporary") {
      this.setTemporary();
    }
    // If the card is denied, return the error and don't go any further.
    if (!this.cardType.cardType) {
      this.errors["address"] = this.cardType.message;
    }
  }

  /**
   * validateAddress(addressType)
   * Returns the card object with updated validated address or errors based
   * on policy and Service Objects verification.
   *
   * @param {Card object} card
   * @param {string} addressType - "address" or "workAddress"
   */
  async validateAddress(addressType = "address") {
    // If the address has already been validated by the
    // /api/validations/address endpoint, then don't make a request to Service
    // Objects to validate the address. Just return the card because the
    // address is already correct.
    if (this[addressType].hasBeenValidated) {
      return;
    }

    // Otherwise, let's make a call to Service Objects.
    let addressResponse = await this[addressType].validate();

    // If there's an `error` property in `addressResponse`, then this will be
    // skipped. The address could not be validated but the naive "is the
    // address in NYC or NYS" checks are still done in `getCardType`.
    if (addressResponse.error) {
      this.addressError =
        "There was an error verifying the address through Service Objects.";
    }

    if (addressResponse.address) {
      // The validated address from SO is not an Address object, so create it:
      const address = new Address(
        {
          ...addressResponse.address,
          hasBeenValidated: addressResponse.address.hasBeenValidated,
        },
        this[addressType].soLicenseKey
      );
      // Reset the card's address type input to the validated version.
      this[addressType] = address;
    } else if (addressResponse.addresses) {
      this.errors[addressType] = {
        detail: Card.RESPONSES.cardDeniedMultipleAddresses.message,
        addresses: addressResponse.addresses,
      };
    }
  }

  /**
   * validateBirthdate
   * Validates the card's birthdate.
   */
  validateBirthdate() {
    const minAge = this.policy.policyField("minimumAge");
    const today = new Date();
    const birthdate = new Date(this.birthdate);
    let age = today.getFullYear() - birthdate.getFullYear();
    const m = today.getMonth() - birthdate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
      age = age - 1;
    }

    if (minAge > age) {
      this.errors[
        "birthdate"
      ] = `Date of birth is below the minimum age of ${minAge}.`;
    }
  }
}

Card.RESPONSES = {
  cardDenied: {
    cardType: null,
    message:
      "Library cards are only available for residents of New York State or students and commuters working in New York City.",
  },
  cardDeniedMultipleAddresses: {
    cardType: null,
    message:
      "The entered address is ambiguous and will not result in a library card.",
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

module.exports = { Card };
