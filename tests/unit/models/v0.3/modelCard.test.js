/* eslint-disable jest/no-disabled-tests */
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
    { line1: "476th 5th Ave.", city: "New York" },
    "soLicenseKey"
  ),
  username: "username",
  pin: "1234",
  // required for web applicants
  email: "test@test.com",
  birthdate: "01/01/1988",
  acceptTerms: true,
  ageGate: true,
};

// UsernameAvailabilityAPI constants
const available = {
  type: "available-username",
  cardType: "standard",
  message: "This username is available",
};
const unavailable = {
  type: "unavailable-username",
  cardType: null,
  message: "This username is unavailable. Please try another.",
};
const invalid = {
  type: "invalid-username",
  cardType: null,
  message:
    "Usernames should be 5-25 characters, letters or numbers only. Please revise your username.",
};

// describe("CardValidator", () => {
//   const cardValidator = CardValidator();
//   const {
//     validate,
//     validateAddress,
//     validateAddresses,
//     validateBirthdate,
//   } = cardValidator;

//   describe("validateBirthdate", () => {
//     it("returns no errors if the policy doesn't require it", () => {
//       const card = new Card({
//         ...basicCard,
//         policy: Policy({ policyType: "simplyeJuvenile" }),
//       });

//       const validatedCard = validateBirthdate(card);

//       expect(validatedCard.errors).toEqual({});
//     });

//     it("returns no errors if the policy requires it but the birthdate is valid", () => {
//       const card = new Card({
//         ...basicCard,
//         policy: Policy({ policyType: "webApplicant" }),
//       });

//       const validatedCard = validateBirthdate(card);

//       expect(validatedCard.errors).toEqual({});
//     });

//     it("returns an error if the policy requires it and the birthdate is not valid", () => {
//       // Only the "webApplicant" policy type requires a birthdate
//       const card = new Card({
//         ...basicCard,
//         birthdate: "01/01/2013",
//         policy: Policy({ policyType: "webApplicant" }),
//       });

//       const validatedCard = validateBirthdate(card);

//       expect(validatedCard.errors).toEqual({
//         age: "Date of birth is below the minimum age of 13.",
//       });
//     });
//   });

//   describe("validateAddress", () => {
//     it("should not call `address.validate` if the address has been validated", async () => {
//       const cardValidAddress = {
//         name: "First Last",
//         address: new Address(
//           { line1: "476th 5th Ave.", city: "New York", hasBeenValidated: true },
//           "soLicenseKey"
//         ),
//         username: "username",
//         pin: "1234",
//         // required for web applicants
//         birthdate: "01/01/1988",
//       };
//       const card = new Card({
//         ...cardValidAddress,
//         policy: Policy(),
//       });

//       const oldValidate = card.address.validate;
//       // The return value doesn't matter because we expect it to NOT be called.
//       const mockValidate = jest.fn().mockReturnValue("doesn't matter");
//       card.address.validate = mockValidate;

//       await validateAddress(card, "address");

//       expect(mockValidate).not.toHaveBeenCalled();

//       // Resetting or clearing the mock isn't working so restoring it this way:
//       card.address.validate = oldValidate;
//     });

//     it("should throw an error if Service Objects threw an error", async () => {
//       const card = new Card({
//         ...basicCard,
//         policy: Policy(),
//       });

//       const oldValidate = card.address.validate;
//       // `address.validate()` calls Service Objects, but mock an error.
//       const mockValidate = jest
//         .fn()
//         .mockRejectedValueOnce(new Error("Something happened in SO."));
//       card.address.validate = mockValidate;

//       await expect(validateAddress(card, "address")).rejects.toThrow(
//         "Something happened in SO."
//       );
//       // For the rest of the tests, since the `hasBeenValidated` flag is false,
//       // we expect the `address.validate` function to be called.
//       expect(mockValidate).toHaveBeenCalled();

//       // Resetting or clearing the mock isn't working so restoring it this way:
//       card.address.validate = oldValidate;
//     });

//     it("should not update the errors object in the card if any errors are returned", async () => {
//       const card = new Card({
//         ...basicCard,
//         workAddress: new Address({}, "soLicenseKey"),
//         policy: Policy(),
//       });

//       // An error is caught and returned as an object, not as a thrown error.
//       const jestMock = jest.fn().mockReturnValue({
//         error: { message: "something bad happened" },
//       });
//       const oldValidate = card.address.validate;
//       const oldWorkValidate = card.workAddress.validate;
//       card.address.validate = jestMock;
//       card.workAddress.validate = jestMock;

//       expect(card.errors).toEqual({});

//       // Check the card's `address` first.
//       await validateAddress(card, "address");
//       // Address errors for cards are actually okay. Those errors are
//       // looked over and a basic check to see if the address is in NYS and NYC
//       // is performed. This is because Service Objects can return errors for a
//       // bad address or can have an error in the API call. If any of that
//       // happens, we can keep going and give the user a temporary card.
//       expect(card.errors).toEqual({});

//       // Messages get added to the `errors` object for each type of address
//       // that was checked by the `validateAddress` method. Here we check
//       // the card's `workAddress`.
//       await validateAddress(card, "workAddress");
//       expect(card.errors).toEqual({});

