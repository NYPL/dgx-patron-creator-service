/* eslint-disable */
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const Address = require("../../../../api/models/v0.3/modelAddress");
const Policy = require("../../../../api/models/v0.3/modelPolicy");
const { Card } = require("../../../../api/models/v0.3/modelCard");
const axios = require("axios");
const { ILSIntegrationError } = require("../../../../api/helpers/errors");

jest.mock("axios");

describe("IlsClient", () => {
  beforeEach(() => {
    axios.mockClear();
  });

  // The preference object being sent to the ILS is in the form of:
  // { patronCodes: { pcode1: "s" } }
  describe("ecommunicationsPref", () => {
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

  // The address object being sent to the ILS is in the form of:
  // { lines: ['line 1', 'line 2'], type: 'a' }
  describe("formatAddress", () => {
    const ilsClient = IlsClient({});
    const address = new Address({
      line1: "476 5th Avenue",
      city: "New York",
      state: "New York",
      zip: "10018",
    });

    // The primary address type is 'a'.
    it("returns a primary address object for the ILS", () => {
      const isWorkAddress = false;
      const formattedAddress = ilsClient.formatAddress(address, isWorkAddress);

      expect(formattedAddress.lines).toEqual([
        "476 5th Avenue",
        "New York, New York 10018",
      ]);
      expect(formattedAddress.type).toEqual(IlsClient.ADDRESS_FIELD_TAG);
      expect(formattedAddress.type).toEqual("a");
    });

    // The work address type is 'h'.
    it("returns a work address object for the ILS", () => {
      const isWorkAddress = true;
      const formattedAddress = ilsClient.formatAddress(address, isWorkAddress);

      expect(formattedAddress.lines).toEqual([
        "476 5th Avenue",
        "New York, New York 10018",
      ]);
      expect(formattedAddress.type).toEqual(IlsClient.WORK_ADDRESS_FIELD_TAG);
      expect(formattedAddress.type).toEqual("h");
    });
  });

  // Checks a barcode or username availability.
  describe("available", () => {
    const findUrl = "ils/find/endpoint";
    const ilsToken = "ilsToken";
    const ilsClient = IlsClient({ findUrl, ilsToken });
    const mockedSuccessfulResponse = {
      status: 200,
      data: {
        id: "1234",
        // Other ILS patron fields which aren't necessary to test
        // for availability
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
        },
      },
    };
    const mockedILSIntegrationError = {
      response: {
        status: 500,
      },
    };

    describe("barcode", () => {
      const barcode = "12341234123412";
      const barcodeFieldTag = IlsClient.BARCODE_FIELD_TAG;
      const expectedParams = `?varFieldTag=${barcodeFieldTag}&varFieldContent=${barcode}`;
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
            Authorization: `Bearer ${ilsToken}`,
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
            Authorization: `Bearer ${ilsToken}`,
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
            Authorization: `Bearer ${ilsToken}`,
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
            Authorization: `Bearer ${ilsToken}`,
          },
        });
      });
    });

    describe("username", () => {
      const username = "username";
      const usernameFieldTag = IlsClient.USERNAME_FIELD_TAG;
      const expectedParams = `?varFieldTag=${usernameFieldTag}&varFieldContent=${username}`;
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
            Authorization: `Bearer ${ilsToken}`,
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
            Authorization: `Bearer ${ilsToken}`,
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
            Authorization: `Bearer ${ilsToken}`,
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
            Authorization: `Bearer ${ilsToken}`,
          },
        });
      });
    });
  });

  // The patron object being sent to the ILS.
  describe("formatPatronData", () => {
    const ilsClient = IlsClient({});
    const address = new Address({
      line1: "476 5th Avenue",
      city: "New York",
      state: "New York",
      zip: "10018",
    });
    const policy = Policy({ policyType: "webApplicant" });
    const card = new Card({
      name: "First Last",
      username: "username",
      pin: "1234",
      birthdate: "01/01/1988",
      address,
      policy,
      ilsClient: IlsClient({}),
    });

    it("returns an ILS-ready patron object", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      const mockedErrorResponse = {
        response: {
          status: 404,
          data: {
            name: "Record not found",
          },
        },
      };
      axios.get.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponse)
      );

      // Make sure we have a validated card.
      await card.validate();
      // Mock that the ptype was added to the card.
      card.setPtype();
      const formatted = ilsClient.formatPatronData(card);

      expect(formatted.names).toEqual(["First Last"]);
      expect(formatted.pin).toEqual("1234");
      // Web applicants are ptype of 1.
      expect(formatted.patronType).toEqual(1);
      expect(formatted.birthDate).toEqual("1988-01-01");
      expect(formatted.addresses).toEqual([
        {
          lines: ["476 5th Avenue", "New York, New York 10018"],
          type: "a",
        },
      ]);
      // The patron is not subscribed to e-communications by default.
      expect(formatted.patronCodes).toEqual({ pcode1: "-" });
      // Username is special and goes in a varField
      expect(formatted.varFields).toEqual([
        { fieldTag: "u", content: "username" },
      ]);
    });
  });

  // Creates a patron in the ILS.
  describe("createPatron", () => {
    const createUrl = "ils/find/endpoint";
    const ilsToken = "ilsToken";
    const ilsClient = IlsClient({ createUrl, ilsToken });
    const mockedSuccessfulResponse = {
      status: 200,
      data: {
        link:
          "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/1234",
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
    const mockedFailedPatron = {
      response: {
        status: 404,
      },
    };
    const mockedILSIntegrationError = {
      response: {
        status: 500,
      },
    };
    const address = new Address({
      line1: "476 5th Avenue",
      city: "New York",
      state: "New York",
      zip: "10018",
    });
    const policy = Policy({ policyType: "webApplicant" });
    const card = new Card({
      name: "First Last",
      username: "username",
      pin: "1234",
      birthdate: "01/01/1988",
      address,
      policy,
      ilsClient: IlsClient({}),
    });
    // Mock that the ptype was added to the card.
    card.setPtype();

    // Mocking current expiration date.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const expirationDate = new Date(currentYear, currentMonth, currentDay + 90);

    it("fails to create a patron", async () => {
      // We want to mock that we called the ILS and it did not find a
      // username, so it is valid and the card is valid.
      axios.get.mockImplementationOnce(() =>
        Promise.reject(mockedErrorResponse)
      );
      await card.validate();

      // Now mock the POST request to the ILS.
      axios.post.mockImplementationOnce(() =>
        Promise.reject(mockedFailedPatron)
      );

      const patron = await ilsClient.createPatron(card);
      expect(patron).toEqual(mockedFailedPatron.response);
      expect(axios.post).toHaveBeenCalledWith(
        createUrl,
        {
          addresses: [
            {
              lines: ["476 5th Avenue", "New York, New York 10018"],
              type: "a",
            },
          ],
          birthDate: "1988-01-01",
          expirationDate: expirationDate.toISOString().slice(0, 10),
          // The patron is not subscribed to e-communications by default.
          patronCodes: { pcode1: "-" },
          names: ["First Last"],
          patronType: 1,
          pin: "1234",
          varFields: [{ content: "username", fieldTag: "u" }],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ilsToken}`,
          },
        }
      );
    });

    it("successfully creates a patron", async () => {
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
              lines: ["476 5th Avenue", "New York, New York 10018"],
              type: "a",
            },
          ],
          birthDate: "1988-01-01",
          expirationDate: expirationDate.toISOString().slice(0, 10),
          patronCodes: { pcode1: "-" },
          names: ["First Last"],
          patronType: 1,
          pin: "1234",
          varFields: [{ content: "username", fieldTag: "u" }],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ilsToken}`,
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
});
