const { NoILSClient, BadUsername } = require("../../helpers/errors");

/**
 * A class that validates usernames against the ILS.
 */
const UsernameValidationAPI = (args) => {
  const ilsClient = args.ilsClient;
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
   * usernameAvailable(username)
   * Calls the ILS API to check username availability. Returns true or false if
   * the call was successful. The `ilsClient.available` function takes care of
   * error handling. If no ILS Client is passed, an error is thrown before
   * making the call.
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

  /**
   * validate(username)
   * First checks to see if the passed username is not blank and passes the
   * validation pattern and throws an invalid error if it doesn't. if it passes,
   * a call is made to the ILS to check for its availability and returns an
   * object for available usernames or an error for unavailable usernames.
   *
   * @param {string} username
   */
  const validate = async (username) => {
    if (!username || !USERNAME_PATTERN.test(username)) {
      const invalid = RESPONSES.invalid;
      throw new BadUsername(invalid);
    } else {
      const available = await usernameAvailable(username);
      if (!available) {
        const unavailable = RESPONSES.unavailable;
        throw new BadUsername(unavailable);
      }
      return RESPONSES.available;
    }
  };

  return {
    validate,
    responses: RESPONSES,
    // used for testing
    usernameAvailable,
  };
};

module.exports = UsernameValidationAPI;
