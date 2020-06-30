/* eslint-disable */
const AddressValidationAPI = require("../../../../api/controllers/v0.3/AddressValidationAPI");
const ServiceObjectsClient = require("../../../../api/controllers/v0.3/ServiceObjectsClient");
const Address = require("../../../../api/models/v0.3/modelAddress");
const {
  SOAuthorizationError,
  SOIntegrationError,
  SODomainSpecificError,
  SONoLicenseKeyError,
} = require("../../../../api/helpers/errors");

jest.mock("../../../../api/controllers/v0.3/ServiceObjectsClient");

const outsideNYAddress = {
  line1: "24 Kilmer Rd #357",
  city: "Edison",
  state: "NJ",
  zip: "08817",
};
const outsideNYresponseAddress = {
  Address1: "24 Kilmer Rd #357",
  Address2: "",
  City: "Edison",
  State: "NJ",
  Zip: "08817",
  IsResidential: true,
};
const rawAddress1 = {
  line1: "476 5th Avenue",
  city: "New York",
  state: "NY",
  zip: "10018",
};
const rawAddress2 = {
  line1: "476 5th Avenue",
  line2: "ATTN: Someone",
  city: "New York",
  state: "NY",
  zip: "10018",
};
const responseAddress1 = {
  Address1: "476 5th Avenue",
  Address2: "",
  City: "New York",
  State: "NY",
  Zip: "10018",
  IsResidential: true,
};
const responseAddress2 = {
  Address1: "476 5th Avenue",
  Address2: "ATTN: Someone",
  City: "New York",
  State: "NY",
  Zip: "10018",
  IsResidential: true,
};

