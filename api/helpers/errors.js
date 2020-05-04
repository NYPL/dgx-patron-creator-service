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

module.exports = {
  InvalidEnvironmentConfiguration,
  InvalidRequest,
  UnableToCreatePatronWithAxios,
  NoILSClient,
  ILSIntegrationError,
};
