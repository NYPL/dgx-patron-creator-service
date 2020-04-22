/* eslint-disable */
import Card from "../../models/v0.3/modelCard";
import IlsHelper from "./ILSHelper";

const UsernameValidationAPI = () => {
  // class IntegrationError < StandardError; end
  const USERNAME_PATTERN = /\A[a-zA-Z0-9]{5,25}\z/;
  const AVAILABLE_USERNAME_TYPE = "available-username";
  const UNAVAILABLE_USERNAME_TYPE = "unavailable-username";
  const INVALID_USERNAME_TYPE = "invalid-username";

  const STANDARD_CARD_TYPE = Card.STANDARD_CARD_TYPE;
  const TEMPORARY_CARD_TYPE = Card.TEMPORARY_CARD_TYPE;

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

  this.validate = (username) => {
    if (!username && !username.match(USERNAME_PATTERN)) {
      return RESPONSES["invalid"];
    } else {
      const type = this.username_available(username)
        ? "available"
        : "unavailable";
      return RESPONSES[type];
    }
  };

  this.username_available = (username) => {
    const client = new IlsHelper();
    let available = false;

    try {
      available = client.available(username);
    } catch (e) {
      // IlsHelper::ConnectionTimeoutError
      throw new IntegrationError();
    }
    return available;
  };
};

export default UsernameValidationAPI;
