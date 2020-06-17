/* eslint-disable */
const { NoILSClient, BadUsername } = require("../../helpers/errors");

/**
 * A class that validates usernames against the ILS.
 */
const UsernameValidationAPI = (args) => {
  const ilsClient = args["ilsClient"];
  const USERNAME_PATTERN = /^[a-zA-Z0-9]{5,25}$/;
  const AVAILABLE_USERNAME_TYPE = "available-username";
  const UNAVAILABLE_USERNAME_TYPE = "unavailable-username";
  const INVALID_USERNAME_TYPE = "invalid-username";

  const RESPONSES = {
    invalid: {
      type: INVALID_USERNAME_TYPE,
      cardType: null,
      message:
        "Usernames should be 5-25 characters, letters or numbers only. Please revise your username.",
    },
    unavailable: {
      type: UNAVAILABLE_USERNAME_TYPE,
      cardType: null,
      message: "This username is unavailable. Please try another.",
    },
    available: {
      type: AVAILABLE_USERNAME_TYPE,
      cardType: "standard",
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
      const invalid = RESPONSES["invalid"];
      throw new BadUsername(invalid.type, invalid.message);
    } else {
      let type;
      const available = await usernameAvailable(username);
      if (!available) {
        const unavailable = RESPONSES["unavailable"];
        throw new BadUsername(unavailable.type, unavailable.message);
      }
      return RESPONSES["available"];
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
