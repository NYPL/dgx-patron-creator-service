/* eslint-disable jest/no-disabled-tests */
const AddressValidationAPI = require("../../../../api/controllers/v0.3/AddressValidationAPI");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const Card = require("../../../../api/models/v0.3/modelCard");
const Address = require("../../../../api/models/v0.3/modelAddress");
const Policy = require("../../../../api/models/v0.3/modelPolicy");
const axios = require("axios");
const { ILSIntegrationError } = require("../../../../api/helpers/errors");
const encode = require("../../../../api/helpers/encode");

jest.mock("axios");
jest.mock("../../../../api/controllers/v0.3/AddressValidationAPI");

const tokenUrl = "ils/token/endpoint";
const createUrl = "ils/create/endpoint";
const findUrl = "ils/find/endpoint";
const ilsClientKey = "key";
const ilsClientSecret = "secret";
const mockIlsToken = "theAccessToken";
const mockedSuccessfulResponse = {
  status: 200,
  data: {
    id: "1234",
    patronType: 10,
    varFields: [
      { fieldTag: "u", content: "username" },
      { fieldTag: "x", content: "some content" },
    ],
    // Other ILS patron fields which aren't necessary for testing
  },
};
const mockedSuccessfulTokenResponse = {
  status: 200,
  data: { access_token: mockIlsToken },
};
const mockedErrorResponse = {
  response: {
    status: 404,
    data: {
      name: "Record not found",
    },
  },
};
const mockedInvalidErrorResponse = {
  response: {
    status: 400,
    data: {
      description: "Invalid JSON request",
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
    },
  },
};

