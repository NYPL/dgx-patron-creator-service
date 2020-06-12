/* eslint-disable */
const ServiceObjectsClient = require("./ServiceObjectsClient");
const {
  SOAuthorizationError,
  SODomainSpecificError,
  SONoLicenseKeyError,
} = require("../../helpers/errors");
const Address = require("../../models/v0.3/modelAddress");
const { Card } = require("../../models/v0.3/modelCard");
const Policy = require("../../models/v0.3/modelPolicy");

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
      message: "Unrecognized address.",
    },
    alternate_addresses: {
      type: ALTERNATE_ADDRESSES_TYPE,
      message: "Alternate addresses have been identified.",
    },
    valid_address: {
      type: VALID_ADDRESS_TYPE,
      message: "Valid address.",
    },
  };

  /**
   * validate(address, policyType)
   * Calls the Service Objects client to validate an address and returns a
   * response or throws an error.
   * @param {Object} address
   * @param {string} policyType
   */
  const validate = async (address, policyType = "simplye") => {
    if (!soLicenseKey) {
      throw new SONoLicenseKeyError(
        "No credentials for Service Objects were passed in AddressValidationAPI."
      );
    }

    let response;
    try {
      const addresses = await validateAddress(address);
      response = parseResponse(addresses, address, policyType);
    } catch (error) {
      // If there's an authorization error, throw the error. Otherwise, return
      // an "unrecognized address type" response with the error message.
      if (error.name === new SOAuthorizationError().name) {
        throw error;
      } else if (error.name === new SODomainSpecificError().name) {
        response = {
          ...RESPONSES["unrecognized_address"],
          message: `${RESPONSES["unrecognized_address"].message} ${error.message}`,
          address,
        };
      } else {
        throw error;
      }
    }
    return response;
  };

  /**
   * createAddressFromResponse(address)
   * Returns a new Address instance based on the validated address data
   * returned from Service Objects.
   * @param {object} address
   */
  const createAddressFromResponse = (address) => {
    if (!address) {
      return;
    }

    return new Address({
      line1: address["Address1"],
      line2: address["Address2"],
      city: address["City"],
      county: address["CountyName"],
      state: address["State"],
      // Yes, SO takes a "PostalCode" key but returns a "Zip" key.
      zip: address["Zip"],
      isResidential: address["IsResidential"],
      // This is from Service Objects, so it's been validated.
      hasBeenValidated: true,
    });
  };

  /**
   * alternateAddressesResponse(addresses)
   * Combines all alternate Address instances into a response.
   * @param {Array} addresses - Array of Address objects
   */
  const alternateAddressesResponse = (addresses = []) => {
    const alternates = addresses.map((address) => address.address);

    return {
      ...RESPONSES["alternate_addresses"],
      addresses: alternates,
    };
  };

  /**
   * parseResponse(addressParam, originalAddress, policyType)
   * If there are alternate addresses, then a response with those addresses
   * is returned. Otherwise, there's only one address and it's used to find
   * the policy needed for the correct account type. A response for that
   * address and policy is then returned.
   * @param {Array} addressesParam
   * @param {Object} originalAddress
   * @param {string} policyType
   */
  const parseResponse = (
    addressesParam,
    originalAddress,
    policyType = "simplye"
  ) => {
    // If no addresses are passed, return an unrecognized address response.
    // This step is covered before in the API call and shouldn't happen but
    // handled here just in case.
    if (!addressesParam || !addressesParam.length) {
      return {
        ...RESPONSES["unrecognized_address"],
        address: originalAddress,
      };
    }

    const addresses = addressesParam.map(createAddressFromResponse);
    // If more than one address is returned, the original address was
    // ambiguous and Service Objects has identified multiple potential
    // alternate addresses.
    if (addresses.length > 1) {
      return alternateAddressesResponse(addresses);
    }

    const validatedAddress = addresses[0];
    let response = {
      ...RESPONSES["valid_address"],
      address: validatedAddress.address,
      originalAddress,
    };

    // Initialize a patron/card object to determine card_type by policy.
    const card = new Card({
      address: validatedAddress.address,
      policy: Policy({ policyType }),
    });
    let policyResponse = card.checkCardTypePolicy(validatedAddress, false);

    // Before it checked if it got an unauthorized error, but it can't get both
    // unauthorized and a validated address...
    if (validatedAddress.inState(card.policy)) {
      policyResponse = Card.RESPONSES["temporaryCard"];
    }

    response = {
      ...response,
      ...policyResponse,
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
