/* eslint-disable */
import IlsHelper from "./ILSHelper";

/**
 * A class that validates usernames against the ILS.
 */
const UsernameValidationAPI = () => {
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

  const validate = (username) => {
    if (!username || !USERNAME_PATTERN.test(username)) {
      return RESPONSES["invalid"];
    } else {
      const type = username_available(username) ? "available" : "unavailable";
      return RESPONSES[type];
    }
  };

  const username_available = (username) => {
    const client = new IlsHelper();
    let available = false;

    try {
      available = client.available(username);
    } catch (e) {
      // IlsHelper::ConnectionTimeoutError
      throw new Error("IntegrationError()");
    }
    return available;
  };

  return {
    validate,
    responses: RESPONSES,
  };
};

export default UsernameValidationAPI;
