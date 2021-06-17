const UsernameValidationAPI = require("../../controllers/v0.3/UsernameValidationAPI");
const Address = require("./modelAddress");
const Barcode = require("./modelBarcode");
const { strToBool, normalizedBirthdate } = require("../../helpers/utils");
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
 * @param {object} props - Object consisting of the name string,
 *  address Address object, username string, password string, email string,
 *  birthdate string, workAddress Address object, ecommunicationsPref string,
 *  and policy Policy object.
 */
class Card {
  constructor(props) {
    this.name = props.name;
    this.address = props.address;
    this.workAddress = props.workAddress;
    this.location = props.location || "";
    this.username = props.username;
    this.usernameHasBeenValidated = strToBool(props.usernameHasBeenValidated);
    this.password = props.pin || props.password;
    this.email = props.email;
    this.birthdate = normalizedBirthdate(props.birthdate);
    this.ageGate = strToBool(props.ageGate);
    this.ecommunicationsPref = !!props.ecommunicationsPref;
    this.policy = props.policy;
    this.varFields = props.varFields || {};
    // SimplyE will always set the home library to the `eb` code. Eventually,
    // the web app will pass a `homeLibraryCode` parameter with a patron's
    // home library. For now, `eb` is hardcoded.
    this.homeLibraryCode = props.homeLibraryCode || "eb";
    this.acceptTerms = strToBool(props.acceptTerms);
    this.ilsClient = props.ilsClient;

    this.errors = {};

    // Attributes set during processing
    this.barcode = undefined;
    this.ptype = undefined;
    this.patronId = undefined;
    this.expirationDate = undefined;
    this.agency = undefined;
    this.valid = false;
  }

