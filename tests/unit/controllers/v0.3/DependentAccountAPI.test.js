const DependentAccountAPI = require("../../../../api/controllers/v0.3/DependentAccountAPI");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const { PatronNotFound } = require("../../../../api/helpers/errors");

jest.mock("../../../../api/controllers/v0.3/IlsClient");

const exampleVarFields = [
  { fieldTag: "u", content: "username" },
  { fieldTag: "x", content: "DEPENDENTS 12333333333334" },
];
const exampleVarFieldsMultipleDependents = [
  { fieldTag: "u", content: "username" },
  {
    fieldTag: "x",
    content: "DEPENDENTS 12333333333334,12333333333335,12333333333336",
  },
];
const mockIlsClient = {};
const mockedSuccessfulResponse = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 10,
    varFields: exampleVarFields,
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseLimitReached = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 10,
    varFields: exampleVarFieldsMultipleDependents,
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseBadPType = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 1,
    varFields: exampleVarFields,
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseExpiredAccount = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 1,
    expirationDate: "2020-04-04",
    varFields: exampleVarFields,
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedErrorResponse = {
  response: {
    status: 404,
    data: {
      name: "Record not found",
    },
  },
};
const mockedErrorResponseDup = {
  response: {
    status: 409,
    data: {
      name: "Internal server error",
      description: "Duplicate patrons found for the specified varFieldTag[b].",
    },
  },
};
const mockedILSIntegrationError = {
  response: {
    status: 500,
    data: {
      name: "Internal server error",
      description: "Something went wrong in the ILS.",
      detail: "Something went wrong in the ILS.",
    },
  },
};
// Since we are mocking the IlsClient class, we have to recreate the
// constants and array of valid p-types that can create dependents.
IlsClient.ADULT_METRO_PTYPE = 10;
IlsClient.ADULT_NYS_PTYPE = 11;
IlsClient.SENIOR_METRO_PTYPE = 20;
IlsClient.SENIOR_NYS_PTYPE = 21;
IlsClient.DISABLED_METRO_NY_PTYPE = 101;
IlsClient.HOMEBOUND_NYC_PTYPE = 101;
IlsClient.SIMPLYE_METRO_PTYPE = 2;
IlsClient.SIMPLYE_NON_METRO_PTYPE = 3;
IlsClient.WEB_DIGITAL_NON_METRO = 8;
IlsClient.WEB_DIGITAL_METRO = 9;
IlsClient.TEEN_METRO_PTYPE = 50;
IlsClient.TEEN_NYS_PTYPE = 51;
IlsClient.MARLI_PTYPE = 81;
IlsClient.CAN_CREATE_DEPENDENTS = [
  IlsClient.ADULT_METRO_PTYPE,
  IlsClient.ADULT_NYS_PTYPE,
  IlsClient.WEB_DIGITAL_NON_METRO,
  IlsClient.WEB_DIGITAL_METRO,
  IlsClient.SENIOR_METRO_PTYPE,
  IlsClient.SENIOR_NYS_PTYPE,
  IlsClient.DISABLED_METRO_NY_PTYPE,
  IlsClient.HOMEBOUND_NYC_PTYPE,
  IlsClient.SIMPLYE_METRO_PTYPE,
  IlsClient.SIMPLYE_NON_METRO_PTYPE,
  IlsClient.TEEN_METRO_PTYPE,
  IlsClient.TEEN_NYS_PTYPE,
  IlsClient.MARLI_PTYPE,
];

