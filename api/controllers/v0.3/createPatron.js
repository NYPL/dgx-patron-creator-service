/* eslint-disable */
import modelResponse from "../../models/v0.2/modelResponse";
import UsernameValidationAPI from "./UsernameValidationAPI";
import AddressValidationAPI from "./AddressValidationAPI";

const ROUTE_TAG = "CREATE_PATRON_0.3";
let ilsClientKey;
let ilsClientPassword;
let ilsToken;
let ilsTokenTimestamp;

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
  logger.error(
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
function callCreatePatron(req, res) {
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

  // Instead of calling Card Creator API. Make the internal ILS calls here.

  // axios.post(process.env.ILS_CREATE_PATRON_URL, req.body, {
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${ilsToken}`,
  //   },
  // })
  //   .then((axiosResponse) => {
  //     const modeledResponse = modelResponse.patronCreator(axiosResponse.data, axiosResponse.status, req.body); // eslint-disable-line max-len
  //     modelStreamPatron.transformPatronRequest(req.body, modeledResponse)
  //       .then((streamPatronData) => {
  //         streamPatron(req, res, streamPatronData, modeledResponse);
  //       })
  //       .catch(() => {
  //         // eslint-disable-next-line max-len
  //         renderResponse(req, res, 201, modeledResponse); // respond with 201 even if streaming fails
  //       });
  //   })
  //   .catch((axiosError) => {
  //     try {
  //       const errorResponseData = modelResponse.errorResponseData(
  //         collectErrorResponseData(axiosError.response.status, '', axiosError.response.data, '', '') // eslint-disable-line comma-dangle
  //       );
  //       renderResponse(req, res, axiosError.response.status, errorResponseData);
  //     } catch (error) {
  //       const errorResponseData = modelResponse.errorResponseData(
  //         collectErrorResponseData(500, '', `Error related to ${process.env.ILS_CREATE_PATRON_URL} or publishing to the NewPatron stream.`, '', '') // eslint-disable-line comma-dangle
  //       );
  //       renderResponse(req, res, 500, errorResponseData);
  //     }
  //   });
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
    callCreatePatron(req, res, ilsToken);
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
 * TODO: Just boilderplate for now.
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

  ilsClientKey =
    ilsClientKey || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_KEY);
  ilsClientPassword =
    ilsClientPassword || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_SECRET);

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

  /**
   * Validate username, all example usage
   */
  // const { responses, validate } = UsernameValidationAPI();
  // let validUsername = validate(req.body.username);
  // A valid username can be available or unavailable.
  // if (validUsername === responses.available ||
  //   validUsername === responses.unavailable
  // ) {
  //   // Do an extra check to make sure the valid username is available
  //   let usernameModel = modelResponse.username(validUsername, 200);
  // } else {
  //   // Throw an error
  // }
  /**
   * Validate address
   */
  // Might be better to use the addressValidator
  // const address = new Address(req.body.address);
  // let validAddress = address.validation_response(isWorkAddress = false);
  // if (validAddress) {
  //   let addressModel = modelResponse.username(validAddress, 200);
  // } else {
  //   // Throw an error
  // }
  /**
   * Then create patron
   */
  // If validUsername && validAddress
  // use usernameModel and addressModel together to create the patron
}

export default createPatron;