  /**
   * validate
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
    // name, address, email, username, password, birthdate or ageGate.
    // First check and return an error for any empty values.
    if (
      !this.name ||
      !this.address ||
      !this.username ||
      !this.password ||
      !this.email
    ) {
      throw new InvalidRequest(
        "'name', 'address', 'username', 'password', and 'email' are all required fields."
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

    // The password must be at least 8 characters, include a mixture of both
    // uppercase and lowercase letters, include a mixture of letters and
    // numbers, and have at least one special character.
    // Throw an error if it's incorrect.
    if (
      // eslint-disable-next-line no-useless-escape
      !/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.+[~`!?@#$%^&*()_=+\[\]{};:.,"'<>|\\/-]).{8,32}/g.test(
        this.password
      )
    ) {
      this.errors["password"] =
        "Password should be 8-32 alphanumeric characters and should include " +
        "a mixture of both uppercase and lowercase letters, include a " +
        "mixture of letters and numbers, and have at least one special " +
        "character. Please revise your password.";
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

    // No errors! Set the ptype, the expiration date, and the patron agency.
    if (Object.keys(this.errors).length === 0) {
      this.valid = true;
      // For valid data, set the ptype.
      this.setPtype();
      // Now set the expiration date based on the ptype.
      this.setExpirationDate();
      // Set the patron agency for this card.
      this.setAgency();
    }

    return { valid: this.valid, errors: this.errors };
  }

  /**
   * checkValidUsername
   * Check if the username is available. If it available (true) or
   * not available (false), return that value. Otherwise, the username
   * hasn't been checked so check its availability against the
   * UsernameValidation API. This works as an internal cache so it won't
   * call the ILS API if it already received a value.
   */
  async checkValidUsername() {
    const { responses, validate } = UsernameValidationAPI(this.ilsClient);
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
   * requiredByPolicy
   * Checks if the field is required in the current policy.
   * @param {string} field
   */
  requiredByPolicy(field) {
    return this.policy.isRequiredField(field);
  }

  /**
   * livesInNYCity
   * Checks if the card has a home address in NYC.
   */
  livesInNYCity() {
    return !!this.address.inNYCity();
  }

  /**
   * worksInNYCity
   * Checks if the card has a work address in NYC.
   */
  worksInNYCity() {
    return !!(this.workAddress && this.workAddress.inNYCity());
  }

  /**
   * livesInNYState
   * Checks if the card has a home address in NYS. Note, we don't need to check
   * that the card has a work address in NYS.
   */
  livesInNYState() {
    return this.address.inNYState();
  }

  /**
   * livesInUS
   * Checks if the card has a home address in the US.
   */
  livesInUS() {
    return !!(this.address && this.address.inUS());
  }

  /**
   * worksInUS
   * Checks if the card has an work address in the US.
   */
  worksInUS() {
    return !!(this.workAddress && this.workAddress.inUS());
  }

  /**
   * addressHasBeenValidated
   * Checks if the card's home address has been validated by Service Objects.
   */
  addressHasBeenValidated() {
    return this.address.hasBeenValidated;
  }

  /**
   * addressIsResidential
   * Checks if the card's home address is residential.
   */
  addressIsResidential() {
    return this.address.address.isResidential;
  }

  /**
   * validForIls
   * Checks if the current card is valid and has a ptype.
   */
  validForIls() {
    return !!(this.valid && this.ptype);
  }

  /**
   * setBarcode
   * Sets this card's barcode to the next available barcode in the ILS.
   */
  async setBarcode() {
    let barcodeStartSequence;
    if ([7, 8, 9].includes(this.ptype)) {
      // WEB_DIGITAL_TEMPORARY, WEB_DIGITAL_NON_METRO, and WEB_DIGITAL_METRO
      // ptypes get barcodes with this starting sequence.
      barcodeStartSequence = "25555";
    } else if (this.ptype === 4) {
      // SIMPLYE_JUVENILE ptype gets barcodes with this starting sequence.
      barcodeStartSequence = "288888";
    } else {
      throw new DatabaseError("No barcode can be generated for this ptype.");
    }

    const barcode = new Barcode(this.ilsClient);
    // Let's try to generate a barcode.
    this.barcode = await barcode.getNextAvailableBarcode(barcodeStartSequence);

    // If there was a problem generating a barcode, throw an error so no
    // attempt to create the patron in the ILS is made.
    if (!this.barcode) {
      throw new DatabaseError(
        "Could not generate a new barcode. Please try again."
      );
    }
  }

  /**
   * freeBarcode
   * Sets the current barcode's `used` value to false, possibly because
   * creating a patron in the ILS failed and the barcode is now free to use.
   */
  async freeBarcode() {
    const barcode = new Barcode(this.ilsClient);
    await barcode.freeBarcode(this.barcode);

    this.barcode = "";
  }

  /**
   * setPtype
   * Sets the ptype for the current card based on the current policy.
   */
  setPtype() {
    this.ptype = this.policy.determinePtype(this);
  }

  /**
   * setAgency
   * Sets the agency for the current card based on the current policy.
   */
  setAgency() {
    this.agency = this.policy.policy.agency;
  }

  /**
   * getExpirationTime
   * Get the number of days that the current card is set to expired
   * based on the current policy.
   */
  getExpirationTime() {
    return this.policy.getExpirationPoliciesForPtype(this.ptype);
  }

  /**
   * setExpirationDate
   * Set's the expiration date for the account based on the current policy and
   * whether the card is temporary or not. The card validation must be
   * executed before this function to check whether the card is temporary or
   * it will always be set to temporary.
   */
  setExpirationDate() {
    const now = new Date();
    const policyDays = this.getExpirationTime();
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
   * setPatronId
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

    // To prevent calling this function before validating the data and
    // setting a ptype.
    if (!this.validForIls()) {
      throw new NotILSValid("The card has not been validated or has no ptype.");
    }

    // The barcode is required for all ptypes that we can assign. If no barcode
    // is created, an error will be thrown and the patron won't be created
    // in the ILS.
    await this.setBarcode();

    // Great, we have a barcode, now attempt to create the patron in the ILS.
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
   * details
   * Returns a simple object with all the card's current values.
   */
  details() {
    let details = {
      barcode: this.barcode,
      username: this.username,
      password: this.password,
      ptype: this.ptype,
    };

    if (this.patronId) {
      details = {
        ...details,
        patronId: this.patronId,
      };
    }

    return details;
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
  }

  /**
   * validateAddress
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

    if (addressResponse.address) {
      // The validated address from SO is not an Address object, so create it:
      const address = new Address(
        { ...addressResponse.address },
        this[addressType].soLicenseKey
      );
      // Reset the card's address type input to the validated version.
      this[addressType] = address;
    } else if (addressResponse.addresses) {
      this.errors[addressType] = {
        ...Card.RESPONSES.cardDeniedMultipleAddresses,
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
    // `this.birthdate` should already be a Date object. The field is checked
    // before this function is called so this should never be undefined.
    const birthdate = this.birthdate;
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
  cardDeniedMultipleAddresses: {
    cardType: null,
    detail:
      "The entered address is ambiguous and will not result in a library card.",
  },
};

module.exports = Card;
