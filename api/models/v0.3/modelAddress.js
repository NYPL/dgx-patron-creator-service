/* eslint-disable */
import AddressValidationApi from "../../controllers/v0.3/AddressValidationAPI";

/**
 * Creates objects with proper address structure and validates
 * the data against the AddressValidationApi.
 */
class Address {
  constructor(address = {}, is_valid = false) {
    this.address = {
      line_1: address.line_1 || "",
      line_2: address.line_2 || "",
      city: address.city || "",
      county: address.county || "",
      state: address.state || "",
      zip: address.zip || "",
      is_residential: this.str_to_bool(address.is_residential),
      errors: {},
      // Only set in the API call
      has_been_validated: address.has_been_validated || false,
    };
    this.is_valid = is_valid;
  }

  validate() {
    const fullAddressLength = (this.address.line_1 + this.address.line_2)
      .length;
    if (fullAddressLength > 100) {
      this.address.errors["line_1"] =
        "Address lines must be less than 100 characters combined";
      return false;
    }
    this.is_valid = true;
    return true;
  }

  str_to_bool(str) {
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

  in_state(policy) {
    return policy.serviceArea["state"].includes(
      this.address.state.toLowerCase()
    );
  }
  in_city(policy) {
    return (
      policy.serviceArea["city"].includes(this.address.city.toLowerCase()) ||
      policy.serviceArea["county"].includes(this.address.county.toLowerCase())
    );
  }

  toString() {
    const address = this.address;
    const street_info = `${address.line_1}${
      address.line_2.length > 0 ? `, ${address.line_2}` : address.line_2
    }`;
    const city_info = `${address.city}, ${address.state} ${address.zip}`;
    return `${street_info}\n${city_info}`;
  }

  residential_work_address(is_work_address) {
    return is_work_address && this.address.is_residential;
  }

  non_residential_home_address(is_work_address) {
    return !is_work_address && !this.address.is_residential;
  }

  address_for_temporary_card(is_work_address) {
    if (this.residential_work_address(is_work_address)) {
      return true;
    } else if (this.non_residential_home_address(is_work_address)) {
      return true;
    }
    return false;
  }

  // TODO: Need to call validation API to validate the address
  validation_response(is_work_address = undefined) {
    // const api = AddressValidationApi.new(is_work_address);
    // api.validate(this);
    // this.is_valid = true;
    return this;
    // if false return null; and is_valid = false;
  }

  // Public: Creates new address with updated attributes from
  // the validation process.
  validated_version(is_work_address = undefined) {
    // return the current address since it's already validated;
    if (this.address.has_been_validated) {
      return this;
    }
    // if the address is not already valid, return;
    if (!this.is_valid) {
      return;
    }

    // Check to see if address is valid
    const validation = this.validation_response(is_work_address);
    // TODO if validation error return; integration error

    if (validation && validation.address) {
      validation.address["has_been_validated"] = true;
      const is_valid = true;
      const updated_address = new Address(validation.address, is_valid);
      return updated_address;
    }

    return;
  }

  // Public: Returns an address updated with its API-formalized version
  // without incorporating about the card policy.
  // Returns a new address or null.
  normalized_version() {
    if (this.address.has_been_validated) {
      return this;
    }

    const validation = this.validation_response(is_work_address);
    // TODO: if error do something integration error

    if (validation.type === AddressValidationApi.VALID_ADDRESS_TYPE) {
      validation.address["has_been_validated"] = true;
      const updated_address = new Address(validation.address);
      return updated_address;
    }
  }
}

export default Address;
