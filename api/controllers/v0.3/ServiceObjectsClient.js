/* eslint-disable */
const axios = require("axios");
const {
  SOAuthorizationError,
  SODomainSpecificError,
  SOIntegrationError,
} = require("../../helpers/errors");
const logger = require("../../helpers/Logger");

/**
 *
 */
const ServiceObjectsClient = (args) => {
  const soLicenseKey = args["soLicenseKey"];
  const baseUrl = "https://ws.serviceobjects.com/";
  const backupUrl = "https://wsbackup.serviceobjects.com/";
  const endpoint = "AV3/api.svc/GetBestMatchesJSON";

  if (!soLicenseKey) {
    throw new SOIntegrationError(
      "No credentials for Service Objects were passed."
    );
  }

  /**
   * generateParamString(args)
   * Generates a string to be used as the parameter string for a url. The
   * object needs to be
   *
   * @param {object} args
   */
  const generateParamString = (args) => {
    return Object.keys(args).reduce(
      (accumulator, key) =>
        accumulator + `&${key}=${encodeURIComponent(args[key])}`,
      ""
    );
  };

  /**
   * validateAddress(address)
   * @param {object} address
   */
  const validateAddress = async (address) => {
    // Convert the address to an object with the keys that Service Objects
    // understands, along with the license key.
    const paramObject = {
      Address: address.line1,
      Address2: address.line2,
      City: address.city,
      State: address.state,
      PostalCode: address.zip,
      LicenseKey: soLicenseKey,
    };
    const paramString = generateParamString(paramObject);
    const fullUrl = `${baseUrl}${endpoint}?${paramString}`;

    console.log(fullUrl);
    return await axios
      .get(fullUrl)
      .then((response) => {
        // Errors get returned in a 200 status... but if it's not 200 then
        // it's an unexpected error.
        if (response.status !== 200) {
          throw new SOIntegrationError(
            "Unexpected response status from Service Objects."
          );
        }

        const data = response.data["Addresses"];
        const error = response.data["Error"];
        console.log(data, error);

        if (data && data.length) {
          // Return the data and let the callee handle parsing the array
          // of addresses.
          return data;
          // The following two clauses will throw an error that will be caught
          // by the `catch`. This is because Service Objects returns errors with
          // a status of 200, so we have to throw the error ourselves.
        } else if (error && error["Type"]) {
          throwValidErrorType(error);
        } else {
          throw new SOIntegrationError("Unknown Error");
        }
      })
      .catch((error) => {
        // If we threw the error, just passing it on by returning it.
        if (
          error.type === new SOAuthorizationError().type ||
          error.type === new SODomainSpecificError().type ||
          error.type === new SOIntegrationError().type
        ) {
          logger.error(error.message);
          throw error;
        }
        // Ah, this is a new and different error.
        const unknownError = `Error using the Service Objects API: ${error}`;
        logger.error(unknownError);
        throw new SOIntegrationError(unknownError);
      });
  };

  /**
   * throwValidErrorType(error)
   * Parse the error object that is returned from Service Objects and throw
   * the specific type of error. The error object is in the form of:
   * { Type: "Authorization",
   *   TypeCode: "1",
   *   Desc: "Please provide a valid license key for this web service.",
   *   DescCode: "1" }
   * @param {object} error
   */
  const throwValidErrorType = (error) => {
    // to test
    // const err = { Type: "Authorization",
    //   TypeCode: "4",
    //   Desc: "Address not found",
    //   DescCode: "1",
    // };
    // throw new SODomainSpecificError(err["DescCode"], err["Desc"]);

    // Error codes are from the Domain Specific Errors in the Service
    // Objects Address Validation Documentation, which can be found at:
    // https://docs.serviceobjects.com/display/devguide/DOTS+Address+Validation+-+US+3
    // These codes were also in the previous Card Creator and keeping the same
    // values with the exception of "21" which is new.
    const userErrorDescCodes = ["1", "5", "7", "8", "14", "15", "21"];

    // Service Objects returns authorization errors with a `TypeCode` of "1".
    // If it was this type of error, throw the error and return it as a
    // response.
    if (error["TypeCode"] === "1") {
      throw new SOAuthorizationError(error["DescCode"], error["Desc"]);
      // Otherwise, check for `TypeCode` of "4" for domain specific errors.
    } else if (
      error["TypeCode"] === "4" &&
      userErrorDescCodes.includes(error["DescCode"])
    ) {
      throw new SODomainSpecificError(error["DescCode"], error["Desc"]);
    } else {
      throw new SOIntegrationError(error["Desc"]);
    }
  };

  return {
    validateAddress,
    // For testing,
    generateParamString,
    throwValidErrorType,
  };
};

module.exports = ServiceObjectsClient;
