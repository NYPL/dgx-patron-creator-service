/* eslint-disable */
import UsernameValidationApi from "../../../../api/controllers/v0.3/UsernameValidationAPI";
import IlsHelper from "../../../../api/controllers/v0.3/ILSHelper";
jest.mock("../../../../api/controllers/v0.3/ILSHelper");

describe.only("UsernameValidationApi", () => {
  const { responses, validate } = UsernameValidationApi();

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    IlsHelper.mockClear();
  });

  it("returns an invalid response if the username is not 5-25 alphanumeric", () => {
    const tooShort = "name";
    const tooLong = "averyveryveryveryverylongname";
    const notAlphanumeric = "!!uhuhNotRight$";

    // responses.invalid =
    //  { type: "invalid-username", cardType: null,
    //    message: "Username must be 5-25 alphanumeric characters (A-z0-9)." }
    expect(validate(tooShort)).toEqual(responses.invalid);
    expect(validate(tooLong)).toEqual(responses.invalid);
    expect(validate(notAlphanumeric)).toEqual(responses.invalid);
  });

  it("returns an unavailable response if the username is not available", () => {
    // Mocking that the ILS request returned false and username is unavailable.
    IlsHelper.mockImplementation(() => ({ available: () => false }));
    const unavailable = "unavailableName";

    // responses.unavailable =
    //  { type: "unavailable-username", cardType: null,
    //    message: "This username is unavailable. Please try another." }
    expect(validate(unavailable)).toEqual(responses.unavailable);
    expect(IlsHelper).toHaveBeenCalled();
  });

  it("returns an available response if the username is available", () => {
    // Mocking that the ILS request returned true and username is available.
    IlsHelper.mockImplementation(() => ({ available: () => true }));
    const available = "availableName";

    // responses.available =
    //  { type: "available-username", cardType: "standard",
    //    message: "This username is available." }
    expect(validate(available)).toEqual(responses.available);
    expect(IlsHelper).toHaveBeenCalled();
  });
});
