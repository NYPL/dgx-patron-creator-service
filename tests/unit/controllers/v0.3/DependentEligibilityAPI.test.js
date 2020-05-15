/* eslint-disable */
const DependentEligibilityAPI = require("../../../../api/controllers/v0.3/DependentEligibilityAPI");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const { ILSIntegrationError } = require("../../../../api/helpers/errors");

jest.mock("../../../../api/controllers/v0.3/IlsClient");

const mockedSuccessfulResponse = {
  status: 200,
  data: {
    id: "1234",
    patronType: 10,
    varFields: [
      { fieldTag: "u", content: "username" },
      { fieldTag: "x", content: "DEPENDENTS 1234" },
    ],
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseLimitReached = {
  status: 200,
  data: {
    id: "1234",
    patronType: 10,
    varFields: [
      { fieldTag: "u", content: "username" },
      { fieldTag: "x", content: "DEPENDENTS 1234,1235,1236" },
    ],
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseBadPType = {
  status: 200,
  data: {
    id: "1234",
    patronType: 1,
    varFields: [
      { fieldTag: "u", content: "username" },
      { fieldTag: "x", content: "some content" },
    ],
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
      message: "Something went wrong in the ILS.",
    },
  },
};

describe("DependentEligibilityAPI", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    IlsClient.mockClear();
  });

  // This is the main function to use from the DependentEligibilityAPI class.
  // The functions used in `isPatronEligible` are tested separately below.
  describe("isPatronEligible", () => {
    it("fails if no IlsClient is passed", async () => {
      const { isPatronEligible } = DependentEligibilityAPI({});
      const barcode = "123456789";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "ILS Client not set in the Dependent Eligibility API."
      );
    });

    it("returns an error if no patron can be found in the ILS", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedErrorResponse,
      }));
      const { isPatronEligible } = DependentEligibilityAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "1234";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "The patron couldn't be found."
      );
    });

    it("returns a response that the patron is ineligible to create dependents because the p-type isn't valid", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponseBadPType,
      }));
      const { isPatronEligible } = DependentEligibilityAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "1234";

      const response = await isPatronEligible(barcode);

      expect(response.eligible).toEqual(false);
      expect(response.description).toEqual(
        "This patron does not have an eligible ptype."
      );
    });

    it("returns a response that the patron is ineligible because they reached the limit", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () =>
          mockedSuccessfulResponseLimitReached,
      }));
      const { isPatronEligible } = DependentEligibilityAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "1234";

      const response = await isPatronEligible(barcode);

      expect(response.eligible).toEqual(false);
      expect(response.description).toEqual(
        "This patron has reached the limit to create dependent patrons."
      );
    });

    it("returns a response that the patron is eligible to create dependents", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponse,
      }));
      const { isPatronEligible } = DependentEligibilityAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "1234";

      const response = await isPatronEligible(barcode);

      expect(response.eligible).toEqual(true);
      expect(response.description).toEqual(
        "This patron can create dependent accounts."
      );
    });
  });

  describe("getPatronFromILS", () => {
    const barcode = "123456789";

    it("fails if no IlsClient is passed", async () => {
      const { getPatronFromILS } = DependentEligibilityAPI({});

      await expect(getPatronFromILS(barcode)).rejects.toThrow(
        "ILS Client not set in the Dependent Eligibility API."
      );
    });

    it("gets a valid patron object from the ILS", async () => {
      // Mocking that the ILS request returned a successful response .
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponse,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      let { getPatronFromILS } = DependentEligibilityAPI({ ilsClient });
      const patron = await getPatronFromILS(barcode);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode);
      expect(patron).toEqual({
        id: "1234",
        patronType: 10,
        varFields: [
          { fieldTag: "u", content: "username" },
          { fieldTag: "x", content: "DEPENDENTS 1234" },
        ],
      });
    });

    it("throws an error if the ILS returns a 404", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedErrorResponse,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      let { getPatronFromILS } = DependentEligibilityAPI({ ilsClient });

      await expect(getPatronFromILS(barcode)).rejects.toThrow(
        "The patron couldn't be found."
      );

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode);
    });

    it("throws an error if the ILS returns a 409 - duplicate patrons found", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedErrorResponseDup,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      let { getPatronFromILS } = DependentEligibilityAPI({ ilsClient });

      await expect(getPatronFromILS(barcode)).rejects.toThrow(
        "The patron couldn't be found."
      );

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode);
    });

    it("throws an error if the ILS returns a 500", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedILSIntegrationError,
      }));
      const ilsClient = IlsClient();
      const spy = jest.spyOn(ilsClient, "getPatronFromBarcodeOrUsername");
      let { getPatronFromILS } = DependentEligibilityAPI({ ilsClient });

      await expect(getPatronFromILS(barcode)).rejects.toThrow(
        ILSIntegrationError
      );

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode);
    });
  });

  // There are a total of 8 p-types that can have dependent accounts. Note:
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
  describe("checkPType", () => {
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
    IlsClient.CAN_CREATE_DEPENDENTS = [
      IlsClient.ADULT_METRO_PTYPE,
      IlsClient.ADULT_NYS_PTYPE,
      IlsClient.SENIOR_METRO_PTYPE,
      IlsClient.SENIOR_NYS_PTYPE,
      IlsClient.DISABLED_METRO_NY_PTYPE,
      IlsClient.HOMEBOUND_NYC_PTYPE,
      IlsClient.SIMPLYE_METRO_PTYPE,
      IlsClient.SIMPLYE_NON_METRO_PTYPE,
    ];
    const ilsClient = IlsClient();

    it("returns false if the patron doesn't have a valid p-type", () => {
      let { checkPType } = DependentEligibilityAPI({ ilsClient });
      let patronType = 1; // Web Applicant

      let valid = checkPType(patronType);
      expect(valid).toEqual(false);

      patronType = 50; // Teen Metro

      valid = checkPType(patronType);
      expect(valid).toEqual(false);

      patronType = 51; // Teen NYS

      valid = checkPType(patronType);
      expect(valid).toEqual(false);
    });

    it("returns true if the patron has a valid p-type", () => {
      let { checkPType } = DependentEligibilityAPI({ ilsClient });
      let patronType = 2; // SimplyE Metro

      let valid = checkPType(patronType);
      expect(valid).toEqual(true);

      patronType = 10; // Adult Metro

      valid = checkPType(patronType);
      expect(valid).toEqual(true);

      patronType = 20; // Senior Metro

      valid = checkPType(patronType);
      expect(valid).toEqual(true);
    });
  });

  describe("checkDependentLimit", () => {
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
      let { checkDependentLimit } = DependentEligibilityAPI({ ilsClient });

      const canCreateDependents = checkDependentLimit(varFields);
      expect(canCreateDependents).toEqual(true);
    });

    it("returns true if there are any `varFields` objects with a fieldTag of `x` but not with `DEPENDENTS` in the `contents`", () => {
      let { checkDependentLimit } = DependentEligibilityAPI({ ilsClient });
      // Create a copy of the varFields array.
      let xVarFields = varFields.slice();
      xVarFields.push({ fieldTag: "x", content: "content" });

      let canCreateDependents = checkDependentLimit(xVarFields);
      expect(canCreateDependents).toEqual(true);

      // Even if there are multiple varFields objects with a fieldTag of `x`,
      // it doesn't matter unless they have the `DEPENDENTS` string in the
      // `content` field.
      xVarFields.push({ fieldTag: "x", content: "content2" });
      canCreateDependents = checkDependentLimit(xVarFields);
      expect(canCreateDependents).toEqual(true);
    });

    it("returns true if there are less than three dependents", () => {
      let { checkDependentLimit } = DependentEligibilityAPI({ ilsClient });
      let oneDependentVarFields = varFields.slice();
      // There is one barcode in `content` field.
      oneDependentVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 1234",
      });

      let canCreateDependents = checkDependentLimit(oneDependentVarFields);
      expect(canCreateDependents).toEqual(true);

      let twoDependentVarFields = varFields.slice();
      // There are two barcodes in `content` field.
      twoDependentVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 1234,1235",
      });

      canCreateDependents = checkDependentLimit(twoDependentVarFields);
      expect(canCreateDependents).toEqual(true);
    });

    it("returns false if there are three dependents already", () => {
      let { checkDependentLimit } = DependentEligibilityAPI({ ilsClient });
      let reachedLimitVarFields = varFields.slice();
      // There are 3 barcodes in `content` field and the limit has been reached.
      reachedLimitVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 1234,1235,1236",
      });

      let canCreateDependents = checkDependentLimit(reachedLimitVarFields);
      expect(canCreateDependents).toEqual(false);
    });
  });
});
