/* eslint-disable */
const modelResponse = require("../../models/v0.2/modelResponse");
const UsernameValidationAPI = require("./UsernameValidationAPI");
const axios = require("axios");
const isEmpty = require("underscore").isEmpty;
const awsDecrypt = require("./../../../config/awsDecrypt.js");
const AddressValidationAPI = require("./AddressValidationAPI");
const IlsClient = require("./IlsClient");
const modelDebug = require("./../../models/v0.2/modelDebug.js");
const modelStreamPatron = require("./../../models/v0.2/modelStreamPatron.js")
  .modelStreamPatron;
const streamPublish = require("./../../helpers/streamPublish");
const logger = require("../../helpers/Logger");
const encode = require("../../helpers/encode");
const customErrors = require("../../helpers/errors");
const Address = require("../../models/v0.3/modelAddress");
const { Card } = require("../../models/v0.3/modelCard");
const Policy = require("../../models/v0.3/modelPolicy");

const ROUTE_TAG = "CREATE_PATRON_0.3";
let ilsClientKey;
let ilsClientPassword;
let ilsToken;
let ilsTokenTimestamp;
let ilsClient;

/**
 * validateEnvVariable(envVariableName)
 * Validate that a specific environment variable is present.
 *
 * @param {HTTP response} res
 * @param {string} envVariableName
 * @throws {InvalidEnvironmentConfiguration}
 */
function validateEnvVariable(res, envVariableName) {
  const envVariable = process.env[envVariableName];

  if (!envVariable || isEmpty(envVariable)) {
    throw new customErrors.InvalidEnvironmentConfiguration(
      `${envVariableName} was not set.`
    );
  }
}

/**
 * validateEnvironmentAndRequest(req, res)
 * Validate the request format and environment variables related to the ILS and streaming service.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function validateEnvironmentAndRequest(req, res) {
  const envVariableNames = [
    "ILS_CLIENT_KEY",
    "ILS_CLIENT_SECRET",
    "SCHEMA_API_BASE_URL",
    "ILS_CREATE_PATRON_URL",
    "ILS_CREATE_TOKEN_URL",
    "ILS_FIND_VALUE_URL",
    "PATRON_STREAM_NAME_V03",
    "PATRON_SCHEMA_NAME_V03",
  ];
  envVariableNames.forEach((envVariableName) => {
    validateEnvVariable(res, envVariableName);
  });

  if (!req.body || isEmpty(req.body)) {
    throw new customErrors.InvalidRequest("The request body is empty.");
  }
  // Check if we get all the required information from the client
  const requiredFields = [];
  const missingFields = modelDebug.checkMissingRequiredField(requiredFields);

  if (missingFields.length) {
    const debugMessage = modelDebug.renderMissingFieldDebugMessage(
      missingFields
    );
    throw new customErrors.InvalidRequest(debugMessage);
  }
}
/**
 * renderResponse(req, res, status, message)
 * Render the response from the ILS API.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {number} status
 * @param {object} message
 */
function renderResponse(req, res, status, message) {
  res.status(status).header("Content-Type", "application/json").json(message);
}

/**
 * collectErrorResponseData(status, type, message, title, debugMessage)
 * Model the response from a failed request.
 *
 * @param {number} status
 * @param {string} type
 * @param {string} message
 * @param {string} title
 * @param {string} debugMessage
 * @return {object}
 */
function collectErrorResponseData(status, type, message, title, debugMessage) {
  // logger.error(
  console.error(
    `status_code: ${status}, ` +
      `type: ${type}, ` +
      `message: ${message}, ` +
      `response: ${debugMessage}`,
    { routeTag: ROUTE_TAG } // eslint-disable-line comma-dangle
  );

  return {
    status: status || null,
    type: type || "",
    message: message || "",
    title: title || "",
    debug_message: debugMessage || "",
  };
}

/**
 * getIlsToken(req, res, username, password) {
 * Get a token from the ILS.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {string} username
 * @param {string} password
 */
function getIlsToken(req, res, username, password) {
  const basicAuth = `Basic ${encode(`${username}:${password}`)}`;

  return axios
    .post(
      process.env.ILS_CREATE_TOKEN_URL,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: basicAuth,
        },
      }
    )
    .then((response) => {
      ilsToken = response.data.access_token;
      ilsTokenTimestamp = new Date();
    })
    .catch((ilsError) => {
      const errorResponseData = modelResponse.errorResponseData(
        collectErrorResponseData(
          503,
          "",
          `The ILS is not currently available. ${ilsError}`,
          "",
          ""
        ) // eslint-disable-line comma-dangle
      );
      renderResponse(req, res, 503, errorResponseData);
    });
}

/**
 * callCreatePatron(req, res, tokenResponse)
 * Make an HTTP request to the ILS to create the patron
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {object} tokenResponse
 */
