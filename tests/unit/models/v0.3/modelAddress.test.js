const AddressValidationAPI = require("../../../../api/controllers/v0.3/AddressValidationAPI");
const Address = require("../../../../api/models/v0.3/modelAddress");
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
        state: "NY",
      });

      expect(address.address).toEqual({
        ...emptyAddress,
        line1: "476th 5th Ave",
        city: "New York City",
        state: "NY",
      });
    });

    it("returns an error if the two address lines are too long", async () => {
      const address = new Address(
        {
          line1:
            "some very long line to throw a validation error for the address",
          line2:
            "continuing the very long address line for the error more text",
          city: "New York City",
          state: "NY",
          zip: "10018",
        },
        "soLicenseKey"
      );
      const response = await address.validate();
      const addressLength =
        address.address.line1.length + address.address.line2.length;
      expect(response).toEqual({
        error: {
          line1:
            "Address lines must be less than 100 characters combined. The address is currently at 124 characters.",
        },
      });
      expect(address.errors).toEqual({
        line1: `Address lines must be less than 100 characters combined. The address is currently at ${addressLength} characters.`,
      });
    });
  });

  describe("class methods", () => {
    describe("inUS", () => {
      it("should return false for addresses outside the US and true for in US", () => {
        const addressNotUS = new Address({
          line1: "street address",
          state: "",
        });
        const addressInUS = new Address({
          line1: "476 5th Ave",
          city: "New York",
          state: "NY",
          zip: "10018",
        });

        expect(addressNotUS.inUS()).toEqual(false);
        expect(addressInUS.inUS()).toEqual(true);
      });
    });

    describe("inNYState", () => {
      it("should return false for addresses outside NYS and true for in NYS", () => {
        const addressNotNY = new Address({
          line1: "street address",
          state: "NJ",
        });
        const addressNY = new Address({
          line1: "street address",
          state: "NY",
        });

        expect(addressNotNY.inNYState()).toEqual(false);
        expect(addressNY.inNYState()).toEqual(true);
      });
    });

    describe("inNYCity", () => {
      it("should return false for addresses outside NYC and true for in NYC", () => {
        const addressNotNYC = new Address({
          line1: "street address",
          city: "Albany",
        });
        const addressNYC = new Address({
          line1: "street address",
          city: "New York",
        });

        expect(addressNotNYC.inNYCity()).toEqual(false);
        expect(addressNYC.inNYCity()).toEqual(true);
      });

      it("should return true if they are in an NYC county and false otherwise", () => {
        const addressNYC = new Address({
          line1: "street address",
          county: "Queens",
        });
        const addressNotInCounty = new Address({
          line1: "street address",
          county: "Yonkers",
        });

        expect(addressNYC.inNYCity()).toEqual(true);
        expect(addressNotInCounty.inNYCity()).toEqual(false);
      });
    });

    describe("toString", () => {
      it("should return a string representation of the address", () => {
        const empty = new Address();
        expect(empty.toString().trim()).toEqual(",");

        const address = new Address({
          line1: "476th 5th Ave",
          city: "New York City",
          state: "NY",
          zip: "10018",
        });
        expect(address.toString()).toEqual(
          "476th 5th Ave\nNew York City, NY 10018"
        );
      });
    });

    describe("validate", () => {
      it("should throw an error if no license key was passed", async () => {
        const address = new Address();

        await expect(address.validate()).rejects.toThrow(
          "No SO license key passed in validate."
        );
      });
      it("should return the current address if it already has been validated", async () => {
        const mockAPI = jest.fn(() =>
          Promise.resolve({ type: "valid-address" })
        );
        AddressValidationAPI.mockImplementation(() => ({
          validate: mockAPI,
        }));
        // mock that the address is valid and has been validated.
        const address = new Address(
          {
            line1: "476 5th ave",
            city: "New York",
            state: "NY",
            zip: "10018",
            hasBeenValidated: true,
          },
          "soLicenseKey"
        );
        // const validateInAPISpy = jest.spyOn(address, "validateInAPI");
        const resp = await address.validate();

        // If the address has already been validated, then
        // "AddressValidationAPI.validate" won't be called.
        expect(mockAPI).not.toHaveBeenCalled();
        expect(resp).toEqual({
          type: "valid-address",
          ...address,
        });
      });

      it("should return 'unrecognized-address' type if the address is not valid", async () => {
        const mockAPI = jest.fn(() =>
          Promise.resolve({ type: "unrecognized-address" })
        );
        AddressValidationAPI.mockImplementation(() => ({
          validate: mockAPI,
        }));
        // mock that the address is valid and has been validated.
        const address = new Address(
          {
            line1: "not valid address",
            city: "New York",
            state: "NY",
            zip: "10018",
          },
          "soLicenseKey"
        );
        const resp = await address.validate();
        expect(mockAPI).toHaveBeenCalled();
        expect(resp).toEqual({ type: "unrecognized-address" });
      });
    });
  });
});
