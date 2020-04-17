const addressValidator = (props) => {
  this.validate = (address) => {
    const fullAddressLength = (address.line_1 + address.line_2).length;
    if (fullAddressLength > 100) {
      address.errors.push("Address lines must be less than 100 characters combined");
    }
    return true;
  };
};

const address = (props) => {
  this.line_1 = props.line_1 || "";
  this.line_2 = props.line_2 || "";
  this.city = props.city || "";
  this.county = props.county || "";
  this.state = props.state || "";
  this.zip = props.zip || "";
  this.is_residential = str_to_bool(props.is_residential);
  // Only set in the API call
  this.has_been_validated = props.has_been_validated || false;
  
  const str_to_bool = (str) => {
    if (!str.length) {
      return undefined; // Is this right? prev was nil
    }
    // TODO: this was in there before but should it be copied over?
    const vals = ["true", "false"];
    const valsHash = { "true": true, "false": false };
    let found = false;
    vals.forEach(val => {
      if (str.includes(val)) {
        found = true;
      }
    });
    if (found) {
      return str;
    }

    return valsHash[str.toLowerCase()];
  };

  const in_state = (policy) =>
    (this.state.toLowerCase() in policy.service_area[this.state]);

  const in_city = (policy) => (
    (this.city.toLowerCase() in policy.service_area[this.city]) ||
    (this.county.toLowerCase() in policy.service_area[this.county])
  );

  const to_hash = () => ({
    line_1: this.line_1,
    line_2: this.line_2,
    city: this.city,
    county: this.county,
    state: this.state,
    zip: this.zip,
    is_residential: this.is_residential,
  });

  const to_string = () => {
    const street_info = `${this.line_1}${this.line_2.length > 0 ? `, ${this.line_2}`: this.line_2}`;
    const city_info = `${this.city}, ${this.state} ${this.zip}`;
    return `${this.street_info}\n${this.city_info}`;
  };

  const residential_work_address = (is_work_address) =>
    (is_work_address && this.is_residential);

  const non_residential_home_address = (is_work_address) =>
    (!is_work_address && !this.is_residential);

  const address_for_temporary_card = (is_work_address) => {
    if (this.residential_work_address(is_work_address)) {
      return true;
    } else if (this.non_residential_home_address(is_work_address)) {
      return true;
    }
    return false;
  };

  // Need to call validation API to validate the address
  const validation_response = (is_work_address = undefined) => {
    // const api = AddresValidationApi.new(is_work_address);
    // api.validate(this);
  };

  // Public: Creates new address with updated attributes from
  // the validation process.
  this.validated_version = (policy, is_work_address = undefined) => {
    // return the current address since it's already validated;
    if (this.has_been_validated) {
      return this;
    }
    // if the address is not valid, return;
    if (!this.is_valid) {
      return;
    }

    const validation = await validation_response(is_work_address);
    // if validation error return; integration error

    if (validation.address) {
      validation.address['has_been_validated'] = true;
      const updated_address = new address(validation.address);
      return updated_address;
    }

    return;
  };

  // Public: Returns an address updated with its API-formalized version
  // without incorporating about the card policy.
  // Returns a new address or null.
  this.normalized_version = () => {
    if (this.has_been_validated) {
      return this;
    }

    const validation = await validation_response(is_work_address);
    // if error do something integration error

    if (validation.type == AddressValidationApi.VALID_ADDRESS_TYPE) {
      validation.address['has_been_validated'] = true;
      const updated_address = new address(validation.address);
      return updated_address;
    }
  };
}

module.exports = {
  address,
};
