/* eslint-disable */

// Thrown when parameter(s) are missing/invalid
// See https://httpstatuses.com/422
class InvalidEnvironmentConfiguration extends Error {
  constructor(message) {
    super();
    this.name = "InvalidEnvironmentConfiguration";
    this.message = message;
  }
}

class UnableToCreatePatronWithAxios extends Error {
  constructor(message) {
    super();
    this.name = "UnableToCreatePatronWithAxios";
    this.message = message;
  }
}

class InvalidRequest extends Error {
  constructor(message) {
    super();
    this.name = "InvalidRequest";
    this.type = "invalid-request";
    this.state = 400;
    this.message = message;
  }
}

class NoILSClient extends Error {
  constructor(message) {
    super();
    this.name = "NoILSClient";
    this.message = message;
    this.status = 500;
  }
}

class ILSIntegrationError extends Error {
  constructor(message) {
    super();
    this.name = "ILSIntegrationError";
    this.message = message;
    this.status = 502;
  }
}

class PatronNotFound extends Error {
  constructor() {
    super();
    this.type = "patron-not-found";
    this.name = "PatronNotFound";
    this.message = "The patron couldn't be found.";
    this.status = 502;
  }
}

class NoBarcode extends Error {
  constructor(message) {
    super();
    this.type = "no-barcode";
    this.name = "NoBarcode";
    this.message = message;
    this.status = 502;
  }
}

class DatabaseError extends Error {
  constructor(message) {
    super();
    this.type = "database-error";
    this.name = "DatabaseError";
    this.message = message;
    this.status = 500;
  }
}

class MissingRequiredValues extends Error {
  constructor(message) {
    super();
    this.type = "missing-required-values";
    this.name = "MissingRequiredValues";
    this.message = message;
    this.status = 400;
  }
}
class IncorrectPin extends Error {
  constructor() {
    super();
    this.type = "incorrect-pin";
    this.name = "MissingRequiredValues";
    this.message =
      "PIN should be 4 numeric characters only. Please revise your PIN.";
    this.status = 400;
  }
}

class ExpiredAccount extends Error {
  constructor() {
    super();
    this.type = "expired-account";
    this.name = "ExpiredAccount";
    this.message = "Your card has expired. Please try applying again.";
    this.status = 400;
  }
}

class NotEligibleCard extends Error {
  constructor(message) {
    super();
    this.type = "not-eligible-card";
    this.name = "NotEligibleCard";
    this.message = message;
    this.status = 400;
  }
}

module.exports = {
  InvalidEnvironmentConfiguration,
  InvalidRequest,
  UnableToCreatePatronWithAxios,
  NoILSClient,
  ILSIntegrationError,
  PatronNotFound,
  NoBarcode,
  DatabaseError,
  MissingRequiredValues,
  IncorrectPin,
  ExpiredAccount,
  NotEligibleCard,
};
