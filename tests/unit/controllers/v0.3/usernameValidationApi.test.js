const UsernameValidationAPI = require("../../../../api/controllers/v0.3/UsernameValidationAPI");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const {
  NoILSClient,
  ILSIntegrationError,
  BadUsername,
} = require("../../../../api/helpers/errors");

jest.mock("../../../../api/controllers/v0.3/IlsClient");

describe("UsernameValidationAPI", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    IlsClient.mockClear();
  });

  describe("checkAvailabilityInILS", () => {
    it("throws an error if no ilsClient was passed", async () => {
      const noIlsClient = new NoILSClient(
        "ILS Client not set in Username Validation API."
      );
      const { checkAvailabilityInILS } = UsernameValidationAPI();

      await expect(checkAvailabilityInILS("username")).rejects.toEqual(
        noIlsClient
      );
    });

    it("returns true if the username is available", async () => {
      // Mocking that the ILS request returned true and username is available.
      IlsClient.mockImplementation(() => ({ available: () => true }));
      const { checkAvailabilityInILS } = UsernameValidationAPI(IlsClient());

      expect(await checkAvailabilityInILS("username")).toEqual(true);
      expect(IlsClient).toHaveBeenCalled();
    });

    it("returns false if the username is not available", async () => {
      // Mocking that the ILS request returned true and username is available.
      IlsClient.mockImplementation(() => ({ available: () => false }));
      const { checkAvailabilityInILS } = UsernameValidationAPI(IlsClient());

      expect(await checkAvailabilityInILS("username")).toEqual(false);
      expect(IlsClient).toHaveBeenCalled();
    });

    it("throws an error if the ILS throws an error", async () => {
      const integrationError = new ILSIntegrationError(
        "The ILS could not be requested when validating the username."
      );
      // Mocking that the ILS request returned true and username is available.
      IlsClient.mockImplementation(() => ({
        available: () => {
          throw integrationError;
        },
      }));
      const { checkAvailabilityInILS } = UsernameValidationAPI(IlsClient());

      await expect(checkAvailabilityInILS("username")).rejects.toEqual(
        integrationError
      );
    });
  });

  // The main function that checks for validity first, and
  // then availability in the ILS.
  describe("validate", () => {
    // This doesn't need a mocked IlsClient so it's not passed.
    it("returns an invalid response if the username is not 5-25 alphanumeric", async () => {
      const { responses, validate } = UsernameValidationAPI();
      const tooShort = "name";
      const tooLong = "averyveryveryveryverylongname";
      const notAlphanumeric = "!!uhuhNotRight$";
      const invalidResponse = responses.invalid.message;
      // "Usernames should be 5-25 characters, letters or numbers only. Please revise your username."

      await expect(validate(tooShort)).rejects.toThrowError(invalidResponse);
      await expect(validate(tooLong)).rejects.toThrowError(invalidResponse);
      await expect(validate(notAlphanumeric)).rejects.toThrowError(
        invalidResponse
      );
      expect(IlsClient).not.toHaveBeenCalled();
    });

    it("returns an unavailable response if the username is not available", async () => {
      // Mocking that the ILS request returned false and username is unavailable.
      IlsClient.mockImplementation(() => {
        return {
          available: () => false,
        };
      });
      let { validate } = UsernameValidationAPI(IlsClient());
      const unavailable = "unavailableName";

      await expect(validate(unavailable)).rejects.toThrow(BadUsername);
      await expect(validate(unavailable)).rejects.toThrowError(
        "This username is unavailable. Please try another."
      );
      expect(IlsClient).toHaveBeenCalled();
    });

    it("returns an available response if the username is available", async () => {
      // Mocking that the ILS request returned true and username is available.
      IlsClient.mockImplementation(() => ({ available: () => true }));
      const { responses, validate } = UsernameValidationAPI(IlsClient());
      const available = "availableName";

      // responses.available =
      //  { type: "available-username",
      //    detail: "This username is available." }
      expect(await validate(available)).toEqual(responses.available);
      expect(IlsClient).toHaveBeenCalled();
    });
  });
});
