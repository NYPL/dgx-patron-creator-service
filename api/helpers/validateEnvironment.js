const isEmpty = require('underscore').isEmpty;
const { InvalidEnvironmentConfiguration, InvalidRequest } = require('./errors');
const modelDebug = require('../models/v0.2/modelDebug');
const modelResponse = require('../models/v0.3/modelResponse');
const { errorResponseDataWithTag } = require('./responses');

/**
 * validateEnvVariable(envVariableName)
 * Validate that a specific environment variable is present and not empty.
 *
 * @param {HTTP response} res
 * @param {string} envVariableName
 * @throws {InvalidEnvironmentConfiguration}
 */
function validateEnvVariable(res, envVariableName) {
  const envVariable = process.env[envVariableName];

  if (!envVariable || isEmpty(envVariable)) {
    throw new InvalidEnvironmentConfiguration(
      `${envVariableName} was not set.`,
    );
  }
}

/**
 * validateEnvironmentAndRequest(req, res)
 * Validate the request format and environment variables related to the
 * ILS and streaming service.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {Array} envVariableNames
 */
function validateEnvironmentAndRequest(req, res, envVariableNames) {
  if (!envVariableNames || envVariableNames.length === 0) {
    throw new InvalidEnvironmentConfiguration(
      'Environment variables were not passed to validateEnvironmentAndRequest.',
    );
  }

  envVariableNames.forEach((envVariableName) => {
    validateEnvVariable(res, envVariableName);
  });

  if (!req.body || isEmpty(req.body)) {
    throw new InvalidRequest('The request body is empty.');
  }
  // Check if we get all the required information from the client
  const requiredFields = [];
  const missingFields = modelDebug.checkMissingRequiredField(requiredFields);

  if (missingFields.length) {
    const debugMessage = modelDebug.renderMissingFieldDebugMessage(
      missingFields,
    );
    throw new InvalidRequest(debugMessage);
  }
}

/**
 * checkEnvVariables(req, res)
 * Check and validate all the environment variables. Returns true if all the
 * variables are set and false otherwise. This is needed because even though
 * the response is set and will be sent, the function still needs to stop
 * from continuing to process.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {string} routeTag
 * @param {Array} envVariableNames - All the environment variables to validate.
 */
async function checkEnvVariables(req, res, routeTag, envVariableNames) {
  try {
    validateEnvironmentAndRequest(req, res, envVariableNames);
    return true;
  } catch (validationError) {
    const collectErrorResponseData = errorResponseDataWithTag(routeTag);
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
      .json(
        modelResponse.errorResponseData(
          collectErrorResponseData(
            errorStatusCode,
            'invalid-request',
            validationError.message,
            null,
            null,
          ) // eslint-disable-line comma-dangle
        ),
      );
    return false;
  }
}

module.exports = {
  checkEnvVariables,
  validateEnvVariable,
  validateEnvironmentAndRequest,
};
