/* eslint-disable */
const { NoILSClient, ILSIntegrationError } = require("../../helpers/errors");

/**
 * A class that validates usernames against the ILS.
 */
const UsernameValidationAPI = (args) => {
  const ilsClient = args["ilsClient"];
  // class IntegrationError < StandardError; end
  const USERNAME_PATTERN = /^[a-zA-Z0-9]{5,25}$/;
  const AVAILABLE_USERNAME_TYPE = "available-username";
  const UNAVAILABLE_USERNAME_TYPE = "unavailable-username";
  const INVALID_USERNAME_TYPE = "invalid-username";

  const STANDARD_CARD_TYPE = "standard";
  const TEMPORARY_CARD_TYPE = "temporary";

  const RESPONSES = {
    invalid: {
      type: INVALID_USERNAME_TYPE,
      card_type: null,
      message: "Username must be 5-25 alphanumeric characters (A-z0-9).",
    },
    unavailable: {
      type: UNAVAILABLE_USERNAME_TYPE,
      card_type: null,
      message: "This username is unavailable. Please try another.",
    },
    available: {
      type: AVAILABLE_USERNAME_TYPE,
      card_type: STANDARD_CARD_TYPE,
      message: "This username is available.",
    },
  };

  /**
   * validate(username)
   * Checks if the username is valid and available and returns and object
   * with the appropriate response.
   *
   * @param {string} username
   */
  const validate = async (username) => {
    if (!username || !USERNAME_PATTERN.test(username)) {
      return RESPONSES["invalid"];
    } else {
      let type;
      const available = await usernameAvailable(username);
      type = available ? "available" : "unavailable";
      return RESPONSES[type];
    }
  };

  /**
   * usernameAvailable(username)
   * Calls the ILS API to check username availability.
   *
   * @param {string} username
   */
  const usernameAvailable = async (username) => {
    const isBarcode = false;
    let available = false;

    if (!ilsClient) {
      throw new NoILSClient("ILS Client not set in Username Validation API.");
    }

    available = await ilsClient.available(username, isBarcode);

    return available;
  };

  return {
    validate,
    responses: RESPONSES,
    // used for testing
    usernameAvailable,
  };
};

module.exports = UsernameValidationAPI;
