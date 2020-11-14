const axios = require("axios");
const {
  SOAuthorizationError,
  SODomainSpecificError,
  SOIntegrationError,
  SONoLicenseKeyError,
} = require("../../helpers/errors");
const logger = require("../../helpers/Logger");

/**
 * Helper class that calls Service Objects to validate addresses.
 */
const ServiceObjectsClient = (soLicenseKey = "") => {
  const baseUrl = "https://ws.serviceobjects.com/";
  // eslint-disable-next-line no-unused-vars
  const backupUrl = "https://wsbackup.serviceobjects.com/";
  const endpoint = "AV3/api.svc/GetBestMatchesJSON";

  /**
   * generateParamString
   * Generates a string to be used as the parameter string for a url. The
   * object's key and value pair will be turned into a url parameter:
   * { key: "value" } => "&key=value"
   * @param {object} args
   */
  const generateParamString = (args = {}) => {
    return Object.keys(args).reduce(
      (accumulator, key) =>
        accumulator + `&${key}=${encodeURIComponent(args[key])}`,
      ""
    );
  };

  /**
   * createAddressObjforSO
   * Convert the address to an object with the keys that Service Objects
   * understands, along with the license key.
   * @param {object} address
   */
  const createAddressObjforSO = (address = {}) => ({
    Address: address.line1 || "",
    Address2: address.line2 || "",
    City: address.city || "",
    State: address.state || "",
    PostalCode: address.zip || "",
    LicenseKey: soLicenseKey,
  });

  /**
   * validateAddress
   * This generates the full URL to call Service Objects. It either receives
   * a validated address response or an error and those are handled in the
   * `then` clause. Otherwise, errors are thrown and handled.
   * @param {object} address
   */
  const validateAddress = async (address = {}) => {
    if (!soLicenseKey) {
      throw new SONoLicenseKeyError(
        "No credentials for Service Objects were passed."
      );
    }

    const addressforSO = createAddressObjforSO(address);
    const paramString = generateParamString(addressforSO);
    const fullUrl = `${baseUrl}${endpoint}?${paramString}`;

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
        // If we threw the error, catch it to log it but then pass it
        // on by throwing it so the callee can catch or render the error.
        const badAddress = `${address.line1} ${address.line2}, ${address.city}, ${address.state} ${address.zip}`;
        const errorMessage = `Error using the Service Objects API: ${error.message}`;

        logger.error(`Error using the Service Objects API: ${error.message}`);
        logger.error(`Invalid address - ${badAddress}`);

        if (
          error.type === new SOAuthorizationError().type ||
          error.type === new SODomainSpecificError().type ||
          error.type === new SOIntegrationError().type
        ) {
          throw error;
        }
        // Ah, this is a new and different error.
        throw new SOIntegrationError(errorMessage);
      });
  };

  /**
   * throwValidErrorType
   * Parse the error object that is returned from Service Objects and throw
   * the specific type of error. Specific errors that are being caught are
   * "Domain Specific Errors" and "Authorization" errors. The error object
   * is in the form of:
   *   { Type: "Authorization",
   *     TypeCode: "1",
   *     Desc: "Please provide a valid license key for this web service.",
   *     DescCode: "1" }
   * @param {object} error
   */
  const throwValidErrorType = (error) => {
    // This shouldn't happen since this function will only be called if there
    // is an error object from Service Objects, but just normal error handling.
    if (!error) {
      throw new SOIntegrationError(
        "No Error object from Service Objects. Check ServiceObjectsClient."
      );
    }

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
      throw new SOAuthorizationError(error["Desc"], error["DescCode"]);
      // Otherwise, check for `TypeCode` of "4" for domain specific errors.
    } else if (
      error["TypeCode"] === "4" &&
      userErrorDescCodes.includes(error["DescCode"])
    ) {
      throw new SODomainSpecificError(error["Desc"], error["DescCode"]);
    } else {
      // Otherwise, there was some integration error with Service Objects.
      throw new SOIntegrationError(error["Desc"]);
    }
  };

  return {
    validateAddress,
    // For testing,
    generateParamString,
    throwValidErrorType,
    createAddressObjforSO,
  };
};

module.exports = ServiceObjectsClient;
