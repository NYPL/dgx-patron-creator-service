/* eslint-disable */
const ServiceObjectsClient = require("./ServiceObjectsClient");
const { SONoLicenseKeyError } = require("../../helpers/errors");
const { strToBool } = require("../../helpers/utils");

/**
 * A class that uses Service Objects to validate addresses.
 */
const AddressValidationAPI = (args = {}) => {
  const soLicenseKey = args["soLicenseKey"];

  const ALTERNATE_ADDRESSES_TYPE = "alternate-addresses";
  const UNRECOGNIZED_ADDRESS_TYPE = "unrecognized-address";
  const VALID_ADDRESS_TYPE = "valid-address";
  const { validateAddress } = ServiceObjectsClient({ soLicenseKey });

  const RESPONSES = {
    unrecognized_address: {
      type: UNRECOGNIZED_ADDRESS_TYPE,
      title: "Unrecognized address.",
    },
    alternate_addresses: {
      type: ALTERNATE_ADDRESSES_TYPE,
      title: "Alternate addresses have been identified.",
    },
    valid_address: {
      type: VALID_ADDRESS_TYPE,
      title: "Valid address.",
    },
  };

  /**
   * validate(address)
   * Calls the Service Objects client to validate an address and returns a
   * response with the type of address it is, even if SO is not callable.
   * @param {Object} address
   */
  const validate = async (address) => {
    if (!soLicenseKey) {
      throw new SONoLicenseKeyError(
        "No credentials for Service Objects were passed in AddressValidationAPI."
      );
    }

    let response;
    let addresses = [];
    let errors = {};

    try {
      addresses = await validateAddress(address);
    } catch (error) {
      // Destructuring the error object since we want the contents and not
      // the error object itself.
      errors = { ...error };
    }

    response = parseResponse(addresses, errors, address);

    return response;
  };

  /**
   * createAddressFromResponse(address)
   * Returns an address object based on the validated address data returned
   * from Service Objects. This is to make it easier to create Address
   * instances by updating the key values.
   * @param {object} address
   */
  const createAddressFromResponse = (address) => {
    if (!address) {
      return;
    }
    return {
      line1: address["Address1"],
      line2: address["Address2"],
      city: address["City"],
      county: address["CountyName"],
      state: address["State"],
      // Yes, SO takes a "PostalCode" key but returns a "Zip" key.
      zip: address["Zip"],
      isResidential: strToBool(address["IsResidential"]),
      // This is from Service Objects, so it's been validated.
      hasBeenValidated: true,
    };
  };

  /**
   * alternateAddressesResponse(addresses)
   * Combines all alternate addresses into a response.
   * @param {Array} addresses - Array of address objects
   */
  const alternateAddressesResponse = (addresses = []) => {
    return {
      ...RESPONSES["alternate_addresses"],
      addresses,
    };
  };

  /**
   * parseResponse(addressParam, originalAddress)
   * If there are alternate addresses, then a response with those addresses
   * is returned. Otherwise, there's only one address and it's used to find
   * the policy needed for the correct account type. A response for that
   * address and policy is then returned.
   * @param {Array} addressesParam
   * @param {Object} errorParam
   * @param {Object} originalAddress
   */
  const parseResponse = (addressesParam, errorParam = {}, originalAddress) => {
    let errorResponse = {};
    let response = {};

    // There was an error calling Service Objects. Instead of throwing the
    // error, we want to return it as part of the larger error response to the
    // client. This is because we still want to proceed doing basic validation
    // of the address and always return temporary if there are errors.
    if ((errorParam && errorParam.message) || !addressesParam) {
      errorResponse = {
        status: 400,
        ...RESPONSES["unrecognized_address"],
        originalAddress,
        error: errorParam,
      };
    }

    // SO succeeded and returned one or more validated addresses.
    if (addressesParam && addressesParam.length) {
      const addresses = addressesParam.map(createAddressFromResponse);
      // If more than one address is returned, the original address was
      // ambiguous and Service Objects has identified multiple potential
      // alternate addresses.
      if (addresses.length > 1) {
        return {
          status: 400,
          ...alternateAddressesResponse(addresses),
          originalAddress,
        };
      }

      // Otherwise, there's only one validated address.
      const validatedAddress = addresses[0];

      // The address has been validated by SO.
      response = {
        ...RESPONSES["valid_address"],
        address: validatedAddress,
        originalAddress,
      };
    }

    // Merge all the responses.
    response = {
      ...response,
      ...errorResponse,
    };

    return response;
  };

  return {
    validate,
    // For testing:
    responses: RESPONSES,
    createAddressFromResponse,
    alternateAddressesResponse,
    parseResponse,
  };
};

module.exports = AddressValidationAPI;
