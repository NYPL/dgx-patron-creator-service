/* eslint-disable */
const createPatron = require("../../../../api/controllers/v0.2/createPatron");

const validateEnvironmentAndRequest =
  createPatron.validateEnvironmentAndRequest;
const validateEnvVariable = createPatron.validateEnvVariable;

describe("createPatron private methods", () => {
  it("validateEnvironmentAndRequest should fail because an environment variable is not present", () => {
    expect(() => validateEnvironmentAndRequest(null, null)).toThrow(
      "ILS_CLIENT_KEY was not set."
    );
    // happens only when it is setting an error status because an expected variable is missing
  });

  it("validateEnvVariable should thrown an error for a missing environment variable", () => {
    expect(() => validateEnvVariable(null, "NAME_OF_MISSING_VARIABLE")).toThrow(
      "NAME_OF_MISSING_VARIABLE was not set."
    );
    // happens only when it is setting an error status because an expected variable is missing
  });
});