describe("AddressValidationAPI", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    ServiceObjectsClient.mockClear();
  });

  // Get address, policyType - returns response object
  // `validate` will only throw an error if no license key was passed.
  // Otherwise, it will always return a response even if SO threw an error.
  // This is because we want to still check the address and return a temporary
  // card in the situation where SO is down.
  describe("validate", () => {
    const soLicenseKey = "licenseKey";

    it("throws an error if no license key is passed", async () => {
      const { validate } = AddressValidationAPI();

      await expect(validate()).rejects.toThrow(SONoLicenseKeyError);
      await expect(validate()).rejects.toThrowError(
        "No credentials for Service Objects were passed in AddressValidationAPI."
      );
    });

    it("returns an authorization error from Service Objects", async () => {
      // SO `validateAddress` throws an authorization error.
      ServiceObjectsClient.mockImplementation(() => ({
        validateAddress: () =>
          Promise.reject(
            new SOAuthorizationError(
              "1",
              "Please provide a valid license key for this web service."
            )
          ),
      }));

      const { validate } = AddressValidationAPI({ soLicenseKey });

      const response = await validate(rawAddress1);

      // The response is a validation of the address, this is then passed to
      // the next step which checks for policy and if it's eligible for a
      // temporary card, but not a responsibility of this API.
      expect(response).toEqual({
        error: {
          code: "1",
          message:
            "SO Authorization Error: Please provide a valid license key for this web service.",
          name: "SOAuthorizationError",
          status: 502,
          type: "service-objects-authorization-error",
        },
        message: "Unrecognized address.",
        originalAddress: {
          city: "New York",
          line1: "476 5th Avenue",
          state: "NY",
          zip: "10018",
        },
        status: 400,
        // It's unrecognized by SO since it couldn't go through validation.
        type: "unrecognized-address",
      });
    });

    it("throws an integration error from Service Objects", async () => {
      // SO `validateAddress` throws an integration error.
      ServiceObjectsClient.mockImplementation(() => ({
        validateAddress: () =>
          Promise.reject(new SOIntegrationError("something went wrong")),
      }));

      const { validate } = AddressValidationAPI({ soLicenseKey });

      // And it bubbles up to the `validate` call.
      const response = await validate(rawAddress1);
      expect(response).toEqual({
        error: {
          message: "something went wrong",
          name: "SOIntegrationError",
          status: 502,
          type: "service-objects-integration-error",
        },
        message: "Unrecognized address.",
        originalAddress: {
          city: "New York",
          line1: "476 5th Avenue",
          state: "NY",
          zip: "10018",
        },
        status: 400,
        type: "unrecognized-address",
      });
    });

    it("returns a response with the wrong address for a domain specific error", async () => {
      const addressNotFound = {
        Type: "Domain Specific",
        TypeCode: "4",
        Desc: "Address not found",
        DescCode: "1",
      };
      // SO throws a domain specific error...
      ServiceObjectsClient.mockImplementation(() => ({
        validateAddress: () =>
          Promise.reject(
            new SODomainSpecificError(
              addressNotFound["DescCode"],
              addressNotFound["Desc"]
            )
          ),
      }));

      const { validate } = AddressValidationAPI({ soLicenseKey });

      // ...but `validate` returns a response.
      const response = await validate(rawAddress1);
      expect(response).toEqual({
        status: 400,
        type: "unrecognized-address",
        error: {
          code: "1",
          message: "Address not found",
          name: "SODomainSpecificError",
          status: 502,
          type: "service-objects-domain-specific-error",
        },
        message: "Unrecognized address.",
        originalAddress: rawAddress1,
      });
    });

    // Same as above but different error from SO.
    it("returns a response with the wrong address for a domain specific error", async () => {
      const streetNotFound = {
        Type: "Domain Specific",
        TypeCode: "4",
        Desc: "Street not found",
        DescCode: "7",
      };
      ServiceObjectsClient.mockImplementation(() => ({
        validateAddress: () =>
          Promise.reject(
            new SODomainSpecificError(
              streetNotFound["DescCode"],
              streetNotFound["Desc"]
            )
          ),
      }));

      const { validate } = AddressValidationAPI({ soLicenseKey });
      const response = await validate(rawAddress1);
      expect(response).toEqual({
        status: 400,
        type: "unrecognized-address",
        message: "Unrecognized address.",
        originalAddress: rawAddress1,
        error: {
          code: "7",
          message: "Street not found",
          name: "SODomainSpecificError",
          status: 502,
          type: "service-objects-domain-specific-error",
        },
      });
    });

    // Only one test here because `validate` returns what `parseResponse`
    // returns and that is tested below with more cases and policy types.
    it("returns a response with valid address, simplye policy", async () => {
      ServiceObjectsClient.mockImplementation(() => ({
        validateAddress: () => Promise.resolve([responseAddress1]),
      }));
      const policyType = "simplye";
      const isWorkAddress = false;
      const { validate } = AddressValidationAPI({ soLicenseKey });
      const response = await validate(rawAddress1, isWorkAddress, policyType);

      expect(response).toEqual({
        type: "valid-address",
        message: "Valid address.",
        address: {
          ...rawAddress1,
          line2: "",
          isResidential: true,
          hasBeenValidated: true,
        },
        originalAddress: rawAddress1,
      });
    });
  });

  // Transforms an address response object from SO into an Address instance.
  describe("createAddressFromResponse", () => {
    ServiceObjectsClient.mockImplementation(() => ({}));
    const { createAddressFromResponse } = AddressValidationAPI();

    it("returns undefined if no object was passed", () => {
      expect(createAddressFromResponse()).toBeUndefined();
    });

    it("returns an object with Address-like values", () => {
      const address = createAddressFromResponse(responseAddress1);

      expect(address.line1).toEqual(responseAddress1.Address1);
      expect(address.line2).toEqual(responseAddress1.Address2);
      expect(address.city).toEqual(responseAddress1.City);
      expect(address.state).toEqual(responseAddress1.State);
      expect(address.zip).toEqual(responseAddress1.Zip);
    });

    it("returns a Service Obejcts validated address object", () => {
      const address = createAddressFromResponse(responseAddress1);
      expect(address.hasBeenValidated).toEqual(true);
    });
  });

  describe("alternateAddressesResponse", () => {
    ServiceObjectsClient.mockImplementation(() => ({}));
    const {
      alternateAddressesResponse,
      createAddressFromResponse,
    } = AddressValidationAPI();

    // "alternateAddressesResponse" only gets called when there are alternate
    // addresses, so this case should not happen in real life.
    it("returns an 'alternate addresses' response even if no addresses were passed", () => {
      const emptyAlternates = [];

      expect(alternateAddressesResponse()).toEqual({
        type: "alternate-addresses",
        message: "Alternate addresses have been identified.",
        addresses: [],
        originalAddress: {},
      });

      expect(alternateAddressesResponse(emptyAlternates)).toEqual({
        type: "alternate-addresses",
        message: "Alternate addresses have been identified.",
        addresses: [],
        originalAddress: {},
      });
    });

    it("returns all alternate addresses in the response object", () => {
      const addresses = [rawAddress1, rawAddress2];
      const originalAddress = rawAddress1;

      expect(alternateAddressesResponse(addresses, originalAddress)).toEqual({
        type: "alternate-addresses",
        message: "Alternate addresses have been identified.",
        addresses: [rawAddress1, rawAddress2],
        originalAddress,
      });
    });
  });

  describe("parseResponse", () => {
    ServiceObjectsClient.mockImplementation(() => ({}));
    const { createAddressFromResponse, parseResponse } = AddressValidationAPI();

    it("returns an 'unrecognized-address' response if no addresses are passed", () => {
      const addresses = undefined;
      const errors = undefined;
      expect(parseResponse(addresses, errors, rawAddress1)).toEqual({
        type: "unrecognized-address",
        originalAddress: rawAddress1,
        message: "Unrecognized address.",
        error: {},
        status: 400,
      });
    });

    it("returns an 'alternate-address' response", () => {
      // These are address objects that Service Objects returns.
      const responseAddresses = [responseAddress1, responseAddress2];
      // They need to be converted to address objects to verify the test.
      const addresses = responseAddresses.map(createAddressFromResponse);
      const errors = {};

      expect(parseResponse(responseAddresses, errors, rawAddress1)).toEqual({
        status: 400,
        type: "alternate-addresses",
        message: "Alternate addresses have been identified.",
        addresses,
        originalAddress: rawAddress1,
      });
    });

    it("returns a 'valid-address' response but card denied if address is outside NY", () => {
      const isWorkAddress = undefined;
      const policyType = "simplye";
      const errors = {};
      const response = parseResponse(
        [outsideNYresponseAddress],
        errors,
        outsideNYAddress,
        isWorkAddress,
        policyType
      );
      const address = new Address({ ...outsideNYAddress, isResidential: true });

      expect(response).toEqual({
        type: "valid-address",
        message: "Valid address.",
        address: {
          ...address.address,
          county: undefined,
          hasBeenValidated: true,
        },
        originalAddress: outsideNYAddress,
      });
    });

    it("returns a 'valid-address' response for simplye policy", () => {
      const isWorkAddress = false;
      const policyType = "simplye";
      const errors = {};
      const response = parseResponse(
        [responseAddress1],
        errors,
        rawAddress1,
        isWorkAddress,
        policyType
      );

      expect(response).toEqual({
        type: "valid-address",
        message: "Valid address.",
        address: {
          ...rawAddress1,
          county: undefined,
          line2: "",
          isResidential: true,
          hasBeenValidated: true,
        },
        originalAddress: rawAddress1,
      });
    });

    it("returns a 'valid-address' response for webApplicant policy", () => {
      const isWorkAddress = false;
      const policyType = "webApplicant";
      const errors = {};
      const response = parseResponse(
        [responseAddress1],
        errors,
        rawAddress1,
        isWorkAddress,
        policyType
      );
      const address = new Address({ ...rawAddress1, isResidential: true });

      expect(response).toEqual({
        type: "valid-address",
        message: "Valid address.",
        address: {
          ...address.address,
          county: undefined,
          hasBeenValidated: true,
        },
        originalAddress: rawAddress1,
      });
    });
  });
});
