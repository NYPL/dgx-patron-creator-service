const axios = require('axios');
const isEmpty = require('underscore').isEmpty;
const awsDecrypt = require('./../../../config/awsDecrypt.js');
const modelResponse = require('./../../models/v0.2/modelResponse.js');
const modelDebug = require('./../../models/v0.2/modelDebug.js');
const modelStreamPatron = require('./../../models/v0.2/modelStreamPatron.js').modelStreamPatron;
const streamPublish = require('./../../helpers/streamPublish');
const logger = require('../../helpers/Logger');
const encode = require('../../helpers/encode');
const customErrors = require('../../helpers/errors');

const ROUTE_TAG = 'CREATE_PATRON_0.2';
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
    throw new customErrors.InvalidEnvironmentConfiguration(`${envVariableName} was not set.`);
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
    'ILS_CLIENT_KEY', 'ILS_CLIENT_SECRET', 'SCHEMA_API_BASE_URL', 'ILS_CREATE_PATRON_URL',
    'ILS_CREATE_TOKEN_URL', 'PATRON_STREAM_NAME_V02', 'PATRON_SCHEMA_NAME_V02',
  ];
  envVariableNames.forEach((envVariableName) => {
    validateEnvVariable(res, envVariableName);
  });

  if (!req.body || isEmpty(req.body)) {
    throw new customErrors.InvalidRequest('The request body is empty.');
  }
  // Check if we get all the required information from the client
  const requiredFields = [];
  const missingFields = modelDebug.checkMissingRequiredField(requiredFields);

  if (missingFields.length) {
    const debugMessage = modelDebug.renderMissingFieldDebugMessage(missingFields);
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
  res
    .status(status)
    .header('Content-Type', 'application/json')
    .json(message);
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
    type: type || '',
    message: message || '',
    title: title || '',
    debug_message: debugMessage || '',
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

  return axios.post(process.env.ILS_CREATE_TOKEN_URL, {}, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth,
    },
  })
    .then((response) => {
      ilsToken = response.data.access_token;
      ilsTokenTimestamp = new Date();
    }).catch((ilsError) => {
      const errorResponseData = modelResponse.errorResponseData(
        collectErrorResponseData(503, '', `The ILS is not currently available. ${ilsError}`, '', '') // eslint-disable-line comma-dangle
      );
      renderResponse(req, res, 503, errorResponseData);
    });
}

/**
 * streamPatron(req, res, streamPatron, modeledResponse)
 * Send the new patron data to the NewPatron Kinesis stream
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {object} streamPatronData
 * @param {object} modeledResponse
 */
function streamPatron(req, res, streamPatronData, modeledResponse) {
  streamPublish.streamPublish(
    process.env.PATRON_SCHEMA_NAME_V02,
    process.env.PATRON_STREAM_NAME_V02,
    streamPatronData // eslint-disable-line comma-dangle
  ).then((streamResponse) => { // eslint-disable-line no-unused-vars
    renderResponse(req, res, 201, modeledResponse);
    logger.debug('Published to stream successfully!', { routeTag: ROUTE_TAG });
  }).catch((streamError) => {
    renderResponse(req, res, 201, modeledResponse);
    logger.error(
      'Error publishing to stream.\n' +
      `streamPatronData: ${JSON.stringify(streamPatronData)}\n` +
      `${JSON.stringify(streamError)}\n`,
      { routeTag: ROUTE_TAG } // eslint-disable-line comma-dangle
    );
  });
}

/**
 * callAxiosToCreatePatron(req, res, tokenResponse)
 * Make an HTTP request to the ILS to create the patron
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {object} tokenResponse
 */