//       card.address.validate = oldValidate;
//       card.workAddress.validate = oldWorkValidate;
//     });

//     it("should update the addresses based on typed and updated validated values", async () => {
//       const card = new Card({
//         ...basicCard,
//         address: new Address({ city: "Woodside", state: "NY" }, "soLicenseKey"),
//         workAddress: new Address(
//           { city: "New York", state: "NY" },
//           "soLicenseKey"
//         ),
//         policy: Policy(),
//       });

//       const mockAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "Woodside",
//           state: "NY",
//           zip: "11377",
//           isResidential: true,
//           hasBeenValidated: true,
//         },
//       });
//       const mockWorkAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "New York",
//           state: "NY",
//           zip: "10018",
//           isResidential: false,
//           hasBeenValidated: true,
//         },
//       });

//       // Mock these functions.
//       card.address.validate = mockAddressValidate;
//       card.workAddress.validate = mockWorkAddressValidate;

//       // The original `address` and `workAddress` did not have a zip code
//       // and both have `hasBeenValidated`=false.
//       expect(card.address.address).toEqual({
//         city: "Woodside",
//         county: "",
//         isResidential: false,
//         line1: "",
//         line2: "",
//         state: "NY",
//         zip: "",
//       });
//       expect(card.address.hasBeenValidated).toEqual(false);
//       expect(card.workAddress.address).toEqual({
//         city: "New York",
//         county: "",
//         isResidential: false,
//         line1: "",
//         line2: "",
//         state: "NY",
//         zip: "",
//       });
//       expect(card.workAddress.hasBeenValidated).toEqual(false);

//       // Now call the validate function:
//       await validateAddress(card, "address");
//       await validateAddress(card, "workAddress");

//       // We expect the `card.address` object to be updated to the validated
//       // address that Service Objects returned through `address.validate`
//       // which is the function we mocked.
//       // What has changed is a new zip code, SO says it's residential only
//       // for the home address, and it's now `hasBeenValidated` = true.
//       expect(card.address.address).toEqual({
//         city: "Woodside",
//         county: "",
//         isResidential: true,
//         line1: "",
//         line2: "",
//         state: "NY",
//         zip: "11377",
//       });
//       expect(card.address.hasBeenValidated).toEqual(true);
//       expect(card.workAddress.address).toEqual({
//         city: "New York",
//         county: "",
//         isResidential: false,
//         line1: "",
//         line2: "",
//         state: "NY",
//         zip: "10018",
//       });
//       expect(card.workAddress.hasBeenValidated).toEqual(true);
//     });

//     it("should return an error if multiple addresses are returned", async () => {
//       const card = new Card({
//         ...basicCard,
//         address: new Address(
//           {
//             line1: "37 61",
//             city: "New York",
//             state: "NY",
//           },
//           "soLicenseKey"
//         ),
//         policy: Policy(),
//       });

//       const mockAddressValidate = jest.fn().mockReturnValue({
//         addresses: [
//           {
//             line1: "37 W 61st St",
//             line2: "",
//             city: "New York",
//             county: "New York",
//             state: "NY",
//             zip: "10023-7605",
//             isResidential: false,
//             hasBeenValidated: true,
//           },
//           {
//             line1: "37 E 61st St",
//             line2: "",
//             city: "New York",
//             county: "New York",
//             state: "NY",
//             zip: "10065-8006",
//             isResidential: false,
//             hasBeenValidated: true,
//           },
//         ],
//       });

//       // Mock these functions.
//       card.address.validate = mockAddressValidate;

//       expect(card.address.address).toEqual({
//         city: "New York",
//         county: "",
//         isResidential: false,
//         line1: "37 61",
//         line2: "",
//         state: "NY",
//         zip: "",
//       });
//       expect(card.address.hasBeenValidated).toEqual(false);

//       // Now call the validate function:
//       await validateAddress(card, "address");

//       expect(card.address.address).toEqual({
//         city: "New York",
//         county: "",
//         isResidential: false,
//         line1: "37 61",
//         line2: "",
//         state: "NY",
//         zip: "",
//       });
//       expect(card.address.hasBeenValidated).toEqual(false);
//       expect(card.errors).toEqual({
//         address: {
//           detail:
//             "The entered address is ambiguous and will not result in a library card.",
//           addresses: [
//             {
//               line1: "37 W 61st St",
//               line2: "",
//               city: "New York",
//               county: "New York",
//               state: "NY",
//               zip: "10023-7605",
//               isResidential: false,
//               hasBeenValidated: true,
//             },
//             {
//               line1: "37 E 61st St",
//               line2: "",
//               city: "New York",
//               county: "New York",
//               state: "NY",
//               zip: "10065-8006",
//               isResidential: false,
//               hasBeenValidated: true,
//             },
//           ],
//         },
//       });
//     });
//   });

//   // This function updates the `card`'s `cardType response value calling
//   // `card.getCardType` which has its own set of tests. Only doing a couple
//   // here since more are covered in that set of tests.
//   describe("validateAddresses", () => {
//     it("returns an error if there is no home address", async () => {
//       const card = new Card({
//         ...basicCard,
//         address: undefined,
//       });

//       await validateAddresses(card);

