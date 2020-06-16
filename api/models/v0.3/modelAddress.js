/* eslint-disable */
const AddressValidationAPI = require("../../controllers/v0.3/AddressValidationAPI");

/**
 * Creates objects with proper address structure and validates
 * the data against the AddressValidationAPI.
 */
class Address {
  constructor(args = {}) {
    this.address = {
      line1: args.line1 || "",
      line2: args.line2 || "",
      city: args.city || "",
      county: args.county || "",
      state: args.state || "",
      zip: args.zip || "",
      isResidential: this.strToBool(args.isResidential),
    };
    this.errors = {};
    // Only set in the API call
    this.hasBeenValidated = args.hasBeenValidated || false;
  }

  /**
   * validate()
   * Simple validation to make sure the address length is the proper length.
   */
  validate() {
    const fullAddressLength = (this.address.line1 + this.address.line2).length;
    if (fullAddressLength > 100) {
      this.errors["line1"] =
        "Address lines must be less than 100 characters combined";
      return false;
    }
    return true;
  }

  /**
   * strToBool(str)
   * Helper function to convert a string with boolean values into actual
   * boolean values - values that may come from separate APIs.
   *
   * @param {string} str
   */
  strToBool(str) {
    if (!str) {
      return false;
    }

    // If the value is already a boolean, just return it.
    if (typeof str === "boolean") {
      return str;
    }

    const vals = ["true", "false"];
    const valsHash = { true: true, false: false };
    let found = "";
    // First check if the boolean string is in the passed in string.
    vals.forEach((val) => {
      if (str.toLowerCase().includes(val)) {
        found = val;
      }
    });
    // Otherwise, just use the passed in string.
    return valsHash[found || str.toLowerCase()];
  }

  /**
   * inState(policyParam)
   * Checks to see if the address is in the New York state.
   *
   * @param {Policy object} policyParam
   */
  inState(policyParam) {
    const policy = policyParam.policy;
    return !!(
      policy.serviceArea &&
      policy.serviceArea["state"].includes(this.address.state.toLowerCase())
    );
  }

  /**
   * inCity(policyParam)
   * Checks to see if the address is in New York City.
   *
   * @param {Policy object} policyParam
   */
  inCity(policyParam) {
    const policy = policyParam.policy;
    if (!policy.serviceArea) {
      return false;
    }
    return (
      (policy.serviceArea["city"] &&
        policy.serviceArea["city"].includes(this.address.city.toLowerCase())) ||
      (policy.serviceArea["county"] &&
        policy.serviceArea["county"].includes(
          this.address.county.toLowerCase()
        ))
    );
  }

  /**
   * toString()
   * Helper function to convert the address values into a
   * two-line addres string.
   */
  toString() {
    const address = this.address;
    const streetInfo = `${address.line1}${
      address.line2.length > 0 ? `, ${address.line2}` : address.line2
    }`;
    const cityInfo = `${address.city}, ${address.state} ${address.zip}`;
    return `${streetInfo}\n${cityInfo}`;
  }

  /**
   * residentialWorkAddress(isWorkAddress)
   * Returns true if the current address is a residential work address.
   *
   * @param {boolean} isWorkAddress
   */
  residentialWorkAddress(isWorkAddress) {
    return isWorkAddress && this.address.isResidential;
  }

  /**
   * nonResidentialWorkAddress(isWorkAddress)
   * Returns true if the current address is a non-residential home address.
   *
   * @param {boolean} isWorkAddress
   */
  nonResidentialHomeAddress(isWorkAddress) {
    return !isWorkAddress && !this.address.isResidential;
  }

  /**
   * addressForTemporaryCard(isWorkAddress)
   * Returns true if the current address is a residential work address or
   * a non-residential home address for a temporary card.
   *
   * @param {boolean} isWorkAddress
   */
  addressForTemporaryCard(isWorkAddress) {
    if (this.residentialWorkAddress(isWorkAddress)) {
      return true;
    } else if (this.nonResidentialHomeAddress(isWorkAddress)) {
      return true;
    }
    return false;
  }

  /**
   * validationResponse(isWorkAddress)
   * TODO: Need to call validation API to validate the address
   * which depends on Service Objects.
   *
   * @param {boolean} isWorkAddress
   */
  validationResponse(isWorkAddress = undefined) {
    // const { responses, validate } = AddressValidationAPI({ ilsClient });
    // let validAddress = await validate(this.address);
    // if false return null;
    return true;
  }

  /**
   * validatedVersion(isWorkAddress)
   * Creates a validated address with updated attributes from
   * the validation process.
   *
   * @param {boolean} isWorkAddress
   */
  validatedVersion(isWorkAddress = undefined) {
    // return the current address since it's already validated;
    if (this.hasBeenValidated) {
      return this;
    }

    // Check to see if address is valid
    const validation = this.validationResponse(isWorkAddress);
    // TODO if validation error return; integration error

    if (validation) {
      this.hasBeenValidated = true;

      return this;
    }

    // The address is not valid so return undefined.
    return;
  }
}

module.exports = Address;
