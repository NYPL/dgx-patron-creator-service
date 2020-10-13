const isEmpty = require("underscore").isEmpty;
const { InvalidEnvironmentConfiguration } = require("./errors");
const { errorResponseDataWithTag } = require("./responses");

/**
 * validateEnvironmentVariable(envVariableName)
 * Validate that a specific environment variable is present and not empty.
 *
 * @param {string} envVariableName
 * @throws {InvalidEnvironmentConfiguration}
 */
function validateEnvironmentVariable(envVariableName) {
  const envVariable = process.env[envVariableName];

  if (!envVariable || isEmpty(envVariable)) {
    throw new InvalidEnvironmentConfiguration(
      `${envVariableName} was not set.`,
    );
  }
}

/**
 * validateEnvironmentAndRequest(envVariableNames)
 * Validate the request format and environment variables related to the
 * ILS and streaming service.
 *
 * @param {Array} envVariableNames
 */
function validateEnvironmentAndRequest(envVariableNames) {
  if (!envVariableNames || envVariableNames.length === 0) {
    throw new InvalidEnvironmentConfiguration(
      "Environment variables were not passed to validateEnvironmentAndRequest.",
    );
  }

  envVariableNames.forEach((envVariableName) => {
    validateEnvironmentVariable(envVariableName);
  });
}

/**
 * checkEnvironmentVariables(res, routeTag, envVariableNames)
 * Check and validate all the environment variables. Returns true if all the
 * variables are set and false otherwise. This is needed because even though
 * the response is set and will be sent, the function still needs to stop
 * from continuing to process.
 *
 * @param {HTTP response} res
 * @param {string} routeTag
 * @param {Array} envVariableNames - All the environment variables to validate.
 */
async function checkEnvironmentVariables(res, routeTag, envVariableNames) {
  try {
    validateEnvironmentAndRequest(envVariableNames);
    return true;
  } catch (validationError) {
    const collectErrorResponseData = errorResponseDataWithTag(routeTag);
    res
      .status(validationError.status)
      .header("Content-Type", "application/json")
      .json(collectErrorResponseData(validationError));
    return false;
  }
}

module.exports = {
  checkEnvironmentVariables,
  validateEnvironmentVariable,
  validateEnvironmentAndRequest,
};
