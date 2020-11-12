const AddressValidationAPI = require("../../controllers/v0.3/AddressValidationAPI");
const isEmpty = require("underscore").isEmpty;
const { SONoLicenseKeyError } = require("../../helpers/errors");
const {
  strToBool,
  allowedCities,
  allowedCounties,
  allowedStates,
  allStates,
} = require("../../helpers/utils");

/**
 * Creates objects with proper address structure and validates
 * the data against the AddressValidationAPI.
 * @param {object} props Object with address data.
 * @param {string} soLicenseKey Service Objects license key.
 */
class Address {
  constructor(props = {}, soLicenseKey = "") {
    this.address = {
      line1: props.line1 || "",
      line2: props.line2 || "",
      city: props.city || "",
      county: props.county || "",
      state: props.state || "",
      zip: props.zip || "",
      isResidential: strToBool(props.isResidential),
    };
    this.errors = {};
    this.soLicenseKey = soLicenseKey;
    // Set in the API call or through the request body.
    this.hasBeenValidated = strToBool(props.hasBeenValidated);
  }

  /**
   * inUS
   * Checks if the address is in the United States.
   */
  inUS() {
    return allStates.includes(this.address.state.toLowerCase());
  }

  /**
   * inNYState
   * Checks to see if the address is in the New York state.
   */
  inNYState() {
    return allowedStates.includes(this.address.state.toLowerCase());
  }

  /**
   * inNYCity
   * Checks to see if the address is in New York City.
   */
  inNYCity() {
    return (
      allowedCities.includes(this.address.city.toLowerCase()) ||
      allowedCounties.includes(this.address.county.toLowerCase())
    );
  }

  /**
   * toString
   * Helper function to convert the address values into a
   * two-line addres string.
   */
  toString() {
    const { line1, line2, city, state, zip } = this.address;
    const streetInfo = `${line1}${line2.length > 0 ? `, ${line2}` : line2}`;
    const cityInfo = `${city}, ${state} ${zip}`;
    return `${streetInfo}\n${cityInfo}`;
  }

  /**
   * validate
   * Simple validation to make sure the address length is the proper length. If
   * it is, it then validates the address in Service Objects.
   */
  async validate() {
    if (!this.soLicenseKey) {
      throw new SONoLicenseKeyError("No SO license key passed in validate.");
    }

    const requiredFields = ["line1", "city", "state", "zip"];

    requiredFields.forEach((field) => {
      if (!this.address[field]) {
        this.errors[field] = `${field} cannot be empty`;
      }
    });

    const fullAddressLength = (this.address.line1 + this.address.line2).length;
    if (fullAddressLength > 100) {
      const message = `Address lines must be less than 100 characters combined. The address is currently at ${fullAddressLength} characters.`;
      this.errors["line1"] = message;
    }

    if (!isEmpty(this.errors)) {
      return {
        error: this.errors,
      };
    }

    // return the current address since it's already validated;
    if (this.hasBeenValidated) {
      return {
        type: "valid-address",
        ...this,
      };
    }

    // Get the `validate` function from the class that makes the API call
    // to Service Objects.
    const { validate } = AddressValidationAPI(this.soLicenseKey);
    const validatedAddress = await validate(this.address);

    if (validatedAddress.type === "valid-address") {
      this.hasBeenValidated = true;
    }

    return validatedAddress;
  }
}

module.exports = Address;
