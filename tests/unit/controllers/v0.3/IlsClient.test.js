const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const Address = require("../../../../api/models/v0.3/modelAddress");
const Policy = require("../../../../api/models/v0.3/modelPolicy");
const { ILSIntegrationError } = require("../../../../api/helpers/errors");
const { normalizeName } = require("../../../../api/helpers/utils");
const constants = require("../../../../constants");

jest.mock("../../../../api/controllers/v0.3/AddressValidationAPI");

const createUrl = "ils/create/endpoint";
const findUrl = "ils/find/endpoint";
const mockedSuccessfulResponse = {
  id: "1234",
  patronType: 10,
  varFields: [
    { fieldTag: "u", content: "username" },
    { fieldTag: "x", content: "some content" },
  ],
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

describe("IlsClient", () => {
  // The address object being sent to the ILS is in the form of:
  // { lines: ['line 1', 'line 2'], type: 'a' }
  describe("formatAddress", () => {
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
      const formattedAddress = IlsClient.formatAddress(address, isWorkAddress);

      expect(formattedAddress.lines).toEqual([
        "476 5TH AVENUE",
        "NEW YORK, NY 10018",
      ]);
      expect(formattedAddress.type).toEqual(constants.ADDRESS_FIELD_TAG);
      expect(formattedAddress.type).toEqual("a");
    });

    // The work address type is 'h'.
    it("returns a work address object for the ILS", () => {
      const isWorkAddress = true;
      const formattedAddress = IlsClient.formatAddress(address, isWorkAddress);

      expect(formattedAddress.lines).toEqual([
        "476 5TH AVENUE",
        "NEW YORK, NY 10018",
      ]);
      expect(formattedAddress.type).toEqual(constants.WORK_ADDRESS_FIELD_TAG);
      expect(formattedAddress.type).toEqual("h");
    });
  });

  // The name being sent to the ILS is in the form of:
  // 'LASTNAME, FIRSTNAME'
  describe("formatPatronName", () => {
    it("returns an empty string if nothing was passed", () => {
      expect(IlsClient.formatPatronName()).toEqual("");
    });

    it("returns the name in all caps", () => {
      let name = "Abraham";
      expect(IlsClient.formatPatronName(name)).toEqual("ABRAHAM");
      name = "Lincoln, Abraham";
      expect(IlsClient.formatPatronName(name)).toEqual("LINCOLN, ABRAHAM");
      name = "Cosmo Simpson, Bart Jojo";
      expect(IlsClient.formatPatronName(name)).toEqual(
        "COSMO SIMPSON, BART JOJO"
      );
    });
  });

  describe("agencyField", () => {
    it("returns an object with a key of '158' and an object value", () => {
      const agency = "202";
      const fixedFields = {};
      const agencyField = IlsClient.agencyField(agency, fixedFields);

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

      const agencyField = IlsClient.agencyField(agency, fixedFields);

      expect(agencyField).toEqual({
        ...fixedFields,
        158: {
          label: "AGENCY",
          value: agency,
        },
      });
    });
  });

  describe("notificationField", () => {
    it("returns an object with a key of '268' and an object value", () => {
      let notifications = false;
      let agencyField = IlsClient.notificationField(notifications, {});

      // If the patron doesn't want notifications, it reflects in the
      // `value` property as "-".
      expect(agencyField["268"].value).toEqual("-");
      expect(agencyField).toEqual({
        268: {
          label: "NOTICE PREFERENCE",
          value: constants.NO_NOTICE_PREF,
        },
      });

      notifications = true;
      agencyField = IlsClient.notificationField(notifications, {});
      // If the patron does want notifications, it reflects in the `value`
      // property as "z".
      expect(agencyField["268"].value).toEqual("z");
      expect(agencyField).toEqual({
        268: {
          label: "NOTICE PREFERENCE",
          value: constants.EMAIL_NOTICE_PREF,
        },
      });
    });

    it("adds on to an existing fixedFields object", () => {
      const notification = true;
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

      const agencyField = IlsClient.notificationField(
        notification,
        fixedFields
      );

      expect(agencyField).toEqual({
        ...fixedFields,
        268: {
          label: "NOTICE PREFERENCE",
          value: constants.EMAIL_NOTICE_PREF,
        },
      });
    });
  });

  // The preference object being sent to the ILS is in the form of:
  // { patronCodes: { pcode1: "s" } }
  describe("ecommunicationsPref", () => {
    // The not subscribed content string is '-'.
    it("returns a not subscribed preference", () => {
      const subscribed = false;
      let patronCodes = {};
      patronCodes = IlsClient.ecommunicationsPref(subscribed, patronCodes);

      expect(patronCodes.pcode1).toEqual(
        constants.NOT_SUBSCRIBED_ECOMMUNICATIONS_PREF
      );
      expect(patronCodes.pcode1).toEqual("-");
      expect(patronCodes).toEqual({ pcode1: "-" });
    });

    // The subscribed content string is 's'.
    it("returns a subscribed preference", () => {
      const subscribed = true;
      let patronCodes = {};
      patronCodes = IlsClient.ecommunicationsPref(subscribed, patronCodes);

      expect(patronCodes.pcode1).toEqual(
        constants.SUBSCRIBED_ECOMMUNICATIONS_PREF
      );
      expect(patronCodes.pcode1).toEqual("s");
      expect(patronCodes).toEqual({ pcode1: "s" });
    });

    it("merges any existing patronCode values", () => {
      const subscribed = true;
      let patronCodes = { pcode2: "some value", pcode3: "another value" };

      patronCodes = IlsClient.ecommunicationsPref(subscribed, patronCodes);

      expect(patronCodes).toEqual({
        pcode1: "s",
        pcode2: "some value",
        pcode3: "another value",
      });
    });
  });

  // The patron object being sent to the ILS.
  describe("formatPatronData", () => {
    let mockClient;
    let ilsClient;
    beforeAll(() => {
      mockClient = {
        get: jest.fn().mockRejectedValueOnce(mockedErrorResponse),
      };
      ilsClient = new IlsClient(
        {
          createUrl,
          findUrl,
        },
        mockClient
      );
    });
    const address = new Address(
      {
        line1: "476 5th Avenue",
        city: "New York",
        state: "NY",
        zip: "10018",
        isResidential: true,
        hasBeenValidated: true,
      },
      "soLicenseKey"
    );
    const policy = Policy({ policyType: "webApplicant" });

    it("returns an ILS-ready patron object", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      const card = {
        worksInNYCity: () => false,
        address,
        name: normalizeName("First Middle Last"),
        username: "username",
        password: "MyLib1731@!",
        birthdate: new Date("01/01/1988"),
        email: "email@gmail.com",
        policy,
        location: "nyc",
        ilsClient: ilsClient,
        varFields: [{ fieldTag: "x", content: "DEPENDENT OF 1234" }],
        acceptTerms: true,
        ageGate: true,
        ptype: 9,
        expirationDate: new Date(1988, 1, 1),
        agency: "198",
      };
      const formatted = IlsClient.formatPatronData(card);

      expect(formatted.names).toEqual(["LAST, FIRST MIDDLE"]);
      // This object returns "pin" since that's what the ILS API expects,
      // but we use the name "password" everywhere else.
      expect(formatted.pin).toEqual("MyLib1731@!");
      expect(formatted.patronType).toEqual(9);
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
          value: "198",
        },
        "268": {
          label: "NOTICE PREFERENCE",
          value: "-",
        },
      });
    });
  });

  // Creates a patron in the ILS.
  describe("createPatron", () => {
    let formatPatronData = IlsClient.formatPatronData;
    let mockClient;
    let ilsClient;
    beforeAll(() => {
      IlsClient.formatPatronData = () => ({});

      mockClient = {
        post: jest
          .fn()
          .mockRejectedValueOnce(mockedErrorResponse)
          .mockResolvedValueOnce(mockedSuccessfulResponse)
          .mockRejectedValueOnce(mockedILSIntegrationError),
      };
      ilsClient = new IlsClient(
        {
          createUrl,
          findUrl,
        },
        mockClient
      );
    });
    afterAll(() => {
      IlsClient.formatPatronData = formatPatronData;
    });

    const mockedSuccessfulResponse = {
      link: "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/1234",
    };

    it("fails to create a patron", async () => {
      const patron = await ilsClient.createPatron({});
      expect(patron).toEqual(mockedErrorResponse.response);
      expect(mockClient.post).toHaveBeenCalledWith(createUrl, {});
    });

    it("successfully creates a patron", async () => {
      const patron = await ilsClient.createPatron({});

      expect(patron).toEqual(mockedSuccessfulResponse);
      expect(mockClient.post).toHaveBeenCalledWith(createUrl, {});
    });

    it("fails attempasswordg to call the ILS", async () => {
      await expect(ilsClient.createPatron()).rejects.toEqual(
        new ILSIntegrationError(
          "The ILS could not be requested when attempting to create a patron."
        )
      );
    });
  });

  // Updates a patron in the ILS.
  describe("updatePatron", () => {
    let mockClient;
    let ilsClient;
    beforeAll(() => {
      IlsClient.formatPatronData = () => ({});
      mockClient = {
        put: jest
          .fn()
          .mockRejectedValueOnce(mockedErrorResponse)
          .mockResolvedValueOnce(mockedSuccessfulResponse)
          .mockRejectedValueOnce(mockedInvalidErrorResponse)
          .mockRejectedValueOnce(mockedILSIntegrationError),
      };
      ilsClient = new IlsClient(
        {
          createUrl,
          findUrl,
        },
        mockClient
      );
    });
    const mockedSuccessfulResponse = {};
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

    it("fails to update a patron", async () => {
      await expect(
        ilsClient.updatePatron(patronId, updatedFields)
      ).rejects.toThrow("Patron record not found");
      expect(mockClient.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields
      );
    });

    it("updates a patron", async () => {
      const response = await ilsClient.updatePatron(patronId, updatedFields);
      expect(response).toEqual(mockedSuccessfulResponse);
      expect(mockClient.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields
      );
    });

    it("should throw an error with invalid data to update", async () => {
      await expect(
        ilsClient.updatePatron(patronId, updatedFields)
      ).rejects.toThrow("Invalid request to ILS: Invalid JSON request");
      expect(mockClient.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields
      );
    });

    it("should throw an error if hitting the ILS throws an error", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      mockClient.put.mockImplementationOnce(() =>
        Promise.reject(mockedILSIntegrationError)
      );

      await expect(
        ilsClient.updatePatron(patronId, updatedFields)
      ).rejects.toThrow(
        "The ILS could not be requested when attempting to update a patron."
      );
      expect(mockClient.put).toHaveBeenCalledWith(
        `${createUrl}${patronId}`,
        updatedFields
      );
    });
  });

  describe("getPatronFromBarcodeOrUsername", () => {
    let mockClient;
    let ilsClient;
    beforeAll(() => {
      mockClient = {
        put: jest.fn(),
        get: jest
          .fn()
          .mockRejectedValueOnce(mockedErrorResponse)
          .mockRejectedValueOnce(mockedErrorResponseDup)
          .mockRejectedValueOnce(mockedILSIntegrationError)
          .mockResolvedValueOnce(mockedSuccessfulResponse)
          .mockResolvedValueOnce(mockedSuccessfulResponse),
        post: jest.fn(),
      };
      ilsClient = new IlsClient(
        {
          createUrl,
          findUrl,
        },
        mockClient
      );
    });
    it("can't find the patron", async () => {
      // This is testing the username but the barcode will return the same error.
      const username = "username1";
      const isBarcode = false;

      // Mocking that the call to the ILS was not successful.

      const usernameFieldTag = constants.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        username,
        isBarcode
      );

      expect(patron.data.id).toBeUndefined();
      expect(patron.data.name).toEqual("Record not found");
      expect(mockClient.get).toHaveBeenCalledWith(
        `${findUrl}${expectedParams}`
      );
    });

    it("found more than one patron with the same username or barcode", async () => {
      // This is testing the username but the barcode will return the same error.
      const username = "username1";
      const isBarcode = false;

      // Mocking that the call to the ILS was not successful.

      const usernameFieldTag = constants.USERNAME_FIELD_TAG;
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
      expect(mockClient.get).toHaveBeenCalledWith(
        `${findUrl}${expectedParams}`
      );
    });

    it("returns an error because the request to the ILS failed", async () => {
      // This is testing the username but the barcode will return the same error.
      const username = "username1";
      const isBarcode = false;

      // Mocking that the call to the ILS was not successful.

      const usernameFieldTag = constants.USERNAME_FIELD_TAG;
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
      expect(mockClient.get).toHaveBeenCalledWith(
        `${findUrl}${expectedParams}`
      );
    });
    it("calls the ILS with the username parameters", async () => {
      const username = "username1";
      const isBarcode = false;
      const usernameFieldTag = constants.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        username,
        isBarcode
      );

      expect(patron.id).toEqual("1234");
      expect(patron.patronType).toEqual(10);
      expect(mockClient.get).toHaveBeenCalledWith(
        `${findUrl}${expectedParams}`
      );
    });
    it("calls the ILS with the barcode parameters", async () => {
      const barcode = "999999999";
      const isBarcode = true;
      const barcodeFieldTag = constants.BARCODE_FIELD_TAG;
      const expectedParams = `?varFieldTag=${barcodeFieldTag}&varFieldContent=${barcode}&fields=patronType,varFields,names,addresses,emails,expirationDate`;

      const patron = await ilsClient.getPatronFromBarcodeOrUsername(
        barcode,
        isBarcode
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        `${findUrl}${expectedParams}`
      );
      expect(patron.id).toEqual("1234");
      expect(patron.patronType).toEqual(10);
    });
  });

  // Checks a barcode or username availability. Internally, `available`
  // calls `getPatronFromBarcodeOrUsername` which is tested above.
  describe("available", () => {
    describe("barcode", () => {
      let mockClient;
      let ilsClient;
      beforeAll(() => {
        mockClient = {
          put: jest.fn(),

          get: jest
            .fn()
            //successful response means barcode was found, therefore not available
            .mockResolvedValueOnce(mockedSuccessfulResponse)
            .mockRejectedValueOnce(mockedErrorResponseDup)
            //successful response means barcode was not found, therefore available
            .mockRejectedValueOnce(mockedErrorResponse)
            .mockRejectedValueOnce(mockedILSIntegrationError)
            .mockResolvedValueOnce(mockedSuccessfulResponse),
          post: jest.fn(),
        };
        ilsClient = new IlsClient(
          {
            createUrl,
            findUrl,
          },
          mockClient
        );
      });
      const barcode = "12341234123412";
      const barcodeFieldTag = constants.BARCODE_FIELD_TAG;
      const expectedParams = `?varFieldTag=${barcodeFieldTag}&varFieldContent=${barcode}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const isBarcode = true;

      it("checks for barcode availability and finds an existing patron, so it is not available", async () => {
        const available = await ilsClient.available(barcode, isBarcode);

        expect(available).toEqual(false);
        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });

      it("checks for barcode availability and gets a server error and duplicate, so it is not available", async () => {
        const available = await ilsClient.available(barcode, isBarcode);

        expect(available).toEqual(false);
        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });

      it("checks for barcode availability and doesn't find an existing patron, so it is available", async () => {
        const available = await ilsClient.available(barcode, isBarcode);

        expect(available).toEqual(true);
        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });

      it("throws an error if the ILS cannot be called", async () => {
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

        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });
    });

    describe("username", () => {
      let mockClient;
      let ilsClient;
      beforeAll(() => {
        mockClient = {
          put: jest.fn(),

          get: jest
            .fn()
            //successful response means barcode was found, therefore not available
            .mockResolvedValueOnce(mockedSuccessfulResponse)
            .mockRejectedValueOnce(mockedErrorResponseDup)
            //successful response means barcode was not found, therefore available
            .mockRejectedValueOnce(mockedErrorResponse)
            .mockRejectedValueOnce(mockedILSIntegrationError)
            .mockResolvedValueOnce(mockedSuccessfulResponse),
          post: jest.fn(),
        };
        ilsClient = new IlsClient(
          {
            createUrl,
            findUrl,
          },
          mockClient
        );
      });
      const username = "username";
      const usernameFieldTag = constants.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}&fields=patronType,varFields,names,addresses,emails,expirationDate`;
      const isBarcode = false;

      it("checks for username availability and finds an existing patron, so it is not available", async () => {
        // Mocking that the call to the ILS was successful and a patron
        // was found. This means that the username is already taken and
        // therefore not available. So, return false.
        mockClient.get.mockImplementationOnce(() =>
          Promise.resolve(mockedSuccessfulResponse)
        );

        const available = await ilsClient.available(username, isBarcode);

        expect(available).toEqual(false);
        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });

      it("checks for username availability and gets a server error and duplicate, so it is not available", async () => {
        mockClient.get.mockImplementationOnce(() =>
          Promise.resolve(mockedErrorResponseDup)
        );

        const available = await ilsClient.available(username, isBarcode);

        expect(available).toEqual(false);
        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });

      it("checks for username availability and doesn't find an existing patron, so it is available", async () => {
        // Mocking that the call to the ILS was not successful and it returned
        // an error. This means that a patron was not found and so the
        // username is not taken and therefore available. Return true.
        mockClient.get.mockImplementationOnce(() =>
          Promise.reject(mockedErrorResponse)
        );

        const available = await ilsClient.available(username, isBarcode);

        expect(available).toEqual(true);
        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });

      it("throws an error if the ILS cannot be called", async () => {
        // Mocking that the call to the ILS did not go through and we received
        // a 500 error. Return a 502 error.
        mockClient.get.mockImplementationOnce(() =>
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

        expect(mockClient.get).toHaveBeenCalledWith(
          `${findUrl}${expectedParams}`
        );
      });
    });
  });
});
