const ServiceObjectsClient = require("../../../../api/controllers/v0.3/ServiceObjectsClient");
const axios = require("axios");
const {
  SOAuthorizationError,
  SOIntegrationError,
  SODomainSpecificError,
  SONoLicenseKeyError,
} = require("../../../../api/helpers/errors");

jest.mock("axios");

// Mock responses and errors that axios.get will return.
const authorizationError = {
  Type: "Authorization",
  TypeCode: "1",
  Desc: "Please provide a valid license key for this web service.",
  DescCode: "1",
};
const addressNotFound = {
  Type: "Domain Specific",
  TypeCode: "4",
  Desc: "Address not found",
  DescCode: "1",
};
const streetNotFound = {
  Type: "Domain Specific",
  TypeCode: "4",
  Desc: "Street not found",
  DescCode: "7",
};
const cityNotFound = {
  Type: "Domain Specific",
  TypeCode: "4",
  Desc: "City not found",
  DescCode: "14",
};
const serviceObjectsFatal = {
  Type: "Service Objects Fatal",
  TypeCode: "3",
  Desc: "Unhandled error. Please contact Service Objects.",
  DescCode: "1",
};

describe("ServiceObjectsClient", () => {
  beforeEach(() => {
    axios.mockClear();
  });

  // Function to turn an object it a param string:
  // { key: "value" } => "&key=value"
  describe("generateParamString", () => {
    const { generateParamString } = ServiceObjectsClient();

    it("returns an empty string is no object with values is passed", () => {
      expect(generateParamString()).toEqual("");
      expect(generateParamString({})).toEqual("");
    });

    it("returns a string from the object's key/value pair", () => {
      const object1 = { key1: "value1", key2: "value2" };
      const object2 = { key1: "value1", key2: "value2", key3: "value3" };

      expect(generateParamString(object1)).toEqual("&key1=value1&key2=value2");
      expect(generateParamString(object2)).toEqual(
        "&key1=value1&key2=value2&key3=value3"
      );
    });
  });

  // Service Objects takes specific keys in its address object. This
  // function converts an address object to the SO address object.
  describe("createAddressObjforSO", () => {
    const { createAddressObjforSO } = ServiceObjectsClient();
    const emptySOObject = {
      Address: "",
      Address2: "",
      City: "",
      State: "",
      PostalCode: "",
      LicenseKey: "",
    };

    it("returns an object with empty values if no object with values is passed", () => {
      expect(createAddressObjforSO()).toEqual(emptySOObject);
      expect(createAddressObjforSO({})).toEqual(emptySOObject);
    });

    it("returns a string from the object's key/value pair", () => {
      const address1 = {
        line1: "476 5th Avenue",
        city: "New York",
        state: "NY",
        zip: "10018",
      };
      const address2 = {
        line1: "476 5th Avenue",
        line2: "ATTN: Someone",
        city: "New York",
        state: "NY",
        zip: "10018",
      };

      expect(createAddressObjforSO(address1)).toEqual({
        Address: "476 5th Avenue",
        Address2: "",
        City: "New York",
        State: "NY",
        PostalCode: "10018",
        LicenseKey: "",
      });
      expect(createAddressObjforSO(address2)).toEqual({
        Address: "476 5th Avenue",
        Address2: "ATTN: Someone",
        City: "New York",
        State: "NY",
        PostalCode: "10018",
        LicenseKey: "",
      });
    });
  });

  describe("validateAddress", () => {
    const mockLicenseKey = "licenseKey";
    const { validateAddress } = ServiceObjectsClient(mockLicenseKey);
    const address = {
      line1: "476 5th Avenue",
      city: "New York",
      state: "NY",
      zip: "10018",
    };
    const emptyAddressesResponse = { Addresses: [{}] };

    it("throws an error if no license key is passed", async () => {
      const { validateAddress } = ServiceObjectsClient();
      axios.get.mockImplementation(() => Promise.resolve());
      await expect(validateAddress()).rejects.toThrow(SONoLicenseKeyError);
      await expect(validateAddress()).rejects.toThrowError(
        "No credentials for Service Objects were passed."
      );
    });

    it("calls Service Objects with the address in the URL", async () => {
      axios.get.mockImplementation(() =>
        Promise.resolve({ status: 200, data: emptyAddressesResponse })
      );

      // We're only checking the URL that was called so we don't need
      // the call's response.
      await validateAddress(address);

      expect(axios.get).toHaveBeenCalledWith(
        "https://ws.serviceobjects.com/AV3/api.svc/GetBestMatchesJSON?&Address=476%205th%20Avenue&Address2=&City=New%20York&State=NY&PostalCode=10018&LicenseKey=licenseKey"
      );
    });

    it("throws an unexpected response if SO returns a non-200 reponse", async () => {
      axios.get.mockImplementation(() =>
        Promise.resolve({ status: 204, data: emptyAddressesResponse })
      );

      await expect(validateAddress(address)).rejects.toThrow(
        SOIntegrationError
      );
      await expect(validateAddress(address)).rejects.toThrowError(
        "Unexpected response status from Service Objects."
      );
    });

    it("throws an unknown error if SO returns a 200 but somehow no data or error", async () => {
      axios.get.mockImplementation(() =>
        Promise.resolve({ status: 200, data: {} })
      );

      await expect(validateAddress(address)).rejects.toThrow(
        SOIntegrationError
      );
      await expect(validateAddress(address)).rejects.toThrowError(
        "Unknown Error"
      );
    });

    it("throws a SO error if the calls returns an error", async () => {
      axios.get.mockImplementation(() =>
        Promise.reject(new Error("some error"))
      );

      await expect(validateAddress(address)).rejects.toThrow(
        SOIntegrationError
      );
      await expect(validateAddress(address)).rejects.toThrowError(
        "Error using the Service Objects API: some error"
      );
    });

    it("throws an authorization error if we don't have the right key", async () => {
      axios.get.mockImplementation(() =>
        Promise.resolve({
          status: 200,
          data: { Addresses: undefined, Error: authorizationError },
        })
      );

      await expect(validateAddress(address)).rejects.toThrow(
        SOAuthorizationError
      );
      await expect(validateAddress(address)).rejects.toThrowError(
        "SO Authorization Error: Please provide a valid license key for this web service."
      );
    });

    it("throws a domain specific error if an input is wrong", async () => {
      axios.get.mockImplementation(() =>
        Promise.resolve({
          status: 200,
          data: { Addresses: undefined, Error: addressNotFound },
        })
      );

      await expect(validateAddress(address)).rejects.toThrow(
        SODomainSpecificError
      );
      await expect(validateAddress(address)).rejects.toThrowError(
        "Address not found"
      );
    });

    it("throws an integration error if SO resolves an error", async () => {
      axios.get.mockImplementation(() =>
        Promise.resolve({
          status: 200,
          data: { Addresses: undefined, Error: serviceObjectsFatal },
        })
      );

      await expect(validateAddress(address)).rejects.toThrow(
        SOIntegrationError
      );
      await expect(validateAddress(address)).rejects.toThrowError(
        "Unhandled error. Please contact Service Objects."
      );
    });

    it("returns whatever addresses were found", async () => {
      axios.get.mockImplementation(() =>
        Promise.resolve({
          status: 200,
          data: { Addresses: [{ Address: "some data" }] },
        })
      );

      await expect(validateAddress(address)).resolves.toEqual([
        { Address: "some data" },
      ]);
    });
  });

  // This function takes an error object from Service Objects and throws
  // a type of error that the API knows about.
  describe("throwValidErrorType", () => {
    const { throwValidErrorType } = ServiceObjectsClient();

    it("should throw a generic error if no error was passed", () => {
      // throwValidErrorType is only called when there's an error,
      // so realistically, this shouldn't happen.
      expect(() => throwValidErrorType()).toThrow(SOIntegrationError);
      expect(() => throwValidErrorType()).toThrowError(
        "No Error object from Service Objects. Check ServiceObjectsClient."
      );
    });

    it("throws an authorization error", () => {
      expect(() => throwValidErrorType(authorizationError)).toThrow(
        SOAuthorizationError
      );
      expect(() => throwValidErrorType(authorizationError)).toThrowError(
        "Please provide a valid license key for this web service."
      );
    });

    it("throws an a 'Domain Specific Error'", () => {
      expect(() => throwValidErrorType(addressNotFound)).toThrow(
        SODomainSpecificError
      );
      expect(() => throwValidErrorType(addressNotFound)).toThrowError(
        "Address not found"
      );
      expect(() => throwValidErrorType(streetNotFound)).toThrow(
        SODomainSpecificError
      );
      expect(() => throwValidErrorType(streetNotFound)).toThrowError(
        "Street not found"
      );
      expect(() => throwValidErrorType(cityNotFound)).toThrow(
        SODomainSpecificError
      );
      expect(() => throwValidErrorType(cityNotFound)).toThrowError(
        "City not found"
      );
    });

    it("throws an integration error if it's any other type of error", () => {
      expect(() => throwValidErrorType(serviceObjectsFatal)).toThrow(
        SOIntegrationError
      );
      expect(() => throwValidErrorType(serviceObjectsFatal)).toThrowError(
        "Unhandled error. Please contact Service Objects."
      );
    });
  });
});
