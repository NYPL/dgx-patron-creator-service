/* eslint-disable */
const ServiceObjectsClient = require("./ServiceObjectsClient");
const {
  SOAuthorizationError,
  SODomainSpecificError,
  SOIntegrationError,
} = require("../../helpers/errors");
const Address = require("../../models/v0.3/modelAddress");
const { Card } = require("../../models/v0.3/modelCard");
const Policy = require("../../models/v0.3/modelPolicy");

/**
 * A class that uses Service Objects to validate addresses.
 */
const AddressValidationAPI = (args) => {
  const soLicenseKey = args["soLicenseKey"];
  if (!soLicenseKey) {
    throw new SOIntegrationError(
      "No credentials for Service Objects were passed in AddressValidationAPI."
    );
  }

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

  const validate = async (address, policyType = "simplye") => {
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
      }
    }
    return response;
  };

  const createAddressFromResponse = (address) => {
    return new Address({
      line1: address["Address1"],
      line2: address["Address2"],
      city: address["City"],
      county: address["CountyName"],
      state: address["State"],
      zip: address["Zip"],
      isResidential: address["IsResidential"],
      // This is from Service Objects, so it's been validated.
      hasBeenValidated: true,
    });
  };

  // Validate each alternate address so the client has all the
  // information it needs without resubmitting the address.
  const alternateAddressesResponse = (addresses) => {
    const alternates = addresses.map((address) => {
      let response = parseResponse([address]);

      // Append alternate address to denial responses so it can be
      // displayed to patrons for selection.
      if (response === RESPONSES["alternate_addresses"]) {
        response = {
          ...response,
          address: address.address,
        };
      }

      return response;
    });

    return {
      ...RESPONSES["alternate_addresses"],
      addresses: alternates,
    };
  };

  const parseResponse = (
    addressesParam,
    originalAddress,
    policyType = "simplye"
  ) => {
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