async function callCreatePatron(req, res) {
  const timeNow = new Date();
  // eslint-disable-next-line max-len
  const ilsTokenExpired =
    ilsTokenTimestamp && timeNow - ilsTokenTimestamp > 3540000; // 3540000 = 59 minutes; tokens are for 60 minutes
  if (!ilsToken || ilsTokenExpired) {
    getIlsToken(req, res, ilsClientKey, ilsClientPassword).then(() => {
      tryCatchAttemptCreatePatron(req, res); // eslint-disable-line no-use-before-define
    });
    return;
  }

  // By now, these are already defiend.
  // assigned in createPatron
  // ilsClientKey
  // ilsClientPassword
  // assigned in getIlsToken
  // ilsToken
  // ilsTokenTimestamp
  ilsClient = IlsClient({
    createUrl: process.env.ILS_CREATE_PATRON_URL,
    findUrl: process.env.ILS_FIND_VALUE_URL,
    ilsToken,
    tokenUrl: process.env.ILS_CREATE_TOKEN_URL,
    // ilsTokenTimestamp,
    // ilsClientKey,
    // ilsClientPassword,
  });

  // Instead of calling Card Creator API. Make the internal ILS calls here.

  /**
   * Validate username
   */
  // const { responses, validate } = UsernameValidationAPI({ ilsClient });
  // let validUsername = await validate(req.body.username);
  // console.log("validUsername", validUsername);
  // renderResponse(req, res, 200, validUsername);

  // A valid username can be available or unavailable.
  // if (validUsername === responses.available ||
  //   validUsername === responses.unavailable
  // ) {
  //   let usernameModel = modelResponse.username(validUsername, 200);
  // } else {
  //   // the username is invalid.
  // }
  /**
   * Validate address TODO
   */
  // const address = new Address(req.body.address);
  // let validAddress = address.validationResponse(isWorkAddress = false);
  // if (validAddress) {
  //   let addressModel = modelResponse.username(validAddress, 200);
  // } else {
  //   // Throw an error
  // }
  // If validUsername && validAddress
  // use usernameModel and addressModel together to create the patron

  let address = new Address(req.body.address);
  const policy = Policy({ policyType: "webApplicant" });
  const card = new Card({
    name: req.body.name, // from req
    address: address, // created above
    username: req.body.username, // created above
    pin: req.body.pin, // from req
    email: req.body.email, // from req
    birthdate: req.body.birthdate, // from req
    ecommunicationsPref: req.body.ecommunicationsPref, // from req
    policy, //created above
    ilsClient,
  });

  // TODO - validate address and username in the card but have flag from
  // request stating if the address and username have already been validated
  let valid = card.validate();
  let response = {};
  if (valid) {
    let resp = await card.createIlsPatron();
    // resp.data.link has the ID of the newly created patron in the form of:
    // "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/{patron-id}"
    response = {
      status: resp.status,
      data: resp.data,
    };
  } else {
    console.log("not valid", card.errors);
    response = card.errors;
  }

  renderResponse(req, res, 200, response);
}

/**
 * tryCatchAttemptCreatePatron(req, res)
 * Catch errors when calling callCreatePatron
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function tryCatchAttemptCreatePatron(req, res) {
  try {
    callCreatePatron(req, res);
  } catch (err) {
    const errorResponseData = modelResponse.errorResponseData(
      collectErrorResponseData(
        500,
        "",
        `tryCatchAttemptCreatePatron error: ${err}`,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
    renderResponse(req, res, 500, errorResponseData);
  }
}

/**
 * The callback for the route "/patrons".
 * TODO: Just boilerplate for now.
 */
function createPatron(req, res) {
  try {
    validateEnvironmentAndRequest(req, res);
  } catch (validationError) {
    let errorStatusCode;
    if (validationError.name === "InvalidEnvironmentConfiguration") {
      errorStatusCode = 500;
    } else if (validationError.name === "InvalidRequest") {
      errorStatusCode = 400;
    } else {
      errorStatusCode = 500;
    }
    res
      .status(errorStatusCode)
      .header("Content-Type", "application/json")
      .json(
        modelResponse.errorResponseData(
          collectErrorResponseData(
            null,
            "invalid-request",
            validationError.message,
            null,
            null
          ) // eslint-disable-line comma-dangle
        )
      );
  }

  ilsClientKey = process.env.ILS_CLIENT_KEY;
  // ilsClientKey || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_KEY);
  ilsClientPassword = process.env.ILS_CLIENT_SECRET;
  // ilsClientPassword || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_SECRET);

  Promise.all([ilsClientKey, ilsClientPassword])
    .then((decryptedValues) => {
      [ilsClientKey, ilsClientPassword] = decryptedValues;
      tryCatchAttemptCreatePatron(req, res);
    })
    .catch(() => {
      const localErrorMessage =
        "The ILS ClientKey and/or Secret were not decrypted";

      const errorResponseData = modelResponse.errorResponseData(
        collectErrorResponseData(
          500,
          "configuration-error",
          localErrorMessage,
          "",
          ""
        ) // eslint-disable-line comma-dangle
      );
      renderResponse(req, res, 500, errorResponseData);
    });
}

module.exports = {
  createPatron,
};