//       expect(card.errors).toEqual({
//         address: "An address was not added to the card.",
//       });
//     });

//     it.skip("should update the cardType response to denied for an address not in NYS", async () => {
//       let card = new Card({
//         ...basicCard,
//         address: new Address({ city: "Hoboken", state: "NJ" }),
//         policy: Policy(),
//       });

//       const mockAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "Hoboken",
//           state: "NJ",
//           zip: "07030",
//           isResidential: true,
//           hasBeenValidated: true,
//         },
//       });
//       card.address.validate = mockAddressValidate;

//       expect(card.cardType).toEqual({});
//       // validateAddresses returns the `card` with updated values but the
//       // real change is in `card.cardType`.
//       card = await validateAddresses(card);
//       expect(card.cardType).toEqual({
//         cardType: null,
//         message:
//           "Library cards are only available for residents of New York State or students and commuters working in New York City.",
//       });
//     });

//     it("should update the cardType response to temporary for an address not in NYS but work address in NYC", async () => {
//       let card = new Card({
//         ...basicCard,
//         address: new Address({ city: "Hoboken", state: "NJ" }),
//         workAddress: new Address({ citY: "New York", state: "NY" }),
//         policy: Policy({ policyType: "simplye" }),
//       });

//       const mockAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "Hoboken",
//           state: "NJ",
//           zip: "07030",
//           isResidential: true,
//           hasBeenValidated: true,
//         },
//       });
//       const mockWorkAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "New York",
//           state: "NY",
//           zip: "10018",
//           isResidential: false,
//           hasBeenValidated: true,
//         },
//       });
//       card.address.validate = mockAddressValidate;
//       card.workAddress.validate = mockWorkAddressValidate;

//       expect(card.cardType).toEqual({});
//       // validateAddresses returns the `card` with updated values but the
//       // real change is in `card.cardType`.
//       card = await validateAddresses(card);
//       expect(card.cardType).toEqual({
//         cardType: "temporary",
//         message: "The library card will be a temporary library card.",
//         reason:
//           "The home address is not in New York State but the work address is in New York City.",
//       });
//     });
//   });

//   describe("validate", () => {
//     it("should fail if the username is not valid", async () => {
//       const card = new Card({
//         ...basicCard,
//         email: "test@email.com",
//         address: new Address({ city: "Hoboken", state: "NJ" }),
//         policy: Policy({ policyType: "simplye" }),
//       });

//       const mockAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "Woodside",
//           state: "NY",
//           zip: "11377",
//           isResidential: true,
//         },
//       });
//       card.address.validate = mockAddressValidate;
//       // Mock that the UsernameValidationAPI returned an error response:
//       card.checkValidUsername = jest.fn().mockReturnValue({
//         available: false,
//         response: { message: "uhuh bad username" },
//       });

//       const result = await validate(card);

//       expect(result).toEqual({
//         card,
//         valid: false,
//       });
//       expect(result.card.errors).toEqual({
//         username: "uhuh bad username",
//       });
//     });

//     it("should fail if email is not valid", async () => {
//       const card = new Card({
//         ...basicCard,
//         email: "test@",
//         policy: Policy({ policyType: "simplye" }),
//       });
//       const mockAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "Woodside",
//           state: "NY",
//           zip: "11377",
//           isResidential: true,
//         },
//       });
//       card.address.validate = mockAddressValidate;
//       // Mock that the UsernameValidationAPI returned an error response:
//       card.checkValidUsername = jest.fn().mockReturnValue({
//         available: true,
//         response: { message: "the username is valid" },
//       });

//       const result = await validate(card);

//       expect(result).toEqual({
//         card,
//         valid: false,
//       });
//       expect(result.card.errors).toEqual({
//         email: "Email address must be valid",
//       });
//     });

//     // This is for the "webApplicant" policy type only.
//     it("should fail if age is under 13", async () => {
//       const card = new Card({
//         ...basicCard,
//         birthdate: "01/01/2010",
//         email: "test@email.com",
//         policy: Policy({ policyType: "webApplicant" }),
//       });
//       const mockAddressValidate = jest.fn().mockReturnValue({
//         address: {
//           city: "Woodside",
//           state: "NY",
//           zip: "11377",
//           isResidential: true,
//         },
//       });
//       card.address.validate = mockAddressValidate;
//       // Mock that the UsernameValidationAPI returned an error response:
//       card.checkValidUsername = jest.fn().mockReturnValue({
//         available: true,
//         response: { message: "the username is valid" },
//       });

//       const result = await validate(card);
//       const minimumAge = card.policy.policyField("minimumAge");
//       expect(result).toEqual({
//         card,
//         valid: false,
//       });
//       expect(result.card.errors).toEqual({
//         age: `Date of birth is below the minimum age of ${minimumAge}.`,
//       });
//     });

//     it("should fail if there is no home address", async () => {
//       const card = new Card({
//         ...basicCard,
//         address: undefined,
//         email: "test@email.com",
//         policy: Policy({ policyType: "simplye" }),
//       });
//       // Mock that the UsernameValidationAPI returned an error response:
//       card.checkValidUsername = jest.fn().mockReturnValue({
//         available: true,
//         response: { message: "the username is valid" },
//       });