describe("DependentAccountAPI", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    IlsClient.mockClear();
  });

  // This is the main function to use from the DependentAccountAPI class.
  // The functions used in `isPatronEligible` are tested separately below.
  describe("isPatronEligible", () => {
    it("fails if no IlsClient is passed", async () => {
      const { isPatronEligible } = DependentAccountAPI();
      const barcode = "12345678912345";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "ILS Client not set in the Dependent Eligibility API."
      );
    });

    it("returns an error if a barcode or username is not passed", async () => {
      const { isPatronEligible } = DependentAccountAPI(mockIlsClient);

      await expect(isPatronEligible()).rejects.toThrow(
        "No barcode or username passed."
      );
    });

    // NYC ID can be used as a barcode and that is 16 digits long.
    it("returns an error if a barcode is not 14 or 16 digits", async () => {
      const { isPatronEligible } = DependentAccountAPI(mockIlsClient);
      const options = { barcode: "1234567891234", username: undefined };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "The barcode passed is not a 14-digit or 16-digit number."
      );
    });

    it("returns a not eligible error if the barcode is 7 digits for older accounts", async () => {
      const { isPatronEligible } = DependentAccountAPI(mockIlsClient);
      const options = { barcode: "1234567", username: undefined };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "You don’t have the correct card type to make child accounts. Please contact gethelp@nypl.org if you believe this is in error."
      );
    });

    it("returns an error if no patron can be found in the ILS", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedErrorResponse,
      }));
      const { isPatronEligible } = DependentAccountAPI(IlsClient());
      let options = { barcode: "12333333333333", username: undefined };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "The patron couldn't be found in the ILS with the barcode or username."
      );

      options = { barcode: undefined, username: "someUsername" };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "The patron couldn't be found in the ILS with the barcode or username."
      );
    });

    it("returns a response that the patron has an expired account", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () =>
          mockedSuccessfulResponseExpiredAccount,
      }));
      const { isPatronEligible } = DependentAccountAPI(IlsClient());
      let options = { barcode: "12333333333333", username: undefined };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "Your card has expired. Please try applying again."
      );

      options = { barcode: undefined, username: "username" };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "Your card has expired. Please try applying again."
      );
    });

    it("returns a response that the patron is ineligible to create dependents because the p-type isn't valid", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponseBadPType,
      }));
      const { isPatronEligible } = DependentAccountAPI(IlsClient());
      let options = { barcode: "12333333333333", username: undefined };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "You don’t have the correct card type to make child accounts. Please contact gethelp@nypl.org if you believe this is in error."
      );

      options = { barcode: undefined, username: "username" };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "You don’t have the correct card type to make child accounts. Please contact gethelp@nypl.org if you believe this is in error."
      );
    });

    it("returns a response that the patron is ineligible because they reached the limit", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () =>
          mockedSuccessfulResponseLimitReached,
      }));
      const { isPatronEligible } = DependentAccountAPI(IlsClient());
      let options = { barcode: "12333333333333", username: undefined };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "You have reached the limit of dependent cards you can receive via online application."
      );

      options = { barcode: undefined, username: "username" };

      await expect(isPatronEligible(options)).rejects.toThrow(
        "You have reached the limit of dependent cards you can receive via online application."
      );
    });

    it("returns a response that the patron is eligible to create dependents", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponse,
      }));
      const { isPatronEligible } = DependentAccountAPI(IlsClient());
      let options = { barcode: "12333333333333", username: undefined };
      let response = await isPatronEligible(options);

      expect(response.eligible).toEqual(true);
      expect(response.description).toEqual(
        "This patron can create dependent accounts."
      );

      options = { barcode: undefined, username: "username" };
      response = await isPatronEligible(options);

      expect(response.eligible).toEqual(true);
      expect(response.description).toEqual(
        "This patron can create dependent accounts."
      );
    });
  });

  describe("checkAccountExpiration", () => {
    let { checkAccountExpiration } = DependentAccountAPI(mockIlsClient);

    it("returns whether a date is expired or not", () => {
      const mockNowDate = new Date("2020-05-27");

      const futureDate = new Date("2021-05-27");
      const expiredDate = new Date("2020-04-04");

      expect(checkAccountExpiration(futureDate, mockNowDate)).toEqual(false);
      expect(checkAccountExpiration(expiredDate, mockNowDate)).toEqual(true);
    });
  });

  describe("getPatronFromILS", () => {
    const barcode = "12345678912345";
    const username = "username";

    it("fails if no IlsClient is passed", async () => {
      const { getPatronFromILS } = DependentAccountAPI();

      await expect(getPatronFromILS(barcode)).rejects.toThrow(
        "ILS Client not set in the Dependent Eligibility API."
      );
    });

    it("gets a valid patron object from the ILS from barcode or username", async () => {
      // Mocking that the ILS request returned a successful response.
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponse,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      let { getPatronFromILS } = DependentAccountAPI(ilsClient);
      let options = { value: barcode, type: "barcode" };
      let isBarcode = true;
      let patron = await getPatronFromILS(options);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode, isBarcode);
      expect(patron).toEqual({
        id: "12333333333333",
        patronType: 10,
        varFields: [
          { fieldTag: "u", content: username },
          { fieldTag: "x", content: "DEPENDENTS 12333333333334" },
        ],
      });

      options = { value: username, type: "username" };
      isBarcode = false;
      patron = await getPatronFromILS(options);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(username, isBarcode);
      expect(patron).toEqual({
        id: "12333333333333",
        patronType: 10,
        varFields: [
          { fieldTag: "u", content: username },
          { fieldTag: "x", content: "DEPENDENTS 12333333333334" },
        ],
      });
    });

    it("throws an error if the ILS returns a 404", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedErrorResponse,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      const { getPatronFromILS } = DependentAccountAPI(ilsClient);
      let options = { value: barcode, type: "barcode" };
      let isBarcode = true;

      await expect(getPatronFromILS(options)).rejects.toThrow(
        "The patron couldn't be found in the ILS with the barcode or username."
      );

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode, isBarcode);

      options = { value: username, type: "username" };
      isBarcode = false;

      await expect(getPatronFromILS(options)).rejects.toThrow(
        "The patron couldn't be found in the ILS with the barcode or username."
      );

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(username, isBarcode);
    });

    it("throws an error if the ILS returns a 409 - duplicate patrons found", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedErrorResponseDup,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      const { getPatronFromILS } = DependentAccountAPI(ilsClient);
      let options = { value: barcode, type: "barcode" };
      let isBarcode = true;

      await expect(getPatronFromILS(options)).rejects.toThrow(
        "The patron couldn't be found in the ILS with the barcode or username."
      );

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode, isBarcode);

      options = { value: username, type: "username" };
      isBarcode = false;

      await expect(getPatronFromILS(options)).rejects.toThrow(
        "The patron couldn't be found in the ILS with the barcode or username."
      );

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(username, isBarcode);
    });

    it("throws an error if the ILS returns a 500", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedILSIntegrationError,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      const { getPatronFromILS } = DependentAccountAPI(ilsClient);
      let options = { value: barcode, type: "barcode" };
      let isBarcode = true;

      await expect(getPatronFromILS(options)).rejects.toThrow(PatronNotFound);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode, isBarcode);

      options = { value: username, type: "username" };
      isBarcode = false;

      await expect(getPatronFromILS(options)).rejects.toThrow(PatronNotFound);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(username, isBarcode);
    });
  });

  // There are a total of 9 p-types that can have dependent accounts. Note:
  // Disabled Metro NY (3 Year) and Homebound NYC (3 Year) do not have
  // p-type values yet so in the code they're temporarily set to 101.
  // ConstantName: ("description", number p-type)
  // ADULT_METRO_PTYPE: ("Adult 18-64 Metro (3 Year)", 10)
  // ADULT_NYS_PTYPE: ("Adult 18-64 NY State (3 Year)", 11)
  // SENIOR_METRO_PTYPE: ("Senior, 65+, Metro (3 Year)", 20)
  // SENIOR_NYS_PTYPE: ("Senior, 65+, NY State (3 Year)", 21)
  // DISABLED_METRO_NY_PTYPE: ("Disabled Metro NY (3 Year)", 101)
  // HOMEBOUND_NYC_PTYPE: ("Homebound NYC (3 Year)", 101)
  // SIMPLYE_METRO_PTYPE: ("SimplyE Metro", 2)
  // SIMPLYE_NON_METRO_PTYPE: ("SimplyE Non-Metro", 3)
  // MARLI_PTYPE: ("Marli", 81)
  describe("checkPType", () => {
    it("returns false if the patron doesn't have a valid p-type", () => {
      let { checkPType } = DependentAccountAPI(IlsClient());
      let patronType = 1; // Web Applicant

      let valid = checkPType(patronType);
      expect(valid).toEqual(false);

      patronType = 4; // SimplyE Juvenile

      valid = checkPType(patronType);
      expect(valid).toEqual(false);

      patronType = 5; // SimplyE Juvenile Only

      valid = checkPType(patronType);
      expect(valid).toEqual(false);

      patronType = 7; // Web Digital Temporary

      valid = checkPType(patronType);
      expect(valid).toEqual(false);
    });

    it("returns true if the patron has a valid p-type", () => {
      let { checkPType } = DependentAccountAPI(mockIlsClient);
      let patronType = 2; // SimplyE Metro

      let valid = checkPType(patronType);
      expect(valid).toEqual(true);

      patronType = 10; // Adult Metro

      valid = checkPType(patronType);
      expect(valid).toEqual(true);

      patronType = 20; // Senior Metro

      valid = checkPType(patronType);
      expect(valid).toEqual(true);

      patronType = 81; // Marli

      valid = checkPType(patronType);
      expect(valid).toEqual(true);

      patronType = 50; // Teen Metro (3 Year)

      valid = checkPType(patronType);
      expect(valid).toEqual(true);

      patronType = 9; // Web Digital Metro

      valid = checkPType(patronType);
      expect(valid).toEqual(true);
    });
  });

  describe("canCreateDependents", () => {
    let varFields = [
      {
        fieldTag: "z",
        content: "email@gmail.com",
      },
      {
        fieldTag: "a",
        content: "some address",
      },
      {
        fieldTag: "n",
        content: "LASTNAME, FIRSTNAME",
      },
    ];
    const ilsClient = IlsClient();

    it("returns true if there are no `varFields` object with a fieldTag of `x`", () => {
      let { canCreateDependents } = DependentAccountAPI(ilsClient);

      const canCreateDependentsValue = canCreateDependents(varFields);
      expect(canCreateDependentsValue).toEqual(true);
    });

    it("returns true if there are any `varFields` objects with a fieldTag of `x` but not with `DEPENDENTS` in the `contents`", () => {
      let { canCreateDependents } = DependentAccountAPI(ilsClient);
      // Create a copy of the varFields array.
      let xVarFields = varFields.slice();
      xVarFields.push({ fieldTag: "x", content: "content" });

      let canCreateDependentsValue = canCreateDependents(xVarFields);
      expect(canCreateDependentsValue).toEqual(true);

      // Even if there are multiple varFields objects with a fieldTag of `x`,
      // it doesn't matter unless they have the `DEPENDENTS` string in the
      // `content` field.
      xVarFields.push({ fieldTag: "x", content: "content2" });
      canCreateDependentsValue = canCreateDependents(xVarFields);
      expect(canCreateDependentsValue).toEqual(true);
    });

    it("returns true if there are less than three dependents", () => {
      let { canCreateDependents } = DependentAccountAPI(ilsClient);
      let oneDependentVarFields = varFields.slice();
      // There is one barcode in `content` field.
      oneDependentVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334",
      });

      let canCreateDependentsValue = canCreateDependents(oneDependentVarFields);
      expect(canCreateDependentsValue).toEqual(true);

      let twoDependentVarFields = varFields.slice();
      // There are two barcodes in `content` field.
      twoDependentVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334,12333333333335",
      });

      canCreateDependentsValue = canCreateDependents(twoDependentVarFields);
      expect(canCreateDependentsValue).toEqual(true);
    });

    it("returns false if there are three dependents already", () => {
      let { canCreateDependents } = DependentAccountAPI(ilsClient);
      let reachedLimitVarFields = varFields.slice();
      // There are 3 barcodes in `content` field and the limit has been reached.
      reachedLimitVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334,12333333333335,12333333333336",
      });

      let canCreateDependentsValue = canCreateDependents(reachedLimitVarFields);
      expect(canCreateDependentsValue).toEqual(false);
    });
  });

  describe("getAlreadyFetchedParentPatron", () => {
    it("returns undefined if `isPatronEligible` wasn't called", () => {
      const { getAlreadyFetchedParentPatron } = DependentAccountAPI(
        mockIlsClient
      );

      expect(getAlreadyFetchedParentPatron()).toBeUndefined();
    });

    it("returns the already fetched patron account after `isPatronEligible` is called", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponse,
      }));
      const {
        isPatronEligible,
        getAlreadyFetchedParentPatron,
      } = DependentAccountAPI(IlsClient());
      const options = { barcode: "12333333333333", username: undefined };

      await isPatronEligible(options);

      expect(getAlreadyFetchedParentPatron()).toEqual({
        id: "12333333333333",
        patronType: 10,
        varFields: [
          { fieldTag: "u", content: "username" },
          { fieldTag: "x", content: "DEPENDENTS 12333333333334" },
        ],
        // The dependents content is also extracted and added a separate
        // property for easy access.
        dependents: "DEPENDENTS 12333333333334",
      });
    });
  });

  describe("getVarField", () => {
    const { getVarField } = DependentAccountAPI();

    it("returns an empty array if no params or an empty array were passed", () => {
      expect(getVarField()).toEqual([]);
      expect(getVarField([])).toEqual([]);
    });

    it("returns an empty array if the fieldTag is not found in any object", () => {
      const fieldTag = "y";
      expect(getVarField(exampleVarFields, fieldTag)).toEqual([]);
    });

    it("returns an object with the fieldTag value passed in", () => {
      let fieldTag = "u";
      expect(getVarField(exampleVarFields, fieldTag)).toEqual([
        { fieldTag: "u", content: "username" },
      ]);

      fieldTag = "x";
      expect(getVarField(exampleVarFields, fieldTag)).toEqual([
        { fieldTag: "x", content: "DEPENDENTS 12333333333334" },
      ]);
    });

    it("returns multiple values if they exist", () => {
      const noteFields = [
        { fieldTag: "x", content: "some note" },
        { fieldTag: "x", content: "another note" },
      ];
      const multipleValues = exampleVarFields.concat(noteFields);

      expect(getVarField(multipleValues)).toEqual([
        { fieldTag: "x", content: "DEPENDENTS 12333333333334" },
        ...noteFields,
      ]);
    });
  });

  describe("getDependentVarField", () => {
    const { getDependentVarField } = DependentAccountAPI();

    it("returns a undefined if no param was passed", () => {
      expect(getDependentVarField()).toEqual(undefined);
    });
    it("returns a undefined if an empty array was passed", () => {
      expect(getDependentVarField([])).toEqual(undefined);
    });

    it("returns undefined if there were no objects with the string 'DEPENDENTS'\
      in the content property", () => {
      const exampleVarFieldsNoDependents = [
        { fieldTag: "u", content: "username" },
        { fieldTag: "b", content: "12333333333334" },
        { fieldTag: "x", content: "some note" },
      ];
      expect(
        getDependentVarField(exampleVarFieldsNoDependents)
      ).not.toBeDefined();
    });

    it("returns the object with the string 'DEPENDENTS' in the content property", () => {
      expect(getDependentVarField(exampleVarFields)).toEqual({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334",
      });

      // Even if there are multiple objects with a fieldTag of 'x', only the
      // one that has 'DEPENDENTS' in the content is returned.
      const multipleXFieldTags = [
        ...exampleVarFields,
        { fieldTag: "x", content: "some note" },
        { fieldTag: "x", content: "another note" },
      ];

      expect(getDependentVarField(multipleXFieldTags)).toEqual({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334",
      });
    });
  });

  describe("updateParentWithDependent", () => {
    it("fails if no IlsClient is passed", async () => {
      const { updateParentWithDependent } = DependentAccountAPI();
      const parent = {};
      const barcode = "12345678912345";

      await expect(updateParentWithDependent(parent, barcode)).rejects.toThrow(
        "ILS Client not set in the Dependent Eligibility API."
      );
    });

    it("fails if the dependent barcode is not passed", async () => {
      IlsClient.mockImplementation(() => ({}));
      const { updateParentWithDependent } = DependentAccountAPI(IlsClient());
      const parent = {};
      const barcode = "";

      await expect(updateParentWithDependent(parent, barcode)).rejects.toThrow(
        "The dependent account has no barcode. Cannot update parent account."
      );
    });

    it("throws an error because the patron couldn't be found", async () => {
      const mockedErrorResponse = {
        response: {
          status: 404,
          data: {
            name: "Patron record not found",
          },
        },
      };
      // Darn, attempting to call the ILS to update the patron failed.
      // It couldn't find the patron with the passed id.
      IlsClient.mockImplementation(() => ({
        updatePatron: () => jest.fn().mockRejectedValue(mockedErrorResponse),
      }));

      const { updateParentWithDependent } = DependentAccountAPI(IlsClient());
      const parent = { id: "some id" };
      const barcode = "12333333333333";

      await expect(updateParentWithDependent(parent, barcode)).rejects.toThrow(
        "The parent patron couldn't be updated."
      );
    });

    it("throws an error because calling the ILS failed", async () => {
      // The ILS just failed.
      IlsClient.mockImplementation(() => ({
        updatePatron: () =>
          jest.fn().mockRejectedValue(mockedILSIntegrationError),
      }));

      const { updateParentWithDependent } = DependentAccountAPI(IlsClient());
      const parent = { id: "some id" };
      const barcode = "12333333333333";

      await expect(updateParentWithDependent(parent, barcode)).rejects.toThrow(
        "The parent patron couldn't be updated."
      );
    });

    it("updates the patron's varField with its first dependent", async () => {
      const mockSuccessfulUpdate = { status: 204, data: {} };
      IlsClient.mockImplementation(() => ({
        updatePatron: jest.fn().mockResolvedValue(mockSuccessfulUpdate),
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "updatePatron");
      const { updateParentWithDependent } = DependentAccountAPI(ilsClient);
      // We are assuming that the parent patron doesn't already have any
      // dependents, so don't add any varFields in its data object.
      const parent = { id: "some id" };
      const barcode = "12333333333333";

      const resp = await updateParentWithDependent(parent, barcode);

      const firstDependent = {
        varFields: [{ fieldTag: "x", content: `DEPENDENTS ${barcode}` }],
      };

      expect(spy).toHaveBeenCalledWith(parent.id, firstDependent);
      expect(resp).toEqual(mockSuccessfulUpdate);
    });

    it("updates the patron's varField with its second dependent", async () => {
      const mockSuccessfulUpdate = { status: 204, data: {} };
      IlsClient.mockImplementation(() => ({
        updatePatron: jest.fn().mockResolvedValue(mockSuccessfulUpdate),
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "updatePatron");
      const { updateParentWithDependent } = DependentAccountAPI(ilsClient);
      // This patron already has a dependent! So the next barcode will be
      // added to the existing varField value for fieldTag of "x".
      const parent = {
        id: "some id",
        varFields: [{ fieldTag: "x", content: "DEPENDENTS 12345" }],
      };
      const barcode = "12333333333333";

      const resp = await updateParentWithDependent(parent, barcode);

      const firstDependent = {
        varFields: [{ fieldTag: "x", content: `DEPENDENTS 12345,${barcode}` }],
      };

      expect(spy).toHaveBeenCalledWith(parent.id, firstDependent);
      expect(resp).toEqual(mockSuccessfulUpdate);
    });

    it("updates the patron's varField with its third dependent", async () => {
      const mockSuccessfulUpdate = { status: 204, data: {} };
      IlsClient.mockImplementation(() => ({
        updatePatron: jest.fn().mockResolvedValue(mockSuccessfulUpdate),
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "updatePatron");
      const { updateParentWithDependent } = DependentAccountAPI(ilsClient);
      // This patron already has a dependent! So the next barcode will be
      // added to the existing varField value for fieldTag of "x".
      const parent = {
        id: "some id",
        varFields: [
          {
            fieldTag: "x",
            content: "DEPENDENTS 12333333333335,12333333333336",
          },
        ],
      };
      const barcode = "12345678912345";

      const resp = await updateParentWithDependent(parent, barcode);

      const firstDependent = {
        varFields: [
          {
            fieldTag: "x",
            content: `DEPENDENTS 12333333333335,12333333333336,${barcode}`,
          },
        ],
      };

      expect(spy).toHaveBeenCalledWith(parent.id, firstDependent);
      expect(resp).toEqual(mockSuccessfulUpdate);
    });

    it("updates the patron's varField even if there are other existing values", async () => {
      const mockSuccessfulUpdate = { status: 204, data: {} };
      IlsClient.mockImplementation(() => ({
        updatePatron: jest.fn().mockResolvedValue(mockSuccessfulUpdate),
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "updatePatron");
      const { updateParentWithDependent } = DependentAccountAPI(ilsClient);
      // This patron has a varField with a fieldTag of "x" already but it
      // doesn't contain DEPENDENTS. This is okay since it can contain
      // anything. This is not written over but a new varField is created,
      // which is also okay to have in the ILS.
      const parent = {
        id: "some id",
        varFields: [
          {
            fieldTag: "x",
            content:
              "This contains something else that is not what is expected",
          },
        ],
      };
      const barcode = "12333333333337";

      const resp = await updateParentWithDependent(parent, barcode);

      const firstDependent = {
        varFields: [{ fieldTag: "x", content: `DEPENDENTS ${barcode}` }],
      };

      expect(spy).toHaveBeenCalledWith(parent.id, firstDependent);
      expect(resp).toEqual(mockSuccessfulUpdate);
    });
  });

  describe("formatAddressForILS", () => {
    let { formatAddressForILS } = DependentAccountAPI();

    it("returns an empty object if the input is wrong", () => {
      // It expects an array of two strings since that's how the ILS
      // formats its addresses.
      const badAddress = { lines: ["476 5th Ave."] };
      expect(formatAddressForILS({})).toEqual({});
      expect(formatAddressForILS(badAddress)).toEqual({});
    });

    it("returns an object structured for the Address class", () => {
      const address = { lines: ["476 5th Ave.", "New York, NY 10018"] };
      expect(formatAddressForILS(address)).toEqual({
        line1: "476 5th Ave.",
        city: "New York",
        state: "NY",
        zip: "10018",
        hasBeenValidated: true,
      });
    });
  });
});
