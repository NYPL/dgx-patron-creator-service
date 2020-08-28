/* eslint-disable */
const AddressValidationAPI = require("../../../../api/controllers/v0.3/AddressValidationAPI");
const Address = require("../../../../api/models/v0.3/modelAddress");
const Policy = require("../../../../api/models/v0.3/modelPolicy");
jest.mock("../../../../api/controllers/v0.3/AddressValidationAPI");

const emptyAddress = {
  line1: "",
  line2: "",
  city: "",
  county: "",
  state: "",
  zip: "",
  isResidential: false,
};

describe("Address", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    AddressValidationAPI.mockClear();
  });

  describe("Init", () => {
    it("returns an empty address object", () => {
      const address1 = new Address();
      expect(address1.address).toEqual(emptyAddress);

      const address2 = new Address({});
      expect(address2.address).toEqual(emptyAddress);
    });

    it("returns the input as an address object", () => {
      const address = new Address({
        line1: "476th 5th Ave",
        city: "New York City",
        state: "New York",
      });

      expect(address.address).toEqual({
        ...emptyAddress,
        line1: "476th 5th Ave",
        city: "New York City",
        state: "New York",
      });
    });

    it("returns an error if the two address lines are too long", async () => {
      const address = new Address({
        line1:
          "some very long line to throw a validation error for the address",
        line2: "continuing the very long address line for the error more text",
        city: "New York City",
        state: "New York",
      });
      const response = await address.validate();
      const addressLength =
        address.address.line1.length + address.address.line2.length;
      expect(response).toEqual({
        error: {
          message:
            "Address lines must be less than 100 characters combined. The address is currently at 124 characters.",
        },
      });
      expect(address.errors).toEqual({
        line1: `Address lines must be less than 100 characters combined. The address is currently at ${addressLength} characters.`,
      });
    });
  });

  describe("class methods", () => {
    describe("inState", () => {
      it("should return false for web applicants out of NYS and true for in NYS", () => {
        const webApplicant = Policy({ policyType: "webApplicant" });
        const addressNotNY = new Address({
          line1: "street address",
          state: "New Jersey",
        });
        const addressNY = new Address({
          line1: "street address",
          state: "New York",
        });

        expect(addressNotNY.inState(webApplicant)).toEqual(false);
        expect(addressNY.inState(webApplicant)).toEqual(true);
      });

      it("should return false if they are not in NY state", () => {
        const simplyePolicy = Policy();
        const addressNotNY = new Address({
          line1: "street address",
          state: "New Jersey",
        });

        expect(addressNotNY.inState(simplyePolicy)).toEqual(false);
      });

      it("should return true if they are in NY state", () => {
        const simplyePolicy = Policy();
        const addressNY = new Address({
          line1: "street address",
          state: "New York",
        });

        expect(addressNY.inState(simplyePolicy)).toEqual(true);
      });
    });

    describe("inCity", () => {
      it("should return false for web applicants out of NYC and true for in NYC", () => {
        const webApplicant = Policy({ policyType: "webApplicant" });
        const addressNotNYC = new Address({
          line1: "street address",
          city: "Albany",
        });
        const addressNYC = new Address({
          line1: "street address",
          city: "New York",
        });

        expect(addressNotNYC.inCity(webApplicant)).toEqual(false);
        expect(addressNYC.inCity(webApplicant)).toEqual(true);
      });

      it("should return false for simplye applicants if they are not in NYC", () => {
        const simplyePolicy = Policy();
        const addressNotNYC = new Address({
          line1: "street address",
          city: "Albany",
        });

        expect(addressNotNYC.inCity(simplyePolicy)).toEqual(false);
      });

      it("should return true for simplye applicants if they are in NYC", () => {
        const simplyePolicy = Policy();
        const addressNYC = new Address({
          line1: "street address",
          city: "New York",
        });

        expect(addressNYC.inCity(simplyePolicy)).toEqual(true);
      });

      it("should return true if they are in an NYC county", () => {
        const simplyePolicy = Policy();
        const addressNYC = new Address({
          line1: "street address",
          county: "Queens",
        });

        expect(addressNYC.inCity(simplyePolicy)).toEqual(true);
      });
    });

    describe("toString", () => {
      it("should return a string representation of the address", () => {
        const empty = new Address();
        expect(empty.toString().trim()).toEqual(",");

        const address = new Address({
          line1: "476th 5th Ave",
          city: "New York City",
          state: "New York",
          zip: "10018",
        });
        expect(address.toString()).toEqual(
          "476th 5th Ave\nNew York City, New York 10018"
        );
      });
    });

    // The call for `AddressValidationAPI.validate` is tested in
    // AddressValidationAPI.test.js. This function just calls that function
    // and returns the same response.
    describe("validateInAPI", () => {
      it("should throw an error if no license key was passed", async () => {
        const address = new Address();

        await expect(address.validateInAPI()).rejects.toThrow(
          "No license key passed in validateInAPI."
        );
      });

      it("should return a validated address response", async () => {
        AddressValidationAPI.mockImplementation(() => ({
          validate: () => Promise.resolve({ type: "valid-address" }),
        }));

        // mock that the address is valid and has been validated.
        const address = new Address(
          {
            hasBeenValidated: true,
          },
          "soLicenseKey"
        );

        const resp = await address.validateInAPI();
        expect(resp).toEqual({ type: "valid-address" });
      });
    });

    describe("validate", () => {
      it("should return the current address if it already has been validated", async () => {
        AddressValidationAPI.mockImplementation(() => {
          validate: () => Promise.resolve({ type: "valid-address" });
        });
        // mock that the address is valid and has been validated.
        const address = new Address(
          {
            hasBeenValidated: true,
          },
          "soLicenseKey"
        );
        const validateInAPISpy = jest.spyOn(address, "validateInAPI");
        const resp = await address.validate();

        // If the address has already been validated, then "validatedInAPI"
        // won't be called.
        expect(validateInAPISpy).not.toHaveBeenCalled();
        expect(resp).toEqual({
          type: "valid-address",
          ...address,
        });
      });

      it("should return 'unrecognized-address' type if the address is not valid", async () => {
        // mock that the address is valid and has been validated.
        const address = new Address(
          {
            line1: "not valid address",
          },
          "soLicenseKey"
        );
        address.validateInAPI = jest
          .fn()
          .mockReturnValue({ type: "unrecognized-address" });
        const resp = await address.validate();
        expect(resp).toEqual({ type: "unrecognized-address" });
      });
    });
  });
});