function callAxiosToCreatePatron(req, res) {
  const timeNow = new Date();
  // eslint-disable-next-line max-len
  const ilsTokenExpired = ilsTokenTimestamp && (timeNow - ilsTokenTimestamp > 3540000); // 3540000 = 59 minutes; tokens are for 60 minutes
  if (!ilsToken || ilsTokenExpired) {
    getIlsToken(req, res, ilsClientKey, ilsClientPassword)
      .then(() => {
        tryCatchCallAxiosToCreatePatron(req, res); // eslint-disable-line no-use-before-define
      });
    return;
  }
  axios.post(process.env.ILS_CREATE_PATRON_URL, req.body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ilsToken}`,
    },
  })
    .then((axiosResponse) => {
      const modeledResponse = modelResponse.patronCreator(axiosResponse.data, axiosResponse.status, req.body); // eslint-disable-line max-len
      modelStreamPatron.transformPatronRequest(req.body, modeledResponse)
        .then((streamPatronData) => {
          streamPatron(req, res, streamPatronData, modeledResponse);
        })
        .catch(() => {
          // eslint-disable-next-line max-len
          renderResponse(req, res, 201, modeledResponse); // respond with 201 even if streaming fails
        });
    })
    .catch((axiosErrorResponse) => {
      try {
        const errorResponseData = modelResponse.errorResponseData(
          collectErrorResponseData(axiosErrorResponse.status, '', axiosErrorResponse, '', '') // eslint-disable-line comma-dangle
        );
        renderResponse(req, res, 500, errorResponseData);
      } catch (error) {
        const errorResponseData = modelResponse.errorResponseData(
          collectErrorResponseData(503, '', 'The ILS is currently unavailable.', '', '') // eslint-disable-line comma-dangle
        );
        renderResponse(req, res, 503, errorResponseData);
      }
    });
}

/**
 * tryCatchCallAxiosToCreatePatron(req, res)
 * Catch errors when calling callAxiosToCreatePatron
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function tryCatchCallAxiosToCreatePatron(req, res) {
  try {
    callAxiosToCreatePatron(req, res, ilsToken);
  } catch (err) {
    const errorResponseData = modelResponse.errorResponseData(
      collectErrorResponseData(500, '', `tryCatchCallAxiosToCreatePatron error: ${err}`, '', '') // eslint-disable-line comma-dangle
    );
    renderResponse(req, res, 500, errorResponseData);
  }
}

/**
 * createPatron(req, res)
 * The callback for the route "/patrons".
 * It will fire a POST request to the ILS API for creating a new patron.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function createPatron(req, res) {
  try {
    validateEnvironmentAndRequest(req, res);
  } catch (validationError) {
    let errorStatusCode;
    if (validationError.name === 'InvalidEnvironmentConfiguration') {
      errorStatusCode = 500;
    } else if (validationError.name === 'InvalidRequest') {
      errorStatusCode = 400;
    } else {
      errorStatusCode = 500;
    }
    res
      .status(errorStatusCode)
      .header('Content-Type', 'application/json')
      .json(modelResponse.errorResponseData(
        collectErrorResponseData(null, 'invalid-request', validationError.message, null, null) // eslint-disable-line comma-dangle
      ));
  }

  ilsClientKey = ilsClientKey || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_KEY);
  ilsClientPassword = ilsClientPassword || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_SECRET);

  Promise.all([ilsClientKey, ilsClientPassword])
    .then((decryptedValues) => {
      [ilsClientKey, ilsClientPassword] = decryptedValues;
      tryCatchCallAxiosToCreatePatron(req, res);
    })
    .catch(() => {
      const localErrorMessage = 'The ILS ClientKey and/or Secret were not decrypted';

      const errorResponseData = modelResponse.errorResponseData(
        collectErrorResponseData(500, 'configuration-error', localErrorMessage, '', '') // eslint-disable-line comma-dangle
      );
      renderResponse(req, res, 500, errorResponseData);
    });
}

if (process.env.NODE_ENV === 'test') {
  module.exports = {
    createPatron,
    validateEnvironmentAndRequest,
    validateEnvVariable,
  };
} else {
  module.exports = {
    createPatron,
  };
}
