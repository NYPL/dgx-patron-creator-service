/* eslint-disable */
import AddressValidationApi from "../../controllers/v0.3/AddressValidationAPI";

/**
 * Creates objects with proper address structure and validates
 * the data against the AddressValidationApi.
 */
class Address {
  constructor(address = {}, isValid = false) {
    this.address = {
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      county: address.county || "",
      state: address.state || "",
      zip: address.zip || "",
      isResidential: this.strToBool(address.isResidential),
      errors: {},
      // Only set in the API call
      hasBeenValidated: address.hasBeenValidated || false,
    };
    this.isValid = isValid;
  }

  validate() {
    const fullAddressLength = (this.address.line1 + this.address.line2).length;
    if (fullAddressLength > 100) {
      this.address.errors["line1"] =
        "Address lines must be less than 100 characters combined";
      return false;
    }
    this.isValid = true;
    return true;
  }

  strToBool(str) {
    if (!str) {
      return undefined; // Is this right? prev was nil
    }
    // TODO: this was in there before but should it be copied over?
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

  inState(policy) {
    return policy.serviceArea["state"].includes(
      this.address.state.toLowerCase()
    );
  }
  inCity(policy) {
    return (
      policy.serviceArea["city"].includes(this.address.city.toLowerCase()) ||
      policy.serviceArea["county"].includes(this.address.county.toLowerCase())
    );
  }

  toString() {
    const address = this.address;
    const streetInfo = `${address.line1}${
      address.line2.length > 0 ? `, ${address.line2}` : address.line2
    }`;
    const cityInfo = `${address.city}, ${address.state} ${address.zip}`;
    return `${streetInfo}\n${cityInfo}`;
  }

  residentialWorkAddress(isWorkAddress) {
    return isWorkAddress && this.address.isResidential;
  }

  nonResidentialHomeAddress(isWorkAddress) {
    return !isWorkAddress && !this.address.isResidential;
  }

  addressForTemporaryCard(isWorkAddress) {
    if (this.residentialWorkAddress(isWorkAddress)) {
      return true;
    } else if (this.nonResidentialHomeAddress(isWorkAddress)) {
      return true;
    }
    return false;
  }

  // TODO: Need to call validation API to validate the address
  // which depends on Service Objects
  validationresponse(isWorkAddress = undefined) {
    // const api = AddressValidationApi.new(isWorkAddress);
    // api.validate(this);
    // this.isValid = true;
    return this;
    // if false return null; and isValid = false;
  }

  // Public: Creates new address with updated attributes from
  // the validation process.
  validatedVersion(isWorkAddress = undefined) {
    // return the current address since it's already validated;
    if (this.address.hasBeenValidated) {
      return this;
    }
    // if the address is not already valid, return;
    if (!this.isValid) {
      return;
    }

    // Check to see if address is valid
    const validation = this.validationresponse(isWorkAddress);
    // TODO if validation error return; integration error

    if (validation && validation.address) {
      validation.address["hasBeenValidated"] = true;
      const isValid = true;
      const updatedAddress = new Address(validation.address, isValid);
      return updatedAddress;
    }

    return;
  }

  // Public: Returns an address updated with its API-formalized version
  // without incorporating about the card policy.
  // Returns a new address or null.
  normalizedVersion() {
    if (this.address.hasBeenValidated) {
      return this;
    }

    const validation = this.validationresponse(isWorkAddress);
    // TODO: if error do something integration error

    if (validation.type === AddressValidationApi.VALID_ADDRESS_TYPE) {
      validation.address["hasBeenValidated"] = true;
      const updatedAddress = new Address(validation.address);
      return updatedAddress;
    }
  }
}

export default Address;