//       const result = await validate(card);
//       expect(result).toEqual({
//         card,
//         valid: false,
//       });
//       expect(result.card.errors).toEqual({
//         address: "An address was not added to the card.",
//       });
//     });

//     it("should return a valid response along with the card if all the values are correct", async () => {
//       const card = new Card({
//         ...basicCard,
//         email: "test@email.com",
//         policy: Policy({ policyType: "simplye" }),
//       });
//       // Mock that the UsernameValidationAPI returned an error response:
//       card.checkValidUsername = jest.fn().mockReturnValue({
//         available: true,
//         response: { message: "the username is valid" },
//       });

//       const result = await validate(card);
//       expect(result).toEqual({
//         card,
//         valid: true,
//       });
//     });
//   });
// });

describe.skip("Card", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    UsernameValidationAPI.mockClear();
    AddressValidationAPI.mockClear();
    IlsClient.mockClear();
  });

  describe("Init", () => {
    it("should set homeLibraryCard to 'eb' by default", () => {
      // `basicCard` does not have a homeLibraryCard value.
      let card = new Card(basicCard);

      expect(card.homeLibraryCode).toEqual("eb");

      // but if you set one, it'll be used
      card = new Card({
        name: "First Last",
        address: new Address(
          { line1: "476th 5th Ave.", city: "New York" },
          "soLicenseKy"
        ),
        username: "username",
        pin: "1234",
        // required for web applicants
        birthdate: "01/01/1988",
        // random library code
        homeLibraryCode: "aa",
      });

      expect(card.homeLibraryCode).toEqual("aa");
    });
  });

  describe("validate", () => {
    it("should fail if the terms of condition flag is not set to true", async () => {
      const cardNoAcceptTerms = new Card({});
      await expect(cardNoAcceptTerms.validate()).rejects.toThrow(
        "The terms and conditions were not accepted."
      );
    });

    it("should fail if the age gate flag is not true for simplye policy type", async () => {
      const cardNoAgeGate = new Card({
        acceptTerms: true,
        policy: Policy({ policyType: "simplye" }),
      });
      const cardNoAgeGateIsOkay = new Card({
        acceptTerms: true,
        policy: Policy({ policyType: "webApplicant" }),
      });

      await expect(cardNoAgeGate.validate()).rejects.toThrow(
        "You must be 13 years or older to continue."
      );
      // We expect the age gate check to pass but not the rest of the checks
      // which happen after.
      await expect(cardNoAgeGateIsOkay.validate()).rejects.toThrow(
        "'name', 'address', 'username', and 'pin' are all required."
      );
    });

    it("accepts a boolean or string set to true for the accept terms flag", async () => {
      const cardAcceptBool = new Card({
        name: "Tom",
        username: "username",
        pin: "1234",
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
        pin: "1234",
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
        pin: "1234",
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
        pin: "1234",
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

    it("should fail if there are no name, username, pin, or address values", async () => {
      const cardNoName = new Card({
        name: "",
        username: "username",
        pin: "1234",
        address: {},
        acceptTerms: true,
      });
      const cardNoUsername = new Card({
        name: "name",
        username: "",
        pin: "1234",
        address: {},
        acceptTerms: true,
      });
      const cardNoPin = new Card({
        name: "name",
        username: "username",
        pin: "",
        address: {},
        acceptTerms: true,
      });
      const cardNoAddress = new Card({
        name: "name",
        username: "username",
        pin: "1234",
        address: undefined,
        acceptTerms: true,
      });

      await expect(cardNoName.validate()).rejects.toThrow(
        "'name', 'address', 'username', and 'pin' are all required."
      );
      await expect(cardNoUsername.validate()).rejects.toThrow(
        "'name', 'address', 'username', and 'pin' are all required."
      );
      await expect(cardNoPin.validate()).rejects.toThrow(
        "'name', 'address', 'username', and 'pin' are all required."
      );
      await expect(cardNoAddress.validate()).rejects.toThrow(
        "'name', 'address', 'username', and 'pin' are all required."
      );
    });

    it("should fail if the pin is not 4 digits", async () => {
      const cardBadPin1 = new Card({
        name: "name",
        username: "username",
        pin: "12",
        address: {},
        acceptTerms: true,
      });
      const cardBadPin2 = new Card({
        name: "name",
        username: "username",
        pin: "12345",
        address: {},
        acceptTerms: true,
      });

      await expect(cardBadPin1.validate()).rejects.toThrow(
        "PIN should be 4 numeric characters only. Please revise your PIN."
      );
      await expect(cardBadPin2.validate()).rejects.toThrow(
        "PIN should be 4 numeric characters only. Please revise your PIN."
      );
    });

    it("should fail for simplye policies without an email", async () => {
      const cardNoEmail = new Card({
        ...basicCard,
        email: undefined,
        policy: Policy({ policyType: "simplye" }),
      });

      await expect(cardNoEmail.validate()).rejects.toThrow(
        "email cannot be empty for this policy type."
      );
    });
    it("should fail for webApplicant policies without a birthdate or email", async () => {
      const cardNoEmail = new Card({
        ...basicCard,
        email: undefined,
        policy: Policy({ policyType: "webApplicant" }),
      });
      const cardNoBirthdate = new Card({
        ...basicCard,
        birthdate: undefined,
        policy: Policy({ policyType: "webApplicant" }),
      });

      await expect(cardNoEmail.validate()).rejects.toThrow(
        "email cannot be empty for this policy type."
      );
      await expect(cardNoBirthdate.validate()).rejects.toThrow(
        "birthdate cannot be empty for this policy type."
      );
    });

    // Internally, `card.validate` calls `CardValidator.validate` which is
    // tested in-depth above.
    it("should return a validated card", async () => {
      const card = new Card({
        ...basicCard,
        email: "email@email.com",
        policy: Policy({ policyType: "simplye" }),
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
  });
  describe("getOrCreateAddress", () => {
    const soLicenseKey = "soLicenseKey";
    const rawAddress = {
      line1: "476 5th Avenue",
      city: "Woodside",
      state: "NY",
      zip: "10018",
    };
    const address = new Address(rawAddress, soLicenseKey);
    const card = new Card(basicCard);

    it("should returned undefined if no arguments were passed", () => {
      expect(card.getOrCreateAddress()).toEqual(undefined);
    });

    it("create a new Address object is an Address instance isn't passed", () => {
      const addressInstance = card.getOrCreateAddress(rawAddress);
      expect(addressInstance instanceof Address).toEqual(true);
    });

    it("if an existing Address object is passed, just return it", () => {
      const addressInstance = card.getOrCreateAddress(address);
      expect(addressInstance).toEqual(address);
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
  // fields, but not if the Card itself has those field attributes.
  describe("requiredByPolicy", () => {
    const simplyePolicy = Policy({ policyType: "simplye" });
    const webApplicant = Policy({ policyType: "webApplicant" });
    const simplyeJuvenile = Policy({ policyType: "simplyeJuvenile" });

    it("should check for email, barcode, and ageGate for simplye policies", () => {
      const card = new Card({
        ...basicCard,
        policy: simplyePolicy,
      });

      expect(card.requiredByPolicy("email")).toEqual(true);
      expect(card.requiredByPolicy("barcode")).toEqual(true);
      expect(card.requiredByPolicy("ageGate")).toEqual(true);
      expect(card.requiredByPolicy("birthdate")).toEqual(false);
    });

    it("should check for birthdate for web applicant policies", () => {
      const card = new Card({
        ...basicCard,
        policy: webApplicant,
      });

      expect(card.requiredByPolicy("barcode")).toEqual(true);
      expect(card.requiredByPolicy("email")).toEqual(true);
      expect(card.requiredByPolicy("birthdate")).toEqual(true);
      expect(card.requiredByPolicy("ageGate")).toEqual(false);
    });

    it("should check for barcode for simplyeJuvenile policies", () => {
      const card = new Card({
        ...basicCard,
        policy: simplyeJuvenile,
      });

      expect(card.requiredByPolicy("email")).toEqual(true);
      expect(card.requiredByPolicy("barcode")).toEqual(true);
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
        state: "New York",
      },
      "soLicenseKey"
    );

    const workAddressInNYCity = new Address(
      {
        line1: "street address",
        city: "New York",
        state: "New York",
      },
      "soLicenseKey"
    );

    it("returns false for web applications without a work address", () => {
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

    it("returns false because there is no work address", () => {
      const card = new Card({
        ...basicCard,
        policy: simplyePolicy,
      });
      expect(card.worksInNYCity()).toEqual(false);
    });

    it("returns false if there is a work address but not in the city", () => {
      const card = new Card({
        ...basicCard,
        workAddress: workAddressNotInNYCity,
        policy: simplyePolicy,
      });
      expect(card.worksInNYCity()).toEqual(false);
    });

    it("returns true if there is a work address and it is in the city", () => {
      const card = new Card({
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
    const addressNotNY = new Address({ state: "New Jersey" }, "soLicenseKey");
    const addressNY = new Address({ state: "New York" }, "soLicenseKey");

    it("returns false for web applicants if they are not in NY state", () => {
      const cardNotNY = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: webApplicant,
      });
      const cardNY = new Card({
        ...basicCard,
        address: addressNY,
        policy: webApplicant,
      });

      expect(cardNotNY.livesInNYState()).toEqual(false);
      expect(cardNY.livesInNYState()).toEqual(true);
    });

    it("returns false for simplye applicants if they are not in NY state", () => {
      const cardNotNY = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: simplyePolicy,
      });

      expect(cardNotNY.livesInNYState()).toEqual(false);
    });

    it("returns true if they are in NY state", () => {
      const cardNY = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });

      expect(cardNY.livesInNYState()).toEqual(true);
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
    it.skip("should return the ptype if the card is valid", async () => {
      AddressValidationAPI.mockImplementation(() => ({
        validate: () =>
          Promise.resolve({
            type: "valid-address",
            address: {
              line1: "476th 5th Ave.",
              city: "New York",
              hasBeenValidated: true,
            },
          }),
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "webApplicant" }),
      });

      // Mock a call to the ILS.
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: true,
        response: available,
      });

      // This sets the `valid` flag to true but a ptype wasn't set.
      await card.validate();

      expect(card.valid).toEqual(true);
      expect(card.ptype).toEqual(1);
      expect(card.validForIls()).toEqual(true);
    });
    it.skip("should return true if the card is valid and there is a ptype", async () => {
      // Let's create basic inputs.
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "webApplicant" }),
      });

      // Mock a call to the ILS.
      card.checkValidUsername = jest.fn().mockReturnValue({
        available: true,
        response: available,
      });
      // Let's try to validate the inputs.
      await card.validate();
      // When creating a patron in the ILS, the ptype is set before checking
      // if the card is valid for the ILS. Calling it here directly.
      card.setPtype();

      // Since it's a 'webApplicant', the pytpe is 2
      expect(card.valid).toEqual(true);
      expect(card.ptype).toEqual(1);
      expect(card.validForIls()).toEqual(true);
    });
  });

  describe("setBarcode", () => {
    beforeEach(() => {
      Barcode.mockClear();
    });
    it("should set the barcode in the card object", async () => {
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => "1234",
      }));

      const card = new Card(basicCard);

      await card.setBarcode();

      expect(card.barcode).toEqual("1234");
    });

    it("should throw an error if a barcode could not be generated", async () => {
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => undefined,
      }));

      const card = new Card(basicCard);

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

      await card.setBarcode();
      expect(card.barcode).toEqual("1234");

      await card.freeBarcode();
      expect(card.barcode).toEqual("");
    });
  });

  describe("setPtype", () => {
    const simplyePolicy = Policy({ policyType: "simplye" });
    // const webApplicant = Policy({ policyType: "webApplicant" });
    // const addressNotNY = new Address({ state: "New Jersey" });
    const addressNY = new Address({ city: "New York City" });

    it.skip("sets the ptype for patrons who live or work in NYC", () => {
      const cardInNYC = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });

      const cardWorksInNYC = new Card({
        ...basicCard,
        address: new Address({ city: "Albany" }),
        workAddress: addressNY,
        policy: simplyePolicy,
      });

      // patrons in the metro area are ptype of "2"
      cardInNYC.setPtype();
      expect(cardInNYC.ptype).toEqual(2);
      cardWorksInNYC.setPtype();
      expect(cardWorksInNYC.ptype).toEqual(2);
    });

    it.skip("sets the ptype for patrons who live in NY state but not NYC", () => {
      const cardNYState = new Card({
        ...basicCard,
        address: new Address({ state: "New York" }),
        policy: simplyePolicy,
      });

      // patrons in the NY state area are ptype of "3"
      cardNYState.setPtype();
      expect(cardNYState.ptype).toEqual(3);
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
    it("returns an expiration time for simplye policy", () => {
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplye" }),
      });

      // A standard card has an expiration of 3 years or 1095 days.
      expect(card.getExpirationTime()).toEqual(1095);
    });
  });

  describe("setExpirationDate", () => {
    const simplyeCard = new Card({
      ...basicCard,
      policy: Policy({ policyType: "simplye" }),
    });
    const webCard = new Card({
      ...basicCard,
      policy: Policy({ policyType: "webApplicant" }),
    });

    it("should set the temporary expiration date to 30 days for simplye policy", () => {
      const today = new Date(2020, 6, 1);
      const expirationDate = new Date(2020, 6, 1 + 30);
      const spy = jest
        .spyOn(global, "Date")
        .mockReturnValueOnce(today)
        .mockReturnValueOnce(expirationDate);

      simplyeCard.setExpirationDate();
      expect(simplyeCard.expirationDate).toEqual(expirationDate);
      spy.mockRestore();
    });

    it("should set the standard expiration date to 3 years for simplye policy", () => {
      const today = new Date(2020, 6, 1);
      const expirationDate = new Date(2023, 7, 1);
      const spy = jest
        .spyOn(global, "Date")
        .mockReturnValue(today)
        .mockReturnValue(expirationDate);

      simplyeCard.setExpirationDate();
      expect(simplyeCard.expirationDate).toEqual(expirationDate);
      spy.mockRestore();
    });

    it("should set the temporary expiration date to 90 days for webApplicant policy", () => {
      const today = new Date(2020, 6, 1);
      const expirationDate = new Date(2020, 9, 1);
      const spy = jest
        .spyOn(global, "Date")
        .mockReturnValue(today)
        .mockReturnValue(expirationDate);

      webCard.setExpirationDate();
      expect(webCard.expirationDate).toEqual(expirationDate);
      spy.mockRestore();
    });

    it("should set the standard expiration date to 90 years for webApplicant policy", () => {
      const today = new Date(2020, 6, 1);
      const expirationDate = new Date(2023, 9, 1);
      const spy = jest
        .spyOn(global, "Date")
        .mockReturnValue(today)
        .mockReturnValue(expirationDate);

      webCard.setExpirationDate();
      expect(webCard.expirationDate).toEqual(expirationDate);
      spy.mockRestore();
    });
  });

  describe("getCardType", () => {
    const simplyePolicy = Policy({ policyType: "simplye" });
    const simplyeJuvenilePolicy = Policy({ policyType: "simplyeJuvenile" });
    const addressNotNY = new Address({ city: "Hoboken", state: "New Jersey" });

    it("always returns a standard 3-year card for 'simplyeJuvenile' accounts", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "New York",
          isResidential: false,
        }),
        policy: simplyeJuvenilePolicy,
      });
      expect(card.getCardType()).toEqual({
        ...Card.RESPONSES.standardCard,
      });
    });

    it("returns a temporary card for web applicants out of NYS or not residential but in NYS", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "New York",
          isResidential: false,
        }),
        policy: Policy({ policyType: "webApplicant" }),
      });
      const cardNotNY = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: Policy({ policyType: "webApplicant" }),
      });

      expect(card.getCardType()).toEqual(Card.RESPONSES.temporaryCard);
      expect(cardNotNY.getCardType()).toEqual(Card.RESPONSES.temporaryCard);
    });

    it("returns a card denied response if the address is not in NYS and there is no work address", () => {
      const card = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: simplyePolicy,
      });

      // The card is denied since the address is not in NYS.
      expect(card.getCardType()).toEqual(Card.RESPONSES.cardDenied);
    });
    it("returns a card denied response if the address and work address are not in NYS", () => {
      const workAddressNotInNYC = new Address({
        city: "Hoboken",
        state: "New Jersey",
      });
      const card = new Card({
        ...basicCard,
        address: addressNotNY,
        workAddress: workAddressNotInNYC,
        policy: simplyePolicy,
      });

      expect(card.getCardType()).toEqual(Card.RESPONSES.cardDenied);
    });

    it("returns a temporary card if the home address is not in NYS but the work address is in NYC", () => {
      const card = new Card({
        ...basicCard,
        address: addressNotNY,
        workAddress: new Address({ city: "New York", state: "NY" }),
        policy: simplyePolicy,
      });

      expect(card.getCardType()).toEqual({
        ...Card.RESPONSES.temporaryCard,
        reason:
          "The home address is not in New York State but the work address is in New York City.",
      });
    });

    it("returns a temporary card for non-residential home addresses", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "New York",
          isResidential: false,
        }),
        policy: simplyePolicy,
      });

      expect(card.getCardType()).toEqual({
        ...Card.RESPONSES.temporaryCard,
        reason: "The home address is in NYC but is not residential.",
      });
    });

    it("returns a standard card", () => {
      const workAddressNotInNYC = new Address({ city: "Hoboken", state: "NY" });
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "New York",
          isResidential: "true",
        }),
        policy: simplyePolicy,
      });
      const cardWithAddress = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "New York",
          isResidential: "true",
        }),
        workAddress: workAddressNotInNYC,
        policy: simplyePolicy,
      });

      expect(card.getCardType()).toEqual(Card.RESPONSES.standardCard);
      // It doens't matter if they have a work address outside NYC. The
      // patron lives in NYC so they get a standard card.
      expect(cardWithAddress.getCardType()).toEqual(
        Card.RESPONSES.standardCard
      );
    });
  });

  describe("normalizedBirthdate", () => {
    const card = new Card(basicCard);
    it("should return undefined if nothing is passed", () => {
      expect(card.normalizedBirthdate()).toEqual(undefined);
    });
    it("should return a new date object", () => {
      const date = "01/01/1988";
      expect(card.normalizedBirthdate(date)).toEqual(new Date(date));
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

      card.setPatronId();
      expect(card.patronId).toEqual(undefined);

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

    it("attempts to create a barcode for web applicants", async () => {
      IlsClient.mockImplementation(() => ({
        createPatron: () => Promise.resolve({ data: { link: "some patron" } }),
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "webApplicant" }),
        ilsClient: IlsClient({}),
      });

      // Mocking this. Normally, we'd call .validate()
      card.valid = true;
      card.setPtype();

      // Set up a spy for card.setBarcode() which shouldn't be called.
      const spy = jest.spyOn(card, "setBarcode");

      await card.createIlsPatron();
      expect(spy).toHaveBeenCalled();
    });

    it.skip("attempts to create a barcode for simplye applicants", async () => {
      IlsClient.mockImplementation(() => ({
        createPatron: () => Promise.resolve({ data: { link: "some patron" } }),
      }));
      // Mocking that a barcode fails to be generated
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => "1234",
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: "simplye" }),
        ilsClient: IlsClient({}),
      });

      // Mocking this. Normally, we'd call `card.validate()`.
      card.valid = true;
      card.setPtype();

      // Set up a spy for card.setBarcode() which shouldn't be called.
      const spy = jest.spyOn(card, "setBarcode");

      await card.createIlsPatron();
      expect(card.barcode).toEqual("1234");
      expect(spy).toHaveBeenCalled();
    });

    it.skip("attempts to create a barcode but fails!", async () => {
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
      card.setPtype();

      await expect(card.createIlsPatron()).rejects.toThrow(DatabaseError);
      await expect(card.createIlsPatron()).rejects.toThrowError(
        "Could not generate a new barcode. Please try again."
      );
    });

    it.skip("attempts to create a patron but fails", async () => {
      const integrationError = new ILSIntegrationError(
        "The ILS could not be requested when attempting to create a patron."
      );
      // Mock that the ILS fails
      IlsClient.mockImplementation(() => ({
        createPatron: () => {
          throw integrationError;
        },
      }));
      // Mocking that a barcode fails to be generated
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
      card.setPtype();

      const spy = jest.spyOn(card, "freeBarcode");

      await expect(card.createIlsPatron()).rejects.toEqual(integrationError);
      expect(spy).toHaveBeenCalled();
    });

    it.skip("creates a patron", async () => {
      // Mock that the ILS fails
      IlsClient.mockImplementation(() => ({
        createPatron: () => ({
          status: 200,
          data: {
            link: "ils-response-url",
          },
        }),
      }));
      // Mocking that a barcode fails to be generated
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
      card.setPtype();

      const spy = jest.spyOn(card, "freeBarcode");

      const data = await card.createIlsPatron();

      expect(spy).not.toHaveBeenCalled();
      expect(data.status).toEqual(200);
      expect(data.data).toEqual({ link: "ils-response-url" });
    });
  });

  // Mock values for now
  describe("details", () => {
    const simplyePolicy = Policy({ policyType: "simplye" });
    const card = new Card({
      ...basicCard,
      address: new Address({
        city: "New York",
        state: "New York",
        isResidential: "true",
      }),
      policy: simplyePolicy,
    });

    // Mocked value
    card.barcode = "123456789";

    it("returns an object with basic details", () => {
      card.cardType = card.getCardType();
      const details = card.details();

      expect(details.barcode).toEqual("123456789");
      expect(details.username).toEqual("username");
      expect(details.pin).toEqual("1234");
      expect(details.temporary).toEqual(false);
      expect(details.detail).toEqual(
        "The library card will be a standard library card."
      );
    });

    it("adds the patron ID if it was created", () => {
      // mocked for now
      card.patronId = "123456789";
      card.cardType = card.getCardType();
      const details = card.details();

      expect(details.barcode).toEqual("123456789");
      expect(details.username).toEqual("username");
      expect(details.pin).toEqual("1234");
      expect(details.temporary).toEqual(false);
      expect(details.detail).toEqual(
        "The library card will be a standard library card."
      );
      expect(details.patronId).toEqual("123456789");
    });

    it("returns a temporary card message", () => {
      card.cardType = card.getCardType();
      const details = card.details();

      expect(details.barcode).toEqual("123456789");
      expect(details.username).toEqual("username");
      expect(details.pin).toEqual("1234");
      expect(details.temporary).toEqual(true);
      expect(details.detail).toEqual(
        "The library card will be a standard library card.  Visit your local NYPL branch within 30 days to upgrade to a standard card."
      );
    });
  });

  // Returns the type of card created and a reason if it's temporary or denied.
  describe("selectMessage", () => {
    const simplyePolicy = Policy({ policyType: "simplye" });

    it("returns a valid created card message", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "New York",
          isResidential: "true",
        }),
        policy: simplyePolicy,
      });

      card.cardType = card.getCardType();
      expect(card.selectMessage()).toEqual(
        "The library card will be a standard library card."
      );
    });

    it("returns a temporary card for web applicants not in NYS", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "Hoboken",
          state: "NJ",
        }),
        policy: Policy({ policyType: "webApplicant" }),
      });

      card.setPtype();
      card.cardType = card.getCardType();
      expect(card.selectMessage()).toEqual(
        "The library card will be a temporary library card.  Visit your local NYPL branch within 90 days to upgrade to a standard card."
      );
    });

    it("returns a temporary card message since the home address is outside NYS but the work address is in NYC", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "Hoboken",
          state: "NJ",
        }),
        workAddress: new Address({ city: "New York", state: "NY" }),
        policy: simplyePolicy,
      });

      card.cardType = card.getCardType();
      expect(card.selectMessage()).toEqual(
        "The library card will be a temporary library card. The home address is not in New York State but the work address is in New York City. Visit your local NYPL branch within 30 days to upgrade to a standard card."
      );
    });

    it("returns a temporary card for non-residential home addresses", () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: "New York",
          state: "New York",
          isResidential: false,
        }),
        policy: simplyePolicy,
      });

      card.cardType = card.getCardType();
      expect(card.selectMessage()).toEqual(
        "The library card will be a temporary library card. The home address is in NYC but is not residential. Visit your local NYPL branch within 30 days to upgrade to a standard card."
      );
    });

    it("returns a card denied response if the address is not in NYS and there is no work address", () => {
      const addressNotInNYS = new Address({
        city: "Hoboken",
        state: "New Jersey",
      });
      const card = new Card({
        ...basicCard,
        address: addressNotInNYS,
        policy: simplyePolicy,
      });

      card.cardType = card.getCardType();
      expect(card.selectMessage()).toEqual(
        "Library cards are only available for residents of New York State or students and commuters working in New York City.  Visit your local NYPL branch within 30 days to upgrade to a standard card."
      );
    });

    it("returns a card denied response if the address and work address are not in NYS", () => {
      const addressNotInNYS = new Address({
        city: "Hoboken",
        state: "New Jersey",
      });
      const card = new Card({
        ...basicCard,
        address: addressNotInNYS,
        workAddressNotInNYCity: addressNotInNYS,
        policy: simplyePolicy,
      });

      card.cardType = card.getCardType();
      expect(card.selectMessage()).toEqual(
        "Library cards are only available for residents of New York State or students and commuters working in New York City.  Visit your local NYPL branch within 30 days to upgrade to a standard card."
      );
    });
  });
});
