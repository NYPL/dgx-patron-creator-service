const Card = require("../../../../api/models/v0.3/modelCard");
const Policy = require("../../../../api/models/v0.3/modelPolicy");
const Address = require("../../../../api/models/v0.3/modelAddress");
const UsernameValidationAPI = require("../../../../api/controllers/v0.3/UsernameValidationAPI");
const AddressValidationAPI = require("../../../../api/controllers/v0.3/AddressValidationAPI");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const {
  NoILSClient,
  ILSIntegrationError,
  DatabaseError,
} = require("../../../../api/helpers/errors");
const Barcode = require("../../../../api/models/v0.3/modelBarcode");

jest.mock("../../../../api/controllers/v0.3/UsernameValidationAPI");
jest.mock("../../../../api/controllers/v0.3/AddressValidationAPI");
jest.mock("../../../../api/controllers/v0.3/IlsClient");
jest.mock("../../../../api/models/v0.3/modelBarcode");

const basicCard = {
  name: "First Last",
  address: new Address(
    {
      line1: "476th 5th Ave.",
      city: "New York",
      state: "NY",
      zip: "10018",
    },
    "soLicenseKey"
  ),
  username: "username",
  password: "MyLib1731@!",
  email: "test@test.com",
  birthdate: "01/01/1988",
  acceptTerms: true,
  ageGate: true,
};

// UsernameValidationAPI constants
const available = {
  type: "available-username",
  message: "This username is available",
};
const unavailable = {
  type: "unavailable-username",
  message: "This username is unavailable. Please try another.",
};
const invalid = {
  type: "invalid-username",
  message:
    "Usernames should be 5-25 characters, letters or numbers only. Please revise your username.",
};

