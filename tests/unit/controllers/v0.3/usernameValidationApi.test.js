/* eslint-disable */
const UsernameValidationApi = require("../../../../api/controllers/v0.3/UsernameValidationAPI");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
jest.mock("../../../../api/controllers/v0.3/IlsClient");

// TODO: Once IlsClient is finished, test username_available.
describe("UsernameValidationApi", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    IlsClient.mockClear();
  });

  // This doesn't need a mocked IlsClient so it's not passed.
  it("returns an invalid response if the username is not 5-25 alphanumeric", async () => {
    const { responses, validate } = UsernameValidationApi({});
    const tooShort = "name";
    const tooLong = "averyveryveryveryverylongname";
    const notAlphanumeric = "!!uhuhNotRight$";

    // responses.invalid =
    //  { type: "invalid-username", cardType: null,
    //    message: "Username must be 5-25 alphanumeric characters (A-z0-9)." }
    expect(await validate(tooShort)).toEqual(responses.invalid);
    expect(await validate(tooLong)).toEqual(responses.invalid);
    expect(await validate(notAlphanumeric)).toEqual(responses.invalid);
    expect(IlsClient).not.toHaveBeenCalled();
  });

  it("returns an unavailable response if the username is not available", async () => {
    // Mocking that the ILS request returned false and username is unavailable.
    IlsClient.mockImplementation(() => {
      return {
        available: () => false,
      };
    });
    const { responses, validate } = UsernameValidationApi({
      ilsClient: IlsClient(),
    });
    const unavailable = "unavailableName";

    // responses.unavailable =
    //  { type: "unavailable-username", cardType: null,
    //    message: "This username is unavailable. Please try another." }
    expect(await validate(unavailable)).toEqual(responses.unavailable);
    expect(IlsClient).toHaveBeenCalled();
  });

  it("returns an available response if the username is available", async () => {
    // Mocking that the ILS request returned true and username is available.
    IlsClient.mockImplementation(() => ({ available: () => true }));
    const { responses, validate } = UsernameValidationApi({
      ilsClient: IlsClient(),
    });
    const available = "availableName";

    // responses.available =
    //  { type: "available-username", cardType: "standard",
    //    message: "This username is available." }
    expect(await validate(available)).toEqual(responses.available);
    expect(IlsClient).toHaveBeenCalled();
  });
});
