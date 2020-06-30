/* eslint-disable */
const AddressValidationAPI = require("../../controllers/v0.3/AddressValidationAPI");
const { SONoLicenseKeyError } = require("../../helpers/errors");

/**
 * Creates objects with proper address structure and validates
 * the data against the AddressValidationAPI.
 */
class Address {
  constructor(args = {}, soLicenseKey = "") {
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
    this.soLicenseKey = soLicenseKey;
    // Only set in the API call
    this.hasBeenValidated = args.hasBeenValidated || false;
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
    const { line1, line2, city, state, zip } = this.address;
    const streetInfo = `${line1}${line2.length > 0 ? `, ${line2}` : line2}`;
    const cityInfo = `${city}, ${state} ${zip}`;
    return `${streetInfo}\n${cityInfo}`;
  }

  /**
   * validateInAPI()
   */
  async validateInAPI() {
    if (!this.soLicenseKey) {
      throw new SONoLicenseKeyError("No license key passed in validateInAPI.");
    }

    const { validate } = AddressValidationAPI({
      soLicenseKey: this.soLicenseKey,
    });

    return await validate(this.address);
  }

  /**
   * validate(isWorkAddress)
   * Simple validation to make sure the address length is the proper length. If
   * it is, it then validates the address in Service Objects.
   */
  async validate() {
    const fullAddressLength = (this.address.line1 + this.address.line2).length;
    if (fullAddressLength > 100) {
      const message = `Address lines must be less than 100 characters combined. The address is currently at ${fullAddressLength} characters.`;
      this.errors["line1"] = message;
      return {
        error: {
          message,
        },
      };
    }
    // return the current address since it's already validated;
    if (this.hasBeenValidated) {
      return {
        type: "valid-address",
        ...this,
      };
    }

    const validation = await this.validateInAPI();
    if (validation.type === "valid-address") {
      this.hasBeenValidated = true;
    }

    return validation;
  }
}

module.exports = Address;
