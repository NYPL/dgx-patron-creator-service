/* eslint-disable max-classes-per-file */
class ProblemDetail extends Error {
  constructor(status, type, title, detail) {
    super();
    this.status = status;
    this.type = type;
    this.title = title;
    this.message = detail;
  }
}

// Thrown when parameter(s) are missing/invalid
// See https://httpstatuses.com/422
class InvalidEnvironmentConfiguration extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 422;
    this.type = "invalid-environment-configuration";
    this.title = "An environment variable is missing.";
    this.message = detail;
  }
}

class KMSDecryption extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 500;
    this.type = "aws-kms-decryption-error";
    this.title = "AWS KMS decryption error";
    this.message = detail;
  }
}

class UnableToCreatePatronWithAxios extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 400;
    this.type = "unable-to-create-patron";
    this.title = "Unable to create patron with axios";
    this.message = detail;
  }
}

class InvalidRequest extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 400;
    this.type = "invalid-request";
    this.title = "Invalid Request";
    this.message = detail;
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class NoILSClient extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 500;
    this.type = "no-ils-client";
    this.title = "No ILS Client";
    this.message = detail;
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class NoILSCredentials extends ProblemDetail {
  constructor() {
    super();
    this.status = 400;
    this.type = "no-ils-credentials";
    this.title = "No ILS Credentials";
    this.message =
      "The ILS client was set up without a key or secret to generate a token.";
  }
}

class ILSIntegrationError extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 502;
    this.type = "ils-integration-error";
    this.title = "ILS Integration Error";
    this.message = detail;
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class PatronNotFound extends ProblemDetail {
  constructor() {
    super();
    this.status = 502;
    this.type = "patron-not-found";
    this.title = "Patron Not Found in ILS";
    this.message =
      "The patron couldn't be found in the ILS with the barcode or username.";
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class NoBarcode extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 502;
    this.type = "no-barcode";
    this.title = "No Barcode";
    this.message = detail;
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class DatabaseError extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 500;
    this.type = "database-error";
    this.title = "Database Error";
    this.message = detail;
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class IncorrectPassword extends ProblemDetail {
  constructor() {
    super();
    this.status = 400;
    this.type = "incorrect-password";
    this.title = "Missing Required Values";
    this.message =
      "Password should be 4-64 alphanumeric characters. Please revise your password.";
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class ExpiredAccount extends ProblemDetail {
  constructor() {
    super();
    this.status = 400;
    this.type = "expired-account";
    this.title = "Expired Account";
    this.message = "Your card has expired. Please try applying again.";
    // To support older versions of API where client expect these values:
    this.name = "ExpiredAccount";
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class JuvenileLimitReached extends ProblemDetail {
  constructor() {
    super();
    this.status = 400;
    this.type = "limit-reached";
    this.title = "Limit Reached";
    this.message =
      "You have reached the limit of dependent cards you can receive via online application.";
    // To support older versions of API where client expect these values:
    this.name = "NotEligibleCard";
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class NotEligibleCard extends ProblemDetail {
  constructor() {
    super();
    this.status = 401;
    this.type = "not-eligible-card";
    this.title = "Not Eligible Card";
    this.message =
      "You don’t have the correct card type to make child accounts. Please contact gethelp@nypl.org if you believe this is in error.";
    // To support older versions of API where client expect these values:
    this.name = "NotEligibleCard";
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class BadUsername extends ProblemDetail {
  constructor({ type, message }) {
    super();
    this.status = 400;
    this.type = type;
    this.title = "Bad Username";
    this.message = message;
    // To support older versions of API where client expect these values:
    this.name = this.title;
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class NotILSValid extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 400;
    this.type = "not-ils-valid-account";
    this.title = "Not ILS Valid";
    this.message = detail;
    // To support older versions of API where client expect these values:
    this.name = "NotILSValid";
    // A client error object displays `detail` rather than `message` to follow
    // the problem detail structure, but some clients expect `message` in the
    // error response, so include it here.
    this.displayMessageToClient = true;
  }
}

class SOAuthorizationError extends ProblemDetail {
  constructor(detail = "", code) {
    super();
    this.status = 502;
    this.type = "service-objects-authorization-error";
    this.title = "SO Authorization Error";
    this.message = `SO Authorization Error: ${detail}`;
    this.code = code;
  }
}

class SODomainSpecificError extends ProblemDetail {
  constructor(detail = "", code) {
    super();
    this.status = 502;
    this.type = "service-objects-domain-specific-error";
    this.title = "SO Domain Specific Error";
    this.message = detail;
    this.code = code;
  }
}

class SOIntegrationError extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 502;
    this.type = "service-objects-integration-error";
    this.title = "SO Integration Error";
    this.message = detail;
  }
}

class SONoLicenseKeyError extends ProblemDetail {
  constructor(detail) {
    super();
    this.status = 502;
    this.type = "service-objects-no-license-key-error";
    this.title = "SO No License Key Error";
    this.message = detail;
  }
}

class TermsNotAccepted extends ProblemDetail {
  constructor() {
    super();
    this.status = 400;
    this.type = "terms-not-accepted";
    this.title = "Terms Not Accepted";
    this.message = "The terms and conditions were not accepted.";
  }
}

class AgeGateFailure extends ProblemDetail {
  constructor() {
    super();
    this.status = 400;
    this.type = "age-gate-failure";
    this.title = "Age Gate Failure";
    this.message = "You must be 13 years or older to continue.";
  }
}

module.exports = {
  InvalidEnvironmentConfiguration,
  KMSDecryption,
  InvalidRequest,
  UnableToCreatePatronWithAxios,
  NoILSClient,
  NoILSCredentials,
  ILSIntegrationError,
  PatronNotFound,
  NoBarcode,
  DatabaseError,
  IncorrectPassword,
  ExpiredAccount,
  JuvenileLimitReached,
  NotEligibleCard,
  BadUsername,
  NotILSValid,
  SOAuthorizationError,
  SODomainSpecificError,
  SOIntegrationError,
  SONoLicenseKeyError,
  TermsNotAccepted,
  AgeGateFailure,
};