describe.skip("IlsClient", () => {
  beforeEach(() => {
    axios.mockClear();
  });

  describe("agencyField", () => {
    // The `agencyField` method doesn't need any credentials or other props.
    const ilsClient = IlsClient({});

    it("returns an object with a key of '86' and an object value", () => {
      const agency = "202";
      const fixedFields = {};
      const agencyField = ilsClient.agencyField(agency, fixedFields);

      expect(agencyField).toEqual({
        158: {
          label: "AGENCY",
          value: agency,
        },
      });
    });

    it("adds on to an existing fixedFields object", () => {
      const agency = "202";
      const fixedFields = {
        84: {
          label: "some field",
          value: "value",
        },
        85: {
          label: "some field 2",
          value: "value 2",
        },
      };

      const agencyField = ilsClient.agencyField(agency, fixedFields);

      expect(agencyField).toEqual({
        ...fixedFields,
        158: {
          label: "AGENCY",
          value: agency,
        },
      });
    });
  });

  // The preference object being sent to the ILS is in the form of:
  // { patronCodes: { pcode1: "s" } }
  describe("ecommunicationsPref", () => {
    // The `ecommunicationsPref` method doesn't need any
    // credentials or other props.
    const ilsClient = IlsClient({});

    // The not subscribed content string is '-'.
    it("returns a not subscribed preference", () => {
      const subscribed = false;
      let patronCodes = {};
      patronCodes = ilsClient.ecommunicationsPref(subscribed, patronCodes);

      expect(patronCodes.pcode1).toEqual(
        IlsClient.NOT_SUBSCRIBED_ECOMMUNICATIONS_PREF
      );
      expect(patronCodes.pcode1).toEqual("-");
      expect(patronCodes).toEqual({ pcode1: "-" });
    });

    // The subscribed content string is 's'.
    it("returns a subscribed preference", () => {
      const subscribed = true;
      let patronCodes = {};
      patronCodes = ilsClient.ecommunicationsPref(subscribed, patronCodes);

      expect(patronCodes.pcode1).toEqual(
        IlsClient.SUBSCRIBED_ECOMMUNICATIONS_PREF
      );
      expect(patronCodes.pcode1).toEqual("s");
      expect(patronCodes).toEqual({ pcode1: "s" });
    });

    it("merges any existing patronCode values", () => {
      const subscribed = true;
      let patronCodes = { pcode2: "some value", pcode3: "another value" };

      patronCodes = ilsClient.ecommunicationsPref(subscribed, patronCodes);

      expect(patronCodes).toEqual({
        pcode1: "s",
        pcode2: "some value",
        pcode3: "another value",
      });
    });
  });

  // The name being sent to the ILS is in the form of:
  // 'LASTNAME, FIRSTNAME'
  describe("formatPatronName", () => {
    // The `formatPatronName` method doesn't need any
    // credentials or other props.
    const ilsClient = IlsClient({});

    it("returns an empty string if nothing was passed", () => {
      expect(ilsClient.formatPatronName()).toEqual("");
    });

    it("returns the name in all caps if there is only one value", () => {
      const name = "Abraham";
      expect(ilsClient.formatPatronName(name)).toEqual("ABRAHAM");
    });

    it("returns last name and then first name in all caps", () => {
      const name = "Abraham Lincoln";
      expect(ilsClient.formatPatronName(name)).toEqual("LINCOLN, ABRAHAM");
    });
  });

  // The address object being sent to the ILS is in the form of:
  // { lines: ['line 1', 'line 2'], type: 'a' }
  describe("formatAddress", () => {
    // The `formatAddress` method doesn't need any
    // credentials or other props.
    const ilsClient = IlsClient({});
    const address = new Address(
      {
        line1: "476 5th Avenue",
        city: "New York",
        state: "NY",
        zip: "10018",
      },
      "soLicenseKey"
    );

    // The primary address type is 'a'.
    it("returns a primary address object for the ILS", () => {
      const isWorkAddress = false;
      const formattedAddress = ilsClient.formatAddress(address, isWorkAddress);

      expect(formattedAddress.lines).toEqual([
        "476 5TH AVENUE",
        "NEW YORK, NY 10018",
      ]);
      expect(formattedAddress.type).toEqual(IlsClient.ADDRESS_FIELD_TAG);
      expect(formattedAddress.type).toEqual("a");
    });

    // The work address type is 'h'.
    it("returns a work address object for the ILS", () => {
      const isWorkAddress = true;
      const formattedAddress = ilsClient.formatAddress(address, isWorkAddress);

      expect(formattedAddress.lines).toEqual([
        "476 5TH AVENUE",
        "NEW YORK, NY 10018",
      ]);
      expect(formattedAddress.type).toEqual(IlsClient.WORK_ADDRESS_FIELD_TAG);
      expect(formattedAddress.type).toEqual("h");
    });
  });

  describe("getPatronFromBarcodeOrUsername", () => {
    const ilsClient = IlsClient({
      findUrl,
      tokenUrl,
      ilsClientKey,
      ilsClientSecret,
    });

    beforeAll(async () => {
      // Mock that we got a token for authenticated requests.
      axios.post.mockImplementationOnce(() =>
        // eslint-disable-next-line implicit-arrow-linebreak
        Promise.resolve(mockedSuccessfulTokenResponse)
      );
      await ilsClient.generateIlsToken();
    });

    it("calls the ILS with the barcode parameters", async () => {
      const barcode = "999999999";
      const isBarcode = true;

      // Mocking that the call to the ILS was successful.
      axios.get.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulResponse)
      );

      const barcodeFieldTag = IlsClient.BARCODE_FIELD_TAG;
      const expectedParams = `?varFieldTag=${barcodeFieldTag}&varFieldContent=${barcode}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        barcode,
        isBarcode
      );

      expect(patron.status).toEqual(200);
      expect(patron.data.id).toEqual("1234");
      expect(patron.data.patronType).toEqual(10);
      expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockIlsToken}`,
        },
      });
    });

    it("calls the ILS with the username parameters", async () => {
      const username = "username1";
      const isBarcode = false;

      // Mocking that the call to the ILS was successful.
      axios.get.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulResponse)
      );

      const usernameFieldTag = IlsClient.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        username,
        isBarcode
      );

      expect(patron.status).toEqual(200);
      expect(patron.data.id).toEqual("1234");
      expect(patron.data.patronType).toEqual(10);
      expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockIlsToken}`,
        },
      });
    });

    it("can't find the patron", async () => {
      // This is testing the username but the barcode will return the same error.
      const username = "username1";
      const isBarcode = false;

      // Mocking that the call to the ILS was not successful.
      axios.get.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponse)
      );

      const usernameFieldTag = IlsClient.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        username,
        isBarcode
      );

      expect(patron.status).toEqual(404);
      expect(patron.data.id).toBeUndefined();
      expect(patron.data.name).toEqual("Record not found");
      expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockIlsToken}`,
        },
      });
    });

    it("found more than one patron with the same username or barcode", async () => {
      // This is testing the username but the barcode will return the same error.
      const username = "username1";
      const isBarcode = false;

      // Mocking that the call to the ILS was not successful.
      axios.get.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponseDup)
      );

      const usernameFieldTag = IlsClient.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        username,
        isBarcode
      );

      expect(patron.status).toEqual(409);
      expect(patron.data.id).toBeUndefined();
      expect(patron.data.name).toEqual("Internal server error");
      expect(patron.data.description).toEqual(
        "Duplicate patrons found for the specified varFieldTag[b]."
      );
      expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockIlsToken}`,
        },
      });
    });

    it("returns an error because the request to the ILS failed", async () => {
      // This is testing the username but the barcode will return the same error.
      const username = "username1";
      const isBarcode = false;

      // Mocking that the call to the ILS was not successful.
      axios.get.mockImplementationOnce(() =>
        Promise.reject(mockedILSIntegrationError)
      );

      const usernameFieldTag = IlsClient.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        username,
        isBarcode
      );

      expect(patron.status).toEqual(500);
      expect(patron.data.id).toBeUndefined();
      expect(patron.data.name).toEqual("Internal server error");
      expect(patron.data.description).toEqual(
        "Something went wrong in the ILS."
      );
      expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mockIlsToken}`,
        },
      });
    });
  });

  // Checks a barcode or username availability. Internally, `available`
  // calls `getPatronFromBarcodeOrUsername` which is tested above.
  describe("available", () => {
    const ilsClient = IlsClient({
      findUrl,
      tokenUrl,
      ilsClientKey,
      ilsClientSecret,
    });

    beforeAll(async () => {
      // Mock that we got a token for authenticated requests.
      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulTokenResponse)
      );
      await ilsClient.generateIlsToken();
    });

    describe("barcode", () => {
      const barcode = "12341234123412";
      const barcodeFieldTag = IlsClient.BARCODE_FIELD_TAG;
      const expectedParams = `?varFieldTag=${barcodeFieldTag}&varFieldContent=${barcode}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const isBarcode = true;

      it("checks for barcode availability and finds an existing patron, so it is not available", async () => {
        // Mocking that the call to the ILS was successful and a patron
        // was found. This means that the barcode is already taken and
        // therefore not available. So, return false.
        axios.get.mockImplementationOnce(() =>
          Promise.resolve(mockedSuccessfulResponse)
        );
        const available = await ilsClient.available(barcode, isBarcode);

        expect(available).toEqual(false);
        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });

      it("checks for barcode availability and gets a server error and duplicate, so it is not available", async () => {
        axios.get.mockImplementationOnce(() =>
          Promise.resolve(mockedErrorResponseDup)
        );

        const available = await ilsClient.available(barcode, isBarcode);

        expect(available).toEqual(false);
        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });

      it("checks for barcode availability and doesn't find an existing patron, so it is available", async () => {
        // Mocking that the call to the ILS was not successful and it returned
        // an error. This means that a patron was not found and so the
        // barcode is not taken and therefore available. Return true.
        axios.get.mockImplementationOnce(() =>
          Promise.reject(mockedErrorResponse)
        );

        const available = await ilsClient.available(barcode, isBarcode);

        expect(available).toEqual(true);
        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });

      it("throws an error if the ILS cannot be called", async () => {
        // Mocking that the call to the ILS did not go through and we received
        // a 500 error. Return a 502 error.
        axios.get.mockImplementationOnce(() =>
          Promise.reject(mockedILSIntegrationError)
        );

        // Getting a 404 from the ILS is okay since it tells us that the
        // request was valid but nothing was returned. But, if the ILS returns
        // anything above 500, then throw an error. The syntax for this test
        // is now different because of the thrown error, whereas the tests
        // aboved returned correct values (even from a bad request).
        await expect(ilsClient.available(barcode, isBarcode)).rejects.toEqual(
          new ILSIntegrationError(
            "The ILS could not be requested when validating the barcode."
          )
        );

        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });
    });

    describe("username", () => {
      const username = "username";
      const usernameFieldTag = IlsClient.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const isBarcode = false;

      it("checks for username availability and finds an existing patron, so it is not available", async () => {
        // Mocking that the call to the ILS was successful and a patron
        // was found. This means that the username is already taken and
        // therefore not available. So, return false.
        axios.get.mockImplementationOnce(() =>
          Promise.resolve(mockedSuccessfulResponse)
        );

        const available = await ilsClient.available(username, isBarcode);

        expect(available).toEqual(false);
        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });

      it("checks for username availability and gets a server error and duplicate, so it is not available", async () => {
        axios.get.mockImplementationOnce(() =>
          Promise.resolve(mockedErrorResponseDup)
        );

        const available = await ilsClient.available(username, isBarcode);

        expect(available).toEqual(false);
        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });

      it("checks for username availability and doesn't find an existing patron, so it is available", async () => {
        // Mocking that the call to the ILS was not successful and it returned
        // an error. This means that a patron was not found and so the
        // username is not taken and therefore available. Return true.
        axios.get.mockImplementationOnce(() =>
          Promise.reject(mockedErrorResponse)
        );

        const available = await ilsClient.available(username, isBarcode);

        expect(available).toEqual(true);
        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });

      it("throws an error if the ILS cannot be called", async () => {
        // Mocking that the call to the ILS did not go through and we received
        // a 500 error. Return a 502 error.
        axios.get.mockImplementationOnce(() =>
          Promise.reject(mockedILSIntegrationError)
        );

        // Getting a 404 from the ILS is okay since it tells us that the
        // request was valid but nothing was returned. But, if the ILS returns
        // anything above 500, then throw an error. The syntax for this test
        // is now different because of the thrown error, whereas the tests
        // aboved returned correct values (even from a bad request).
        await expect(ilsClient.available(username, isBarcode)).rejects.toEqual(
          new ILSIntegrationError(
            "The ILS could not be requested when validating the username."
          )
        );

        expect(axios.get).toHaveBeenCalledWith(`${findUrl}${expectedParams}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        });
      });
    });
  });

  // The patron object being sent to the ILS.
  describe("formatPatronData", () => {
    // The `formatPatronName` method doesn't need any
    // credentials or other props.
    const ilsClient = IlsClient({});
    const address = new Address(
      {
        line1: "476 5th Avenue",
        city: "New York",
        state: "NY",
        zip: "10018",
      },
      "soLicenseKey"
    );
    const policy = Policy({ policyType: "simplye" });
    const card = new Card({
      name: "First Last",
      username: "username",
      pin: "1234",
      birthdate: "01/01/1988",
      email: "email@gmail.com",
      address,
      policy,
      ilsClient: IlsClient({}),
      varFields: [{ fieldTag: "x", content: "DEPENDENT OF 1234" }],
      acceptTerms: true,
      ageGate: true,
    });

    it.skip("returns an ILS-ready patron object", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      axios.get.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponse)
      );
      AddressValidationAPI.mockImplementation(() => ({
        validate: () =>
          Promise.resolve({
            type: "valid-address",
            address: {
              line1: "476 5th Avenue",
              city: "New York",
              state: "NY",
              zip: "10018",
              hasBeenValidated: true,
            },
          }),
      }));

      // Make sure we have a validated card.
      await card.validate();
      // Mock that the ptype and agency were added to the card.
      card.setPtype();
      card.setAgency();
      const formatted = ilsClient.formatPatronData(card);

      expect(formatted.names).toEqual(["LAST, FIRST"]);
      expect(formatted.pin).toEqual("1234");
      // simplye applicants are ptype of 2.
      expect(formatted.patronType).toEqual(2);
      expect(formatted.birthDate).toEqual("1988-01-01");
      expect(formatted.addresses).toEqual([
        {
          lines: ["476 5TH AVENUE", "NEW YORK, NY 10018"],
          type: "a",
        },
      ]);
      // The patron is not subscribed to e-communications by default.
      expect(formatted.patronCodes).toEqual({ pcode1: "-" });
      // Username is special and goes in a varField
      expect(formatted.varFields).toEqual([
        { fieldTag: "x", content: "DEPENDENT OF 1234" },
        { fieldTag: "u", content: "username" },
      ]);
      // Agency is in the fixedFields
      expect(formatted.fixedFields).toEqual({
        "158": {
          label: "AGENCY",
          value: "202",
        },
      });
    });
  });

  // Creates a patron in the ILS.
  describe("createPatron", () => {
    const ilsClient = IlsClient({
      createUrl,
      tokenUrl,
      ilsClientKey,
      ilsClientSecret,
    });
    const mockedSuccessfulResponse = {
      status: 200,
      data: {
        link:
          "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/1234",
      },
    };
    const address = new Address(
      {
        line1: "476 5th Avenue",
        city: "New York",
        state: "NY",
        zip: "10018",
      },
      "soLicenseKey"
    );
    const policy = Policy({ policyType: "webApplicant" });
    const card = new Card({
      name: "First Last",
      username: "username",
      pin: "1234",
      email: "test@test.com",
      birthdate: "01/01/1988",
      address,
      policy,
      ilsClient,
      acceptTerms: true,
      ageGate: true,
    });
    // Mock that the ptype was added to the card.
    card.setPtype();
    // Mock that the agency was added.
    card.setAgency();

    // Mocking current expiration date.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const expirationDate = new Date(currentYear, currentMonth, currentDay + 90);

    beforeAll(async () => {
      // Mock that we got a token for authenticated requests.
      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulTokenResponse)
      );
      await ilsClient.generateIlsToken();
    });

    it.skip("fails to create a patron", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      axios.get.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponse)
      );
      // TODO need to mock AddressValidationAPI
      await card.validate();

      // Now mock the POST request to the ILS.
      axios.post.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponse)
      );

      const patron = await ilsClient.createPatron(card);
      expect(patron).toEqual(mockedErrorResponse.response);
      expect(axios.post).toHaveBeenCalledWith(
        createUrl,
        {
          addresses: [
            {
              lines: ["476 5TH AVENUE", "NEW YORK, NY 10018"],
              type: "a",
            },
          ],
          birthDate: "1988-01-01",
          emails: ["TEST@TEST.COM"],
          expirationDate: expirationDate.toISOString().slice(0, 10),
          // The patron is not subscribed to e-communications by default.
          patronCodes: { pcode1: "-" },
          homeLibraryCode: "eb",
          names: ["LAST, FIRST"],
          patronType: 1,
          pin: "1234",
          varFields: [{ content: "username", fieldTag: "u" }],
          fixedFields: {
            "158": {
              label: "AGENCY",
              value: "198",
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        }
      );
    });

    it.skip("successfully creates a patron", async () => {
      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulResponse)
      );

      const patron = await ilsClient.createPatron(card);

      expect(patron).toEqual(mockedSuccessfulResponse);
      expect(axios.post).toHaveBeenCalledWith(
        createUrl,
        {
          addresses: [
            {
              lines: ["476 5TH AVENUE", "NEW YORK, NY 10018"],
              type: "a",
            },
          ],
          birthDate: "1988-01-01",
          emails: ["TEST@TEST.COM"],
          expirationDate: expirationDate.toISOString().slice(0, 10),
          patronCodes: { pcode1: "-" },
          homeLibraryCode: "eb",
          names: ["LAST, FIRST"],
          patronType: 1,
          pin: "1234",
          varFields: [{ content: "username", fieldTag: "u" }],
          fixedFields: {
            "158": {
              label: "AGENCY",
              value: "198",
            },
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        }
      );
    });

    it("fails attemping to call the ILS", async () => {
      axios.post.mockImplementationOnce(() =>
        Promise.reject(mockedILSIntegrationError)
      );

      await expect(ilsClient.createPatron(card)).rejects.toEqual(
        new ILSIntegrationError(
          "The ILS could not be requested when attempting to create a patron."
        )
      );
    });
  });

  // Updates a patron in the ILS.
  describe("updatePatron", () => {
    const ilsClient = IlsClient({
      createUrl,
      tokenUrl,
      ilsClientKey,
      ilsClientSecret,
    });
    const mockedSuccessfulResponse = {
      status: 204,
      data: {},
    };
    // The error response from the ILS when it can't find the patron in the
    // PUT request is slightly different.
    const mockedErrorResponse = {
      response: {
        status: 404,
        data: {
          name: "Patron record not found",
        },
      },
    };
    const patronId = "12345";
    const updatedFields = {
      varFields: [{ fieldTag: "x", content: "DEPENDENTS 12346" }],
    };

    beforeAll(async () => {
      // Mock that we got a token for authenticated requests.
      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulTokenResponse)
      );
      await ilsClient.generateIlsToken();
    });

    it("fails to update a patron", async () => {
      // We want to mock that we called the ILS and it did not find
      // the patron to update.
      axios.put.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponse)
      );

      await expect(
        ilsClient.updatePatron(patronId, updatedFields)
      ).rejects.toThrow("Patron record not found");
      expect(axios.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        }
      );
    });

    it("updates a patron", async () => {
      axios.put.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulResponse)
      );

      const response = await ilsClient.updatePatron(patronId, updatedFields);
      expect(response).toEqual(mockedSuccessfulResponse);
      expect(axios.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        }
      );
    });

    it("should throw an error with invalid data to update", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      axios.put.mockImplementationOnce(() =>
        Promise.reject(mockedInvalidErrorResponse)
      );

      await expect(
        ilsClient.updatePatron(patronId, updatedFields)
      ).rejects.toThrow("Invalid request to ILS: Invalid JSON request");
      expect(axios.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        }
      );
    });

    it("should throw an error if hitting the ILS throws an error", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      axios.put.mockImplementationOnce(() =>
        Promise.reject(mockedILSIntegrationError)
      );

      await expect(
        ilsClient.updatePatron(patronId, updatedFields)
      ).rejects.toThrow(
        "The ILS could not be requested when attempting to update a patron."
      );
      expect(axios.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockIlsToken}`,
          },
        }
      );
    });
  });

  describe("generateIlsToken", () => {
    it("throws an error without credentials", async () => {
      const ilsClient = IlsClient({});

      await expect(ilsClient.generateIlsToken()).rejects.toThrow(
        "The ILS client was set up without a key or secret to generate a token."
      );
    });

    it("throws an error if the ILS returned an error", async () => {
      const ilsClient = IlsClient({ tokenUrl, ilsClientKey, ilsClientSecret });
      axios.post.mockImplementationOnce(() =>
        Promise.reject(mockedILSIntegrationError)
      );

      await expect(ilsClient.generateIlsToken()).rejects.toThrow(
        "Problem calling the ILS token url, Internal server error"
      );
    });

    it("makes a successful call and sets a token and timestamp", async () => {
      const ilsClient = IlsClient({ tokenUrl, ilsClientKey, ilsClientSecret });

      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulTokenResponse)
      );

      expect(ilsClient.hasIlsToken()).toEqual(false);
      expect(ilsClient.isTokenExpired()).toEqual(false);

      await ilsClient.generateIlsToken();

      // The token is private in the IlsClient class but we can at
      // least know if it was set or not.
      expect(ilsClient.hasIlsToken()).toEqual(true);
      // We have a token but it's new so it isn't expired.
      expect(ilsClient.isTokenExpired()).toEqual(false);
      expect(axios.post).toHaveBeenCalledWith(
        tokenUrl,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(
              `${ilsClientKey}:${ilsClientSecret}`
            )}`,
          },
        }
      );
    });
  });

  describe("isTokenExpired", () => {
    it("returns false if generating a token fails", async () => {
      const ilsClient = IlsClient({});

      expect(ilsClient.isTokenExpired()).toEqual(false);

      try {
        await ilsClient.generateIlsToken();
      } catch (error) {
        console.log("Intentional error");
      }

      expect(ilsClient.isTokenExpired()).toEqual(false);
    });

    it("returns false if a *new* token is generated", async () => {
      const ilsClient = IlsClient({ tokenUrl, ilsClientKey, ilsClientSecret });

      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulTokenResponse)
      );

      expect(ilsClient.isTokenExpired()).toEqual(false);
      await ilsClient.generateIlsToken();
      expect(ilsClient.isTokenExpired()).toEqual(false);
    });

    it("returns true if the token has expired", async () => {
      const today = new Date(2020, 10, 15);
      const expirationDate = new Date(2020, 10, 14);
      // We are mocking when the Date class gets called.
      const spy = jest
        .spyOn(global, "Date")
        // This gets called when the ilsClient instance is created.
        .mockReturnValueOnce(today)
        // This gets called when creating a timestamp but we are
        // intentionally expiring it to test the function.
        .mockReturnValueOnce(expirationDate);
      const ilsClient = IlsClient({ tokenUrl, ilsClientKey, ilsClientSecret });

      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulTokenResponse)
      );

      expect(ilsClient.isTokenExpired()).toEqual(false);
      await ilsClient.generateIlsToken();
      expect(ilsClient.isTokenExpired()).toEqual(true);
      spy.mockRestore();
    });
  });

  // The token is private in the instance. We never know what exactly it is,
  // but we know if there is one. That token is used to call other API
  // endpoints.
  describe("hasIlsToken", () => {
    it("returns false if generating a token fails", async () => {
      const ilsClient = IlsClient({ tokenUrl, ilsClientKey, ilsClientSecret });
      axios.post.mockImplementationOnce(() =>
        Promise.reject(mockedILSIntegrationError)
      );

      // No token by default.
      expect(ilsClient.hasIlsToken()).toEqual(false);

      try {
        await ilsClient.generateIlsToken();
      } catch (error) {
        console.log("Intentional error");
      }

      // Still no token since an error occured.
      expect(ilsClient.hasIlsToken()).toEqual(false);
    });

    it("returns true if a new token is generated", async () => {
      const ilsClient = IlsClient({ tokenUrl, ilsClientKey, ilsClientSecret });

      axios.post.mockImplementationOnce(() =>
        Promise.resolve(mockedSuccessfulTokenResponse)
      );

      expect(ilsClient.hasIlsToken()).toEqual(false);
      await ilsClient.generateIlsToken();
      expect(ilsClient.hasIlsToken()).toEqual(true);
    });
  });
});
