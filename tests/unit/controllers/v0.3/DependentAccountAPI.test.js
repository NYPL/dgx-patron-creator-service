/* eslint-disable */
const DependentAccountAPI = require("../../../../api/controllers/v0.3/DependentAccountAPI");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const { PatronNotFound } = require("../../../../api/helpers/errors");

jest.mock("../../../../api/controllers/v0.3/IlsClient");

const mockedSuccessfulResponse = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 10,
    varFields: [
      { fieldTag: "u", content: "username" },
      { fieldTag: "x", content: "DEPENDENTS 12333333333334" },
    ],
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseLimitReached = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 10,
    varFields: [
      { fieldTag: "u", content: "username" },
      {
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334,12333333333335,12333333333336",
      },
    ],
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseBadPType = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 1,
    varFields: [
      { fieldTag: "u", content: "username" },
      { fieldTag: "x", content: "some content" },
    ],
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulResponseExpiredAccount = {
  status: 200,
  data: {
    id: "12333333333333",
    patronType: 1,
    expirationDate: "2020-04-04",
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

describe("DependentAccountAPI", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    IlsClient.mockClear();
  });

  // This is the main function to use from the DependentAccountAPI class.
  // The functions used in `isPatronEligible` are tested separately below.
  describe("isPatronEligible", () => {
    it("fails if no IlsClient is passed", async () => {
      const { isPatronEligible } = DependentAccountAPI({});
      const barcode = "12345678912345";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "ILS Client not set in the Dependent Eligibility API."
      );
    });

    it("returns an error if a barcode is not passed", async () => {
      const { isPatronEligible } = DependentAccountAPI({ ilsClient: {} });

      await expect(isPatronEligible()).rejects.toThrow("No barcode passed.");
    });

    it("returns an error if a barcode is not 14-digits", async () => {
      const { isPatronEligible } = DependentAccountAPI({ ilsClient: {} });
      const barcode = "1234567891234";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "The barcode passed is not 14-digits."
      );
    });

    it("returns an error if no patron can be found in the ILS", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedErrorResponse,
      }));
      const { isPatronEligible } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "12333333333333";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "The patron couldn't be found."
      );
    });

    it("returns a response that the patron has an expired account", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () =>
          mockedSuccessfulResponseExpiredAccount,
      }));
      const { isPatronEligible } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "12333333333333";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "Your card has expired. Please try applying again."
      );
    });

    it("returns a response that the patron is ineligible to create dependents because the p-type isn't valid", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponseBadPType,
      }));
      const { isPatronEligible } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "12333333333333";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "You don’t have the correct card type to make child accounts. Please contact gethelp@nypl.org if you believe this is in error."
      );
    });

    it("returns a response that the patron is ineligible because they reached the limit", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () =>
          mockedSuccessfulResponseLimitReached,
      }));
      const { isPatronEligible } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "12333333333333";

      await expect(isPatronEligible(barcode)).rejects.toThrow(
        "You have reached the limit of dependent cards you can receive via online application."
      );
    });

    it("returns a response that the patron is eligible to create dependents", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponse,
      }));
      const { isPatronEligible } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "12333333333333";

      const response = await isPatronEligible(barcode);

      expect(response.eligible).toEqual(true);
      expect(response.description).toEqual(
        "This patron can create dependent accounts."
      );
    });
  });

  describe("getPatronFromILS", () => {
    const barcode = "12345678912345";

    it("fails if no IlsClient is passed", async () => {
      const { getPatronFromILS } = DependentAccountAPI({});

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
      let { getPatronFromILS } = DependentAccountAPI({ ilsClient });
      const patron = await getPatronFromILS(barcode);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(barcode);
      expect(patron).toEqual({
        id: "12333333333333",
        patronType: 10,
        varFields: [
          { fieldTag: "u", content: "username" },
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
      let { getPatronFromILS } = DependentAccountAPI({ ilsClient });

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
      let { getPatronFromILS } = DependentAccountAPI({ ilsClient });

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
      let { getPatronFromILS } = DependentAccountAPI({ ilsClient });

      await expect(getPatronFromILS(barcode)).rejects.toThrow(PatronNotFound);

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
      let { checkPType } = DependentAccountAPI({ ilsClient });
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
      let { checkPType } = DependentAccountAPI({ ilsClient });
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
      let { checkDependentLimit } = DependentAccountAPI({ ilsClient });

      const canCreateDependents = checkDependentLimit(varFields);
      expect(canCreateDependents).toEqual(true);
    });

    it("returns true if there are any `varFields` objects with a fieldTag of `x` but not with `DEPENDENTS` in the `contents`", () => {
      let { checkDependentLimit } = DependentAccountAPI({ ilsClient });
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
      let { checkDependentLimit } = DependentAccountAPI({ ilsClient });
      let oneDependentVarFields = varFields.slice();
      // There is one barcode in `content` field.
      oneDependentVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334",
      });

      let canCreateDependents = checkDependentLimit(oneDependentVarFields);
      expect(canCreateDependents).toEqual(true);

      let twoDependentVarFields = varFields.slice();
      // There are two barcodes in `content` field.
      twoDependentVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334,12333333333335",
      });

      canCreateDependents = checkDependentLimit(twoDependentVarFields);
      expect(canCreateDependents).toEqual(true);
    });

    it("returns false if there are three dependents already", () => {
      let { checkDependentLimit } = DependentAccountAPI({ ilsClient });
      let reachedLimitVarFields = varFields.slice();
      // There are 3 barcodes in `content` field and the limit has been reached.
      reachedLimitVarFields.push({
        fieldTag: "x",
        content: "DEPENDENTS 12333333333334,12333333333335,12333333333336",
      });

      let canCreateDependents = checkDependentLimit(reachedLimitVarFields);
      expect(canCreateDependents).toEqual(false);
    });
  });

  describe("getAlreadyFetchedParentPatron", () => {
    it("returns undefined if `isPatronEligible` wasn't called", () => {
      const { getAlreadyFetchedParentPatron } = DependentAccountAPI({});

      expect(getAlreadyFetchedParentPatron()).toBeUndefined();
    });

    it("returns the already fetched patron account after `isPatronEligible` is called", async () => {
      IlsClient.mockImplementation(() => ({
        getPatronFromBarcodeOrUsername: () => mockedSuccessfulResponse,
      }));
      const {
        isPatronEligible,
        getAlreadyFetchedParentPatron,
      } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
      const barcode = "12333333333333";

      await isPatronEligible(barcode);

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

  describe("updateParentWithDependent", () => {
    it("fails if no IlsClient is passed", async () => {
      const { updateParentWithDependent } = DependentAccountAPI({});
      const parent = {};
      const barcode = "12345678912345";

      await expect(updateParentWithDependent(parent, barcode)).rejects.toThrow(
        "ILS Client not set in the Dependent Eligibility API."
      );
    });

    it("fails if the dependent barcode is not passed", async () => {
      IlsClient.mockImplementation(() => ({}));
      const { updateParentWithDependent } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
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

      const { updateParentWithDependent } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
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

      const { updateParentWithDependent } = DependentAccountAPI({
        ilsClient: IlsClient(),
      });
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
      const { updateParentWithDependent } = DependentAccountAPI({ ilsClient });
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
      const { updateParentWithDependent } = DependentAccountAPI({ ilsClient });
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
      const { updateParentWithDependent } = DependentAccountAPI({ ilsClient });
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
      const { updateParentWithDependent } = DependentAccountAPI({ ilsClient });
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

  describe("formatDependentAddress", () => {
    let { formatDependentAddress } = DependentAccountAPI({});

    it("returns an empty object if the input is wrong", () => {
      // It expects an array of two strings since that's how the ILS
      // formats its addresses.
      const badAddress = { lines: ["476 5th Ave."] };
      expect(formatDependentAddress({})).toEqual({});
      expect(formatDependentAddress(badAddress)).toEqual({});
    });

    it("returns an object structured for the Address class", () => {
      const address = { lines: ["476 5th Ave.", "New York, NY 10018"] };
      expect(formatDependentAddress(address)).toEqual({
        line1: "476 5th Ave.",
        city: "New York",
        state: "NY",
        zip: "10018",
        hasBeenValidated: true,
      });
    });
  });

  describe("checkAccountExpiration", () => {
    let { checkAccountExpiration } = DependentAccountAPI({});

    it("returns whether a date is expired or not", () => {
      const mockNowDate = new Date("2020-05-27");

      const futureDate = new Date("2021-05-27");
      const expiredDate = new Date("2020-04-04");

      expect(checkAccountExpiration(futureDate, mockNowDate)).toEqual(false);
      expect(checkAccountExpiration(expiredDate, mockNowDate)).toEqual(true);
    });
  });
});