describe("Card", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    UsernameValidationAPI.mockClear();
    AddressValidationAPI.mockClear();
    IlsClient.mockClear();
  });

  describe("Init", () => {
    it("should set homeLibraryCard to 'eb' by default", () => {
      // `basicCard` does not have a homeLibraryCard value.
      const card = new Card(basicCard);

      expect(card.homeLibraryCode).toEqual("eb");
    });

    it("should update homeLibraryCard to the value passed", () => {
      const card = new Card({
        name: "First Last",
        address: new Address(
          { line1: "476th 5th Ave.", city: "New York" },
          "soLicenseKy"
        ),
        username: "username",
        password: "MyLib1731@!",
        // required for web applicants
        birthdate: "01/01/1988",
        // random library code
        homeLibraryCode: "aa",
      });

      expect(card.homeLibraryCode).toEqual("aa");
    });
  });

  describe("validate", () => {
    it("should fail if the terms and conditions flag is not set to true", async () => {
      const cardNoAcceptTerms = new Card({});
      await expect(cardNoAcceptTerms.validate()).rejects.toThrow(
        "The terms and conditions were not accepted."
      );
    });

    it("should fail if the age gate flag is not true for simplye policy type", async () => {
      const cardNoAgeGate = new Card({
        ...basicCard,
        ageGate: false,
        acceptTerms: true,
        policy: Policy({ policyType: "simplye" }),
      });

      await expect(cardNoAgeGate.validate()).rejects.toThrow(
        "You must be 13 years or older to continue."
      );
    });

    it("accepts a boolean or string set to true for the accept terms flag", async () => {
      const cardAcceptBool = new Card({
        name: "Tom",
        username: "username",
        password: "MyLib1731@!",
        address: {},
        email: "email@email.com",
        policy: Policy({ policyType: "simplye" }),
        birthdate: "01/01/1988",
        acceptTerms: true,
        ageGate: true,
      });
      const cardAcceptString = new Card({
        name: "Tom",
        username: "username",
        password: "MyLib1731@!",
        address: {},
        email: "email@email.com",
        policy: Policy({ policyType: "simplye" }),
        birthdate: "01/01/1988",
        acceptTerms: "true",
        ageGate: true,
      });
      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
        },
      });
      // Mock that the UsernameValidationAPI returned an error response:
      const mockUsernameValidate = jest.fn().mockReturnValue({
        available: true,
        response: { message: "Available username" },
      });
      cardAcceptBool.address.validate = mockAddressValidate;
      cardAcceptString.address.validate = mockAddressValidate;
      cardAcceptBool.checkValidUsername = mockUsernameValidate;
      cardAcceptString.checkValidUsername = mockUsernameValidate;

      let response = await cardAcceptBool.validate();
      expect(response).toEqual({ valid: true, errors: {} });
      response = await cardAcceptString.validate();
      expect(response).toEqual({ valid: true, errors: {} });
    });

    it("accepts a boolean or string set to true for the age gate flag", async () => {
      const cardAcceptBool = new Card({
        name: "Tom",
        username: "username",
        password: "MyLib1731@!",
        address: {},
        email: "email@email.com",
        policy: Policy({ policyType: "simplye" }),
        birthdate: "01/01/1988",
        acceptTerms: true,
        ageGate: true,
      });
      const cardAcceptString = new Card({
        name: "Tom",
        username: "username",
        password: "MyLib1731@!",
        address: {},
        email: "email@email.com",
        policy: Policy({ policyType: "simplye" }),
        birthdate: "01/01/1988",
        acceptTerms: "true",
        ageGate: "true",
      });
      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
        },
      });
      // Mock that the UsernameValidationAPI returned an error response:
      const mockUsernameValidate = jest.fn().mockReturnValue({
        available: true,
        response: { message: "Available username" },
      });
      cardAcceptBool.address.validate = mockAddressValidate;
      cardAcceptString.address.validate = mockAddressValidate;
      cardAcceptBool.checkValidUsername = mockUsernameValidate;
      cardAcceptString.checkValidUsername = mockUsernameValidate;

      let response = await cardAcceptBool.validate();
      expect(response).toEqual({ valid: true, errors: {} });
      response = await cardAcceptString.validate();
      expect(response).toEqual({ valid: true, errors: {} });
    });

    it("should fail if there are no name, username, password, address, and email values", async () => {
      const cardNoName = new Card({
        name: "",
        username: "username",
        password: "MyLib1731@!",
        address: {},
        email: "test@test.com",
        acceptTerms: true,
      });
      const cardNoUsername = new Card({
        name: "name",
        username: "",
        password: "MyLib1731@!",
        address: {},
        email: "test@test.com",
        acceptTerms: true,
      });
      const cardNopassword = new Card({
        name: "name",
        username: "username",
        password: "",
        address: {},
        email: "test@test.com",
        acceptTerms: true,
      });
      const cardNoAddress = new Card({
        name: "name",
        username: "username",
        password: "MyLib1731@!",
        address: undefined,
        email: "test@test.com",
        acceptTerms: true,
      });
      const cardNoEmail = new Card({
        name: "name",
        username: "username",
        password: "MyLib1731@!",
        address: undefined,
        email: "",
        acceptTerms: true,
      });

      await expect(cardNoName.validate()).rejects.toThrow(
        "'name', 'address', 'username', 'password', and 'email' are all required fields."
      );
      await expect(cardNoUsername.validate()).rejects.toThrow(
        "'name', 'address', 'username', 'password', and 'email' are all required fields."
      );
      await expect(cardNopassword.validate()).rejects.toThrow(
        "'name', 'address', 'username', 'password', and 'email' are all required fields."
      );
      await expect(cardNoAddress.validate()).rejects.toThrow(
        "'name', 'address', 'username', 'password', and 'email' are all required fields."
      );
      await expect(cardNoEmail.validate()).rejects.toThrow(
        "'name', 'address', 'username', 'password', and 'email' are all required fields."
      );
    });

    it("should fail if the password is not 8-32 characters", async () => {
      const cardBadPassword1 = new Card({
        name: "name",
        username: "username",
        password: "12",
        email: "email@email.com",
        address: {},
        acceptTerms: true,
        birthdate: "01/01/1988",
        policy: Policy(),
      });
      const cardBadPassword2 = new Card({
        name: "name",
        username: "username",
        password: "12345",
        email: "email@email.com",
        address: {},
        acceptTerms: true,
        birthdate: "01/01/1988",
        policy: Policy(),
      });

      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
        },
      });
      const mockUsernameValidate = jest.fn().mockReturnValue({
        available: true,
        response: { message: "Available username" },
      });
      cardBadPassword1.address.validate = mockAddressValidate;
      cardBadPassword2.address.validate = mockAddressValidate;
      cardBadPassword1.checkValidUsername = mockUsernameValidate;
      cardBadPassword2.checkValidUsername = mockUsernameValidate;

      const result1 = await cardBadPassword1.validate();
      const result2 = await cardBadPassword2.validate();

      expect(result1.valid).toEqual(false);
      expect(result1.errors).toEqual({
        password:
          "Password should be 8-32 alphanumeric characters and should include a mixture of both uppercase and lowercase letters, include a mixture of letters and numbers, and have at least one special character. Please revise your password.",
      });
      expect(result2.valid).toEqual(false);
      expect(result2.errors).toEqual({
        password:
          "Password should be 8-32 alphanumeric characters and should include a mixture of both uppercase and lowercase letters, include a mixture of letters and numbers, and have at least one special character. Please revise your password.",
      });
    });

    it("should fail for webApplicant policies without a birthdate", async () => {
      const cardNoBirthdate = new Card({
        ...basicCard,
        birthdate: undefined,
        policy: Policy({ policyType: "webApplicant" }),
      });

      await expect(cardNoBirthdate.validate()).rejects.toThrow(
        "'birthdate' is a required field."
      );
    });

    it("should return a validated card", async () => {
      const card = new Card({
        ...basicCard,
        email: "email@email.com",
        policy: Policy({ policyType: "webApplicant" }),
      });
      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
        },
      });
      card.address.validate = mockAddressValidate;
      // Mock that the UsernameValidationAPI returned an error response:
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: true,
        response: { message: "Available username" },
      });
      const response = await card.validate();
      expect(response).toEqual({ valid: true, errors: {} });
    });

    it("should fail if the username is not valid", async () => {
      const card = new Card({
        ...basicCard,
        email: "test@email.com",
        address: new Address({ city: "Hoboken", state: "NJ" }),
        policy: Policy({ policyType: "webApplicant" }),
      });

      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
        },
      });
      card.address.validate = mockAddressValidate;
      // Mock that the UsernameValidationAPI returned an error response:
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: false,
        response: { message: "uhuh bad username" },
      });

      const result = await card.validate();

      expect(result.valid).toEqual(false);
      expect(result.errors).toEqual({
        username: "uhuh bad username",
      });
    });

    it("should fail if email is not valid", async () => {
      const card = new Card({
        ...basicCard,
        email: "badEmail",
        policy: Policy({ policyType: "webApplicant" }),
      });
      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
        },
      });
      card.address.validate = mockAddressValidate;
      // Mock that the UsernameValidationAPI returned an error response:
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: true,
        response: { message: "the username is valid" },
      });

      const result = await card.validate();

      expect(result.valid).toEqual(false);
      expect(result.errors).toEqual({
        email: "Email address must be valid.",
      });
    });

    // This is for the "webApplicant" policy type only.
    it("should fail if age is under 13", async () => {
      const card = new Card({
        ...basicCard,
        birthdate: "01/01/2020",
        email: "test@email.com",
        policy: Policy({ policyType: "webApplicant" }),
      });
      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
        },
      });
      card.address.validate = mockAddressValidate;
      // Mock that the UsernameValidationAPI returned an error response:
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: true,
        response: { message: "the username is valid" },
      });

      const result = await card.validate();
      const minimumAge = card.policy.policyField("minimumAge");
      expect(result.valid).toEqual(false);
      expect(result.errors).toEqual({
        birthdate: `Date of birth is below the minimum age of ${minimumAge}.`,
      });
    });

    it("should return a valid response and update internal values", async () => {
      const card = new Card({
        ...basicCard,
        address: new Address(
          {
            line1: "476 5th Ave",
            city: "New York",
            state: "NY",
            zip: "10018",
            isResidential: true,
            hasBeenValidated: true,
          },
          "soLicenseKey"
        ),
        location: "nyc",
        email: "test@email.com",
        policy: Policy({ policyType: "webApplicant" }),
      });
      // Mock that the UsernameValidationAPI returned an error response:
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: true,
        response: { message: "the username is valid" },
      });

      expect(card.ptype).toEqual(undefined);
      expect(card.expirationDate).toEqual(undefined);

      const result = await card.validate();
      expect(result.valid).toEqual(true);
      expect(card.ptype).toEqual(9);
      const now = new Date();
      const policyDays = card.getExpirationTime();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();
      const expirationDate = new Date(
        currentYear,
        currentMonth,
        currentDay + policyDays
      );
      expect(card.expirationDate).toEqual(expirationDate);
    });
  });

  describe("checkValidUsername", () => {
    const card = new Card(basicCard);

    it("doesn't call the UsernameValidationAPI if the username has already been validated", async () => {
      const cardWithUsername = new Card({
        ...basicCard,
        usernameHasBeenValidated: true,
      });

      const mockValidate = jest.fn().mockReturnValue(available);

      // Mocking that the ILS request returned false and username is invalid.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: mockValidate,
        responses: { available },
      }));

      const usernameAvailability = await cardWithUsername.checkValidUsername();
      expect(mockValidate).not.toHaveBeenCalled();
      expect(usernameAvailability.available).toEqual(true);
      expect(usernameAvailability.response).toEqual(available);
      mockValidate.mockClear();
    });

    it("returns an invalid username response", async () => {
      const mockValidate = jest.fn().mockReturnValue(invalid);
      // Mocking that the ILS request returned false and username is invalid.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: mockValidate,
        responses: { available },
      }));

      const usernameAvailability = await card.checkValidUsername();
      // The `UsernameValidationAPI.validate` function is now always called
      // since we now never set `usernameHasBeenValidated` to true. This holds
      // for the rest of the tests even though a spy isn't created.
      expect(mockValidate).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalledWith("username");
      expect(usernameAvailability.available).toEqual(false);
      expect(usernameAvailability.response).toEqual(invalid);
    });

    it("returns an unavailable username response", async () => {
      // Mocking that the ILS request returned false and username is unavailable.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => unavailable,
        responses: { available },
      }));

      const usernameAvailability = await card.checkValidUsername();
      expect(usernameAvailability.available).toEqual(false);
      expect(usernameAvailability.response).toEqual(unavailable);
    });

    it("returns a valid username response", async () => {
      // Mocking that the ILS request returned true and username is available.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => available,
        responses: { available },
      }));

      const usernameAvailability = await card.checkValidUsername();
      expect(usernameAvailability.available).toEqual(true);
      expect(usernameAvailability.response).toEqual(available);
    });

    it("throws an error if no ilsClient was passed to the Card object, which calls the Username Validation API", async () => {
      // The current Card object doesn't have an IlsClient. We are mocking here
      // that the `validate` function, which calls the ILS, throws an error.
      const noIlsClient = new NoILSClient(
        "ILS Client not set in Username Validation API."
      );
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => {
          throw noIlsClient;
        },
        responses: {},
      }));

      await expect(card.checkValidUsername()).rejects.toEqual(noIlsClient);
    });

    it("throws an error if the ILS could not be reached", async () => {
      const iLSIntegrationError = new ILSIntegrationError(
        "The ILS could not be requested when validating the username."
      );
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => {
          throw iLSIntegrationError;
        },
        responses: {},
      }));

      await expect(card.checkValidUsername()).rejects.toEqual(
        iLSIntegrationError
      );
    });
  });

  // For `requiredByPolicy`, a Card checks if its policy requires specific
  // fields, but not if the Card itself has those field values.
  describe("requiredByPolicy", () => {
    const simplyePolicy = Policy({ policyType: "simplye" });
    const webApplicant = Policy({ policyType: "webApplicant" });
    const simplyeJuvenile = Policy({ policyType: "simplyeJuvenile" });

    it("should check for ageGate for simplye policies", () => {
      const card = new Card({
        ...basicCard,
        policy: simplyePolicy,
      });

      expect(card.requiredByPolicy("ageGate")).toEqual(true);
      expect(card.requiredByPolicy("birthdate")).toEqual(false);
    });

    it("should check for birthdate for web applicant policies", () => {
      const card = new Card({
        ...basicCard,
        policy: webApplicant,
      });

      expect(card.requiredByPolicy("birthdate")).toEqual(true);
      expect(card.requiredByPolicy("ageGate")).toEqual(false);
    });

    it("should not check for any age validation fields for simplyeJuvenile policies", () => {
      const card = new Card({
        ...basicCard,
        policy: simplyeJuvenile,
      });

      expect(card.requiredByPolicy("ageGate")).toEqual(false);
      expect(card.requiredByPolicy("birthdate")).toEqual(false);
    });
  });

  // Do they have a work address and is it in NYC?
  describe("worksInNYCity", () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: "webApplicant" });
    const workAddressNotInNYCity = new Address(
      {
        line1: "street address",
        city: "Albany",
        state: "NY",
      },
      "soLicenseKey"
    );

    const workAddressInNYCity = new Address(
      {
        line1: "street address",
        city: "New York",
        state: "NY",
      },
      "soLicenseKey"
    );

    it("returns false for webApplicants if there is no work address or it's not in NYC or true if it is in NYC", () => {
      let card = new Card({
        ...basicCard,
        policy: webApplicant,
      });
      expect(card.worksInNYCity()).toEqual(false);

      card = new Card({
        ...basicCard,
        workAddress: workAddressNotInNYCity,
        policy: webApplicant,
      });
      expect(card.worksInNYCity()).toEqual(false);

      card = new Card({
        ...basicCard,
        workAddress: workAddressInNYCity,
        policy: webApplicant,
      });
      expect(card.worksInNYCity()).toEqual(true);
    });

    it("returns false for simplye if there is no work address or it's not in NYC or true if it is in NYC", () => {
      let card = new Card({
        ...basicCard,
        policy: simplyePolicy,
      });
      expect(card.worksInNYCity()).toEqual(false);

      card = new Card({
        ...basicCard,
        workAddress: workAddressNotInNYCity,
        policy: simplyePolicy,
      });
      expect(card.worksInNYCity()).toEqual(false);

      card = new Card({
        ...basicCard,
        workAddress: workAddressInNYCity,
        policy: simplyePolicy,
      });
      expect(card.worksInNYCity()).toEqual(true);
    });
  });

  // Are they in NY state?
  describe("livesInNYState", () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: "webApplicant" });
    const addressNotNY = new Address({ state: "NJ" }, "soLicenseKey");
    const addressNY = new Address({ state: "NY" }, "soLicenseKey");

    it("returns false if they are not in NY state", () => {
      const cardNotNYSimplye = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: simplyePolicy,
      });
      const cardNotNYWebApplicant = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: webApplicant,
      });

      expect(cardNotNYSimplye.livesInNYState()).toEqual(false);
      expect(cardNotNYWebApplicant.livesInNYState()).toEqual(false);
    });

    it("returns true if they are in NY state", () => {
      const cardNYSimplye = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });
      const cardNYWebApplicant = new Card({
        ...basicCard,
        address: addressNY,
        policy: webApplicant,
      });

      expect(cardNYSimplye.livesInNYState()).toEqual(true);
      expect(cardNYWebApplicant.livesInNYState()).toEqual(true);
    });
  });

  describe("validForIls", () => {
    it("should return false if the card is not valid", () => {
      const card = new Card(basicCard);

      // Defaults since the card wasn't validated.
      expect(card.valid).toEqual(false);
      expect(card.ptype).toEqual(undefined);
      expect(card.validForIls()).toEqual(false);
    });
    // A ptype is always added for valid cards.
    it("should return the ptype if the card is valid", async () => {
      AddressValidationAPI.mockImplementation(() => ({
        validate: () =>
          Promise.resolve({
            type: "valid-address",
            address: {
              line1: "476th 5th Ave.",
              city: "New York",
              state: "NY",
              zip: "10018",
              isResidential: true,
              hasBeenValidated: true,
            },
          }),
      }));
      const card = new Card({
        ...basicCard,
        address: new Address(
          {
            line1: "476th 5th Ave.",
            city: "New York",
            state: "NY",
            zip: "10018",
            isResidential: true,
            hasBeenValidated: true,
          },
          "soLicenseKey"
        ),
        location: "nyc",
        policy: Policy({ policyType: "webApplicant" }),
      });

      // Mock a call to the ILS.
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: true,
        response: available,
      });

      await card.validate();

      expect(card.valid).toEqual(true);
      expect(card.ptype).toEqual(9);
      expect(card.validForIls()).toEqual(true);
    });
  });

  describe("setBarcode", () => {
    beforeEach(() => {
      Barcode.mockClear();
    });

    it("should fail if no ptype or the wrong ptype is set", async () => {
      const mockNextBarcode = jest.fn(() => "1234");
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: mockNextBarcode,
      }));

      const card = new Card(basicCard);
      // This ptype cannot generate barcodes
      card.ptype = 2;
      // This card has no ptype.
      const card2 = new Card(basicCard);

      await expect(card.setBarcode()).rejects.toThrow(
        "No barcode can be generated for this ptype."
      );
      await expect(card2.setBarcode()).rejects.toThrow(
        "No barcode can be generated for this ptype."
      );
    });

    it("should set the barcode in the card object for the specific ptype", async () => {
      const mockNextBarcode = jest.fn((val) => `${val}1234`);
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: (val) => mockNextBarcode(val),
      }));

      const cardWith5s = new Card(basicCard);
      const cardWith8s = new Card(basicCard);

      // For web digital ptypes.
      cardWith5s.ptype = 7;
      await cardWith5s.setBarcode();

      expect(mockNextBarcode).toHaveBeenCalledWith("25555");
      expect(cardWith5s.barcode).toEqual("255551234");

      // For simplyeJuvenile accounts.
      cardWith8s.ptype = 4;
      await cardWith8s.setBarcode();

      expect(mockNextBarcode).toHaveBeenCalledWith("288888");
      expect(cardWith8s.barcode).toEqual("2888881234");
    });

    it("should throw an error if a barcode could not be generated", async () => {
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => undefined,
      }));

      const card = new Card(basicCard);
      card.ptype = 7;

      await expect(card.setBarcode()).rejects.toThrow(
        "Could not generate a new barcode. Please try again."
      );
    });
  });

  describe("freeBarcode", () => {
    beforeEach(() => {
      Barcode.mockClear();
    });
    it("should reset the barcode in the card object", async () => {
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => "1234",
        // Mocking calling the database and marking the barcode as unused.
        freeBarcode: () => "ok",
      }));

      const card = new Card(basicCard);
      card.ptype = 7;

      await card.setBarcode();
      expect(card.barcode).toEqual("1234");

      await card.freeBarcode();
      expect(card.barcode).toEqual("");
    });
  });

  describe("setPtype", () => {
    it("does not set a ptype for simplye applicants (for now)", () => {
      const simplye = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplye" }),
      });
      simplye.setPtype();
      expect(simplye.ptype).toEqual(undefined);
    });

    it("sets a ptype for simplye juvenile applicants", () => {
      const simplye = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplyeJuvenile" }),
      });
      simplye.setPtype();
      expect(simplye.ptype).toEqual(4);
    });

    it("sets the ptype for patrons who live in NYC", () => {
      const cardLivesInNYC = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "NY",
          isResidential: true,
          hasBeenValidated: true,
        }),
        location: "nyc",
        policy: Policy({ policyType: "webApplicant" }),
      });
      cardLivesInNYC.setPtype();
      expect(cardLivesInNYC.ptype).toEqual(9);
    });

    it("sets the ptype for patrons who don't live in NYC but work in NYC", () => {
      const cardWorksInNYC = new Card({
        ...basicCard,
        address: new Address({
          city: "Albany",
          state: "NY",
          isResidential: true,
          hasBeenValidated: true,
        }),
        workAddress: new Address({
          city: "Albany",
          state: "NY",
          isResidential: false,
          hasBeenValidated: true,
        }),
        location: "nys",
        policy: Policy({ policyType: "webApplicant" }),
      });
      cardWorksInNYC.setPtype();
      expect(cardWorksInNYC.ptype).toEqual(8);
    });

    it("sets the ptype for patrons who are outside of NYS", () => {
      const cardOutsideNYS = new Card({
        ...basicCard,
        address: new Address({
          city: "Hoboken",
          state: "NJ",
          isResidential: true,
          hasBeenValidated: true,
        }),
        location: "us",
        policy: Policy({ policyType: "webApplicant" }),
      });
      cardOutsideNYS.setPtype();
      expect(cardOutsideNYS.ptype).toEqual(7);
    });

    it("sets a temporary ptype for patrons who live outside the US", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "Berlin",
          state: "",
        }),
        location: "",
        policy: Policy({ policyType: "webApplicant" }),
      });
      card.setPtype();
      expect(card.ptype).toEqual(7);
    });
  });

  describe("setAgency", () => {
    const simplyePolicy = Policy({ policyType: "simplye" });
    const simplyeJuvenilePolicy = Policy({ policyType: "simplyeJuvenile" });
    const webApplicantPolicy = Policy({ policyType: "webApplicant" });
    const addressNY = new Address({ city: "New York City" });

    it("sets the agency for each policy type", () => {
      const web = new Card({
        ...basicCard,
        address: addressNY,
        policy: webApplicantPolicy,
      });
      const simplye = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });
      const simplyeJuvenile = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyeJuvenilePolicy,
      });

      web.setAgency();
      expect(web.agency).toEqual("198");

      simplye.setAgency();
      expect(simplye.agency).toEqual("202");

      simplyeJuvenile.setAgency();
      expect(simplyeJuvenile.agency).toEqual("202");
    });
  });

  describe("getExpirationTime", () => {
    it("returns expiration times for different ptypes", () => {
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplye" }),
      });

      // No ptype returns a temporary time.
      expect(card.getExpirationTime()).toEqual(14);
      // Web Digital Temporary is 14 days.
      card.ptype = 7;
      expect(card.getExpirationTime()).toEqual(14);
      // Web Digital Non-metro is 1 year
      card.ptype = 8;
      expect(card.getExpirationTime()).toEqual(365);
      // Web Digital Metro is 3 years
      card.ptype = 9;
      expect(card.getExpirationTime()).toEqual(1095);
      // WebApplicant is 90 days.
      card.ptype = 1;
      expect(card.getExpirationTime()).toEqual(90);
      // SimplyE Metro and Non-metro is 3 years
      card.ptype = 2;
      expect(card.getExpirationTime()).toEqual(1095);
      card.ptype = 3;
      expect(card.getExpirationTime()).toEqual(1095);
      // SimplyE Juvenile is 3 years
      card.ptype = 4;
      expect(card.getExpirationTime()).toEqual(1095);
    });
  });

  describe("setExpirationDate", () => {
    const card = new Card({
      ...basicCard,
      policy: Policy({ policyType: "webApplicant" }),
    });

    it("should set the expiration date to 90 days for ptypes 1 and 7", () => {
      const today = new Date(2020, 6, 1);
      const expirationDate = new Date(2020, 9, 1);
      const spy = jest
        .spyOn(global, "Date")
        .mockReturnValue(today)
        .mockReturnValue(expirationDate);

      card.ptype = 1;
      card.setExpirationDate();
      expect(card.expirationDate).toEqual(expirationDate);

      card.ptype = 7;
      card.setExpirationDate();
      expect(card.expirationDate).toEqual(expirationDate);
      spy.mockRestore();
    });

    it("should set the expiration date to 1 year for ptypes 8", () => {
      const today = new Date(2020, 6, 1);
      const expirationDate = new Date(2021, 6, 1);
      const spy = jest
        .spyOn(global, "Date")
        .mockReturnValue(today)
        .mockReturnValue(expirationDate);

      card.ptype = 8;
      card.setExpirationDate();
      expect(card.expirationDate).toEqual(expirationDate);
      spy.mockRestore();
    });

    it("should set the expiration date to 3 years for ptypes 2, 3, 4, and 9", () => {
      const today = new Date(2020, 6, 1);
      const expirationDate = new Date(2023, 6, 1);
      const spy = jest
        .spyOn(global, "Date")
        .mockReturnValue(today)
        .mockReturnValue(expirationDate);

      card.ptype = 2;
      card.setExpirationDate();
      expect(card.expirationDate).toEqual(expirationDate);
      card.ptype = 3;
      card.setExpirationDate();
      expect(card.expirationDate).toEqual(expirationDate);
      card.ptype = 4;
      card.setExpirationDate();
      expect(card.expirationDate).toEqual(expirationDate);
      card.ptype = 9;
      card.setExpirationDate();
      expect(card.expirationDate).toEqual(expirationDate);
      spy.mockRestore();
    });
  });

  describe("setPatronId", () => {
    const card = new Card(basicCard);

    it("should not set the id if there is no data object or link property", () => {
      card.setPatronId();
      expect(card.patronId).toEqual(undefined);

      card.setPatronId({});
      expect(card.patronId).toEqual(undefined);
    });

    it("should set the id from the link string", () => {
      const data = {
        link:
          "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/1234",
      };

      card.setPatronId(data);
      expect(card.patronId).toEqual(1234);
    });
  });

  describe("createIlsPatron", () => {
    beforeEach(() => {
      IlsClient.mockClear();
      Barcode.mockClear();
    });

    it("throws an error because the card is not valid", async () => {
      const card = new Card({
        ...basicCard,
        policy: Policy(),
      });

      await expect(card.createIlsPatron()).rejects.toThrow(
        "The card has not been validated or has no ptype."
      );
    });

    it("attempts to create a barcode", async () => {
      IlsClient.mockImplementation(() => ({
        createPatron: () => Promise.resolve({ data: { link: "some patron" } }),
      }));
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => "1234",
      }));
      const card = new Card({
        ...basicCard,
        location: "nyc",
        policy: Policy({ policyType: "webApplicant" }),
        ilsClient: IlsClient({}),
      });

      // Mocking this. Normally, we'd call .validate()
      card.valid = true;
      card.ptype = 9;

      const spy = jest.spyOn(card, "setBarcode");

      await card.createIlsPatron();
      expect(spy).toHaveBeenCalled();
      expect(card.barcode).toEqual("1234");
    });

    it("attempts to create a barcode but fails!", async () => {
      IlsClient.mockImplementation(() => ({
        createPatron: () => Promise.resolve({ data: { link: "some patron" } }),
      }));
      // Mocking that a barcode fails to be generated
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => undefined,
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplye" }),
        ilsClient: IlsClient({}),
      });

      // Mocking this. Normally, we'd call .validate()
      card.valid = true;
      card.ptype = 9;

      await expect(card.createIlsPatron()).rejects.toThrow(DatabaseError);
      await expect(card.createIlsPatron()).rejects.toThrowError(
        "Could not generate a new barcode. Please try again."
      );
    });

    it("attempts to create a patron but fails - ILS is down", async () => {
      const integrationError = new ILSIntegrationError(
        "The ILS could not be requested when attempting to create a patron."
      );
      // Mock that the ILS fails
      IlsClient.mockImplementation(() => ({
        createPatron: () => {
          throw integrationError;
        },
      }));
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => "1234",
        freeBarcode: () => true,
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplye" }),
        ilsClient: IlsClient(),
      });

      // Mocking this. Normally, we'd call .validate()
      card.valid = true;
      card.ptype = 9;

      const spySetBarcode = jest.spyOn(card, "setBarcode");
      const spyFreeBarcode = jest.spyOn(card, "freeBarcode");

      await expect(card.createIlsPatron()).rejects.toEqual(integrationError);
      // A barcode is set.
      expect(spySetBarcode).toHaveBeenCalled();
      // But since creating the patron failed, set that generated barcode as
      // available in the database.
      expect(spyFreeBarcode).toHaveBeenCalled();
    });

    it("creates a patron", async () => {
      // Mock that the ILS fails
      IlsClient.mockImplementation(() => ({
        createPatron: () => ({
          status: 200,
          data: {
            link: "ils-response-url",
          },
        }),
      }));
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => "1234",
        freeBarcode: () => true,
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplye" }),
        ilsClient: IlsClient(),
      });

      // Mocking this for now. Normally, we'd call .validate()
      card.valid = true;
      card.ptype = 9;

      const spy = jest.spyOn(card, "freeBarcode");
      const data = await card.createIlsPatron();
      // Everything was successful so the barcode is set to "used" in
      // the database.
      expect(spy).not.toHaveBeenCalled();
      expect(data.status).toEqual(200);
      expect(data.data).toEqual({ link: "ils-response-url" });
    });
  });

  describe("details", () => {
    const card = new Card({
      ...basicCard,
      address: new Address({
        city: "New York",
        state: "NY",
        isResidential: "true",
      }),
      policy: Policy({ policyType: "webApplicant" }),
    });

    // Mocked value
    card.barcode = "123456789";

    it("returns an object with basic details", () => {
      const details = card.details();

      expect(details.barcode).toEqual("123456789");
      expect(details.username).toEqual("username");
      expect(details.password).toEqual("MyLib1731@!");
    });

    it("adds the patron ID if it was created", () => {
      card.patronId = "456789";
      const details = card.details();

      expect(details.barcode).toEqual("123456789");
      expect(details.username).toEqual("username");
      expect(details.password).toEqual("MyLib1731@!");
      expect(details.patronId).toEqual("456789");
    });
  });

  describe("validateAddresses", () => {
    it("returns an error if there is no home address", async () => {
      const card = new Card({
        ...basicCard,
        address: undefined,
      });

      await card.validateAddresses();

      expect(card.errors).toEqual({
        address: "An address was not added to the card.",
      });
    });

    it("should call `validateAddress` twice for each address", async () => {
      const card = new Card({
        ...basicCard,
        address: new Address({ city: "Hoboken", state: "NJ" }, "soLicenseKey"),
        workAddress: new Address(
          { citY: "New York", state: "NY" },
          "soLicenseKey"
        ),
        policy: Policy({ policyType: "webApplicant" }),
      });
      const validateAddressSpy = jest.spyOn(card, "validateAddress");

      await card.validateAddresses();

      expect(validateAddressSpy).toHaveBeenCalledTimes(2);
      expect(validateAddressSpy).toHaveBeenCalledWith("address");
      expect(validateAddressSpy).toHaveBeenCalledWith("workAddress");
    });
  });

  describe("validateAddress", () => {
    it("should not call `address.validate` if the address has been validated", async () => {
      const validatedAddress = {
        name: "First Last",
        address: new Address(
          { line1: "476th 5th Ave.", city: "New York", hasBeenValidated: true },
          "soLicenseKey"
        ),
        username: "username",
        password: "MyLib1731@!",
        // required for web applicants
        birthdate: "01/01/1988",
      };
      const card = new Card({
        ...validatedAddress,
        policy: Policy(),
      });

      const oldValidate = card.address.validate;
      // The return value doesn't matter because we expect it to NOT be called.
      const mockValidate = jest.fn().mockReturnValue("doesn't matter");
      card.address.validate = mockValidate;

      await card.validateAddress("address");

      expect(mockValidate).not.toHaveBeenCalled();

      // Resetting or clearing the mock isn't working so restoring it this way:
      card.address.validate = oldValidate;
    });

    it("should throw an error if Service Objects threw an error", async () => {
      const card = new Card({
        ...basicCard,
        policy: Policy(),
      });

      const oldValidate = card.address.validate;
      // `address.validate()` calls Service Objects, but mock an error.
      const mockValidate = jest
        .fn()
        .mockRejectedValueOnce(new Error("Something happened in SO."));
      card.address.validate = mockValidate;

      await expect(card.validateAddress("address")).rejects.toThrow(
        "Something happened in SO."
      );
      expect(mockValidate).toHaveBeenCalled();

      // Resetting or clearing the mock isn't working so restoring it this way:
      card.address.validate = oldValidate;
    });

    it("should not update the errors object in the card if any errors are returned", async () => {
      const card = new Card({
        ...basicCard,
        workAddress: new Address({}, "soLicenseKey"),
        policy: Policy(),
      });

      // An error is caught and returned as an object, not as a thrown error.
      const jestMock = jest.fn().mockReturnValue({
        error: { message: "something bad happened" },
      });
      const oldValidate = card.address.validate;
      const oldWorkValidate = card.workAddress.validate;
      card.address.validate = jestMock;
      card.workAddress.validate = jestMock;

      expect(card.errors).toEqual({});

      // Check the card's `address` first.
      await card.validateAddress("address");
      // Address errors for cards are actually okay. Those errors are
      // looked over and a basic check to see if the address is in NYS and NYC
      // is performed. This is because Service Objects can return errors for a
      // bad address or can have an error in the API call. If any of that
      // happens, we can keep going and give the user a temporary card.
      expect(card.errors).toEqual({});

      // Messages get added to the `errors` object for each type of address
      // that was checked by the `validateAddress` method. Here we check
      // the card's `workAddress`.
      await card.validateAddress("workAddress");
      expect(card.errors).toEqual({});

      card.address.validate = oldValidate;
      card.workAddress.validate = oldWorkValidate;
    });

    it("should update the addresses based on typed and updated validated values", async () => {
      const card = new Card({
        ...basicCard,
        address: new Address({ city: "Woodside", state: "NY" }, "soLicenseKey"),
        workAddress: new Address(
          { city: "New York", state: "NY" },
          "soLicenseKey"
        ),
        policy: Policy(),
      });

      const mockAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "Woodside",
          state: "NY",
          zip: "11377",
          isResidential: true,
          hasBeenValidated: true,
        },
      });
      const mockWorkAddressValidate = jest.fn().mockReturnValue({
        address: {
          city: "New York",
          state: "NY",
          zip: "10018",
          isResidential: false,
          hasBeenValidated: true,
        },
      });

      // Mock these functions.
      card.address.validate = mockAddressValidate;
      card.workAddress.validate = mockWorkAddressValidate;

      // The original `address` and `workAddress` did not have a zip code
      // and both have `hasBeenValidated`=false.
      expect(card.address.address).toEqual({
        city: "Woodside",
        county: "",
        isResidential: false,
        line1: "",
        line2: "",
        state: "NY",
        zip: "",
      });
      expect(card.address.hasBeenValidated).toEqual(false);
      expect(card.workAddress.address).toEqual({
        city: "New York",
        county: "",
        isResidential: false,
        line1: "",
        line2: "",
        state: "NY",
        zip: "",
      });
      expect(card.workAddress.hasBeenValidated).toEqual(false);

      // Now call the validate function:
      await card.validateAddress("address");
      await card.validateAddress("workAddress");

      // We expect the `card.address` object to be updated to the validated
      // address that Service Objects returned through `address.validate`
      // which is the function we mocked.
      // What has changed is a new zip code, SO says it's residential only
      // for the home address, and it's now `hasBeenValidated` = true.
      expect(card.address.address).toEqual({
        city: "Woodside",
        county: "",
        isResidential: true,
        line1: "",
        line2: "",
        state: "NY",
        zip: "11377",
      });
      expect(card.address.hasBeenValidated).toEqual(true);
      expect(card.workAddress.address).toEqual({
        city: "New York",
        county: "",
        isResidential: false,
        line1: "",
        line2: "",
        state: "NY",
        zip: "10018",
      });
      expect(card.workAddress.hasBeenValidated).toEqual(true);
    });

    it("should return an error if multiple addresses are returned", async () => {
      const card = new Card({
        ...basicCard,
        address: new Address(
          {
            line1: "37 61",
            city: "New York",
            state: "NY",
          },
          "soLicenseKey"
        ),
        policy: Policy(),
      });

      const mockAddressValidate = jest.fn().mockReturnValue({
        addresses: [
          {
            line1: "37 W 61st St",
            line2: "",
            city: "New York",
            county: "New York",
            state: "NY",
            zip: "10023-7605",
            isResidential: false,
            hasBeenValidated: true,
          },
          {
            line1: "37 E 61st St",
            line2: "",
            city: "New York",
            county: "New York",
            state: "NY",
            zip: "10065-8006",
            isResidential: false,
            hasBeenValidated: true,
          },
        ],
      });

      // Mock these functions.
      card.address.validate = mockAddressValidate;

      expect(card.address.address).toEqual({
        city: "New York",
        county: "",
        isResidential: false,
        line1: "37 61",
        line2: "",
        state: "NY",
        zip: "",
      });
      expect(card.address.hasBeenValidated).toEqual(false);

      // Now call the validate function:
      await card.validateAddress("address");

      expect(card.address.address).toEqual({
        city: "New York",
        county: "",
        isResidential: false,
        line1: "37 61",
        line2: "",
        state: "NY",
        zip: "",
      });
      expect(card.address.hasBeenValidated).toEqual(false);
      expect(card.errors).toEqual({
        address: {
          cardType: null,
          detail:
            "The entered address is ambiguous and will not result in a library card.",
          addresses: [
            {
              line1: "37 W 61st St",
              line2: "",
              city: "New York",
              county: "New York",
              state: "NY",
              zip: "10023-7605",
              isResidential: false,
              hasBeenValidated: true,
            },
            {
              line1: "37 E 61st St",
              line2: "",
              city: "New York",
              county: "New York",
              state: "NY",
              zip: "10065-8006",
              isResidential: false,
              hasBeenValidated: true,
            },
          ],
        },
      });
    });
  });

  describe("validateBirthdate", () => {
    it("returns no errors if the policy does not require it", () => {
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplyeJuvenile" }),
      });

      card.validateBirthdate();

      expect(card.errors).toEqual({});
    });

    it("returns an error if the policy requires it and the birthdate is not valid", () => {
      // Only the "webApplicant" policy type requires a birthdate
      const card = new Card({
        ...basicCard,
        birthdate: "01/01/2014",
        policy: Policy({ policyType: "webApplicant" }),
      });

      card.validateBirthdate();

      expect(card.errors).toEqual({
        birthdate: "Date of birth is below the minimum age of 13.",
      });
    });

    it("returns no error if the birth date is valid", () => {
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "webApplicant" }),
      });

      card.validateBirthdate();

      expect(card.errors).toEqual({});
    });
  });
});
