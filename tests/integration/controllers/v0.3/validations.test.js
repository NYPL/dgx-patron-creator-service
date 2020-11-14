const axios = require("axios");

const generateUsernameOptions = (username) => ({
  method: "post",
  url: "http://localhost:3001/api/v0.3/validations/username",
  data: { username },
});
const generateAddressOptions = (data) => ({
  url: "http://localhost:3001/api/v0.3/validations/address",
  method: "POST",
  data,
});
const generateDependentEligiblityURL = (query) =>
  `http://localhost:3001/api/v0.3/patrons/dependent-eligibility?${query}`;

if (process.env.INTEGRATION_TESTS === "true") {
  console.log("*** Running integration tests ***");
  console.log("*** Make sure the server is running in another tab. ***");

  describe("v0.3/validations/username", () => {
    test("should return an available username response for new usernames", async () => {
      // "Random" name that should always be available. Sometimes the random
      // algorithm still fails so hardcoding one instead.
      const usernameOptions = generateUsernameOptions("1qausername123456789");
      const response = await axios(usernameOptions);

      expect(response.status).toEqual(200);
      expect(response.data.type).toEqual("available-username");
      expect(response.data.message).toEqual("This username is available.");
    });

    test("should return an unavailable username response", async () => {
      const usernameOptions = generateUsernameOptions("nyplusername");
      let error;
      try {
        await axios(usernameOptions);
      } catch (e) {
        error = e.response.data;
      }

      expect(error.status).toEqual(400);
      expect(error.type).toEqual("unavailable-username");
      expect(error.title).toEqual("Bad Username");
      expect(error.detail).toEqual(
        "This username is unavailable. Please try another."
      );
    });

    test("should return an invalid username response", async () => {
      const usernameOptions = generateUsernameOptions("nypl--");
      let error;
      try {
        await axios(usernameOptions);
      } catch (e) {
        error = e.response.data;
      }

      expect(error.status).toEqual(400);
      expect(error.type).toEqual("invalid-username");
      expect(error.title).toEqual("Bad Username");
      expect(error.detail).toEqual(
        "Usernames should be 5-25 characters, letters or numbers only. Please revise your username."
      );
    });
  });

  describe("v0.3/validations/address", () => {
    test("should return a valid standard address response", async () => {
      const data = {
        address: {
          line1: "476 5th Ave",
          city: "New York",
          state: "NY",
          zip: "10018",
          isResidential: false,
        },
        isWorkAddress: false,
        policyType: "webApplicant",
      };
      const addressOptions = generateAddressOptions(data);
      const response = await axios(addressOptions);

      expect(response.data).toEqual({
        status: 200,
        type: "valid-address",
        title: "Valid address",
        address: {
          ...data.address,
          line2: "",
          county: "New York",
          zip: "10018-2788",
          hasBeenValidated: true,
        },
        originalAddress: {
          ...data.address,
          line2: "",
          county: "",
        },
      });
    });

    test("should return a invalid address response", async () => {
      const data = {
        address: {
          line1: "476 5th Ave",
          city: "New York",
          state: "",
          zip: "",
          isResidential: false,
        },
        isWorkAddress: false,
        policyType: "webApplicant",
      };
      const addressOptions = generateAddressOptions(data);
      let error;
      try {
        await axios(addressOptions);
      } catch (e) {
        error = e.response.data;
      }

      expect(error).toEqual({
        error: {
          state: "state cannot be empty",
          zip: "zip cannot be empty",
        },
        originalAddress: {
          ...data.address,
          line2: "",
          county: "",
        },
        status: 400,
        type: "invalid-request",
        title: "Invalid Request",
        detail: "Address validation error",
        // Dups that older clients expect.
        name: "Invalid Request",
        message: "Address validation error",
      });
    });

    test("should return an alternate address response", async () => {
      const data = {
        address: {
          line1: "37 61",
          city: "New York",
          state: "NY",
          zip: "10018",
          isResidential: false,
        },
        isWorkAddress: false,
        policyType: "webApplicant",
      };
      const addressOptions = generateAddressOptions(data);
      let error;
      try {
        await axios(addressOptions);
      } catch (e) {
        error = e.response.data;
      }

      expect(error).toEqual({
        status: 400,
        type: "alternate-addresses",
        title: "Alternate addresses have been identified",
        cardType: null,
        detail:
          "The entered address is ambiguous and will not result in a library card.",
        originalAddress: {
          ...data.address,
          line2: "",
          county: "",
        },
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
    });
  });

  describe("v0.3/validations/patrons/dependent-eligibility", () => {
    test("should return a patron eligible response with username or barcode", async () => {
      let url = generateDependentEligiblityURL("username=testUsername1");
      let response = await axios(url);
      expect(response.data).toEqual({
        status: 200,
        eligible: true,
        description: "This patron can create dependent accounts.",
      });

      url = generateDependentEligiblityURL("barcode=28888055434142");
      response = await axios(url);
      expect(response.data).toEqual({
        status: 200,
        eligible: true,
        description: "This patron can create dependent accounts.",
      });
    });

    test("should return a not found response if the username or barcode does not exist", async () => {
      let url = generateDependentEligiblityURL("username=nypl");
      let error;
      try {
        await axios(url);
      } catch (e) {
        error = e.response.data;
      }

      expect(error).toEqual({
        status: 502,
        type: "patron-not-found",
        title: "Patron Not Found in ILS",
        detail:
          "The patron couldn't be found in the ILS with the barcode or username.",
        // Dups for older clients.
        name: "Patron Not Found in ILS",
        message:
          "The patron couldn't be found in the ILS with the barcode or username.",
      });

      url = generateDependentEligiblityURL("barcode=23333112191113");
      try {
        await axios(url);
      } catch (e) {
        error = e.response.data;
      }

      expect(error).toEqual({
        status: 502,
        type: "patron-not-found",
        title: "Patron Not Found in ILS",
        detail:
          "The patron couldn't be found in the ILS with the barcode or username.",
        // Dups for older clients.
        name: "Patron Not Found in ILS",
        message:
          "The patron couldn't be found in the ILS with the barcode or username.",
      });
    });

    test("should return not eligible response because the account is expired", async () => {
      const url = generateDependentEligiblityURL("username=nyplusername");
      let error;
      try {
        await axios(url);
      } catch (e) {
        error = e.response.data;
      }
      expect(error).toEqual({
        status: 400,
        type: "expired-account",
        title: "Expired Account",
        detail: "Your card has expired. Please try applying again.",
        // Dups for older clients.
        name: "ExpiredAccount",
        message: "Your card has expired. Please try applying again.",
      });
    });

    test("should return invalid responses for empty requests", async () => {
      let url = generateDependentEligiblityURL("username=");
      let error;
      try {
        await axios(url);
      } catch (e) {
        error = e.response.data;
      }
      expect(error).toEqual({
        status: 400,
        type: "invalid-request",
        title: "Invalid Request",
        detail: "No barcode or username passed.",
        // Dups for older clients.
        name: "Invalid Request",
        message: "No barcode or username passed.",
      });

      url = generateDependentEligiblityURL("barcode=");
      error;
      try {
        await axios(url);
      } catch (e) {
        error = e.response.data;
      }
      expect(error).toEqual({
        status: 400,
        type: "invalid-request",
        title: "Invalid Request",
        detail: "No barcode or username passed.",
        // Dups for older clients.
        name: "Invalid Request",
        message: "No barcode or username passed.",
      });
    });

    test("should return invalid responses for bad requests", async () => {
      const url = generateDependentEligiblityURL("barcode=1234");
      let error;
      try {
        await axios(url);
      } catch (e) {
        error = e.response.data;
      }
      expect(error).toEqual({
        status: 400,
        type: "invalid-request",
        title: "Invalid Request",
        detail: "The barcode passed is not a 14-digit or 16-digit number.",
        // Dups for older clients.
        name: "Invalid Request",
        message: "The barcode passed is not a 14-digit or 16-digit number.",
      });
    });
  });
} else {
  console.log("*** Skipping integration tests ***");
  console.log(
    "*** Run integration tests with this command: `INTEGRATION_TESTS=true npm test` ***"
  );
  describe("example test", () => {
    // at least one test is required or else the test suite will not run
    test("always passes", () => {});
  });
}
