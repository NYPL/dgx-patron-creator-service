/* eslint-disable */
import Address from "../../../../api/models/v0.3/modelAddress";

const emptyAddress = {
  line1: "",
  line2: "",
  city: "",
  county: "",
  state: "",
  zip: "",
  isResidential: undefined,
  errors: {},
  hasBeenValidated: false,
};

describe("Address", () => {
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

    it("returns a valid address if the parameter was passed", () => {
      const isValid = true;
      let address = new Address({
        line1: "476th 5th Ave",
        city: "New York City",
      });

      expect(address.isValid).toEqual(false);

      address = new Address(
        {
          line1: "476th 5th Ave",
          city: "New York City",
        },
        isValid
      );

      expect(address.isValid).toEqual(true);
    });

    it("returns an error if the two address lines are too long", () => {
      const address = new Address({
        line1:
          "some very long line to throw a validation error for the address",
        line2: "continuing the very long address line for the error more text",
        city: "New York City",
        state: "New York",
      });
      expect(address.validate()).toEqual(false);
      expect(address.address.errors).toEqual({
        line1: "Address lines must be less than 100 characters combined",
      });
    });
  });

  describe("class methods", () => {
    describe("strToBool", () => {
      const strToBool = new Address().strToBool;

      it("returns undefined for bad string", () => {
        const bool = strToBool();
        expect(bool).toEqual(undefined);
      });
      it("returns true or false if that value is in the string passed", () => {
        const trueInString = strToBool("true string");
        const falseInString = strToBool("false string");
        const trueInStringUpper = strToBool("True string");
        const falseInStringUpper = strToBool("False string");
        const trueString = strToBool("true");
        const falseString = strToBool("false");

        expect(trueInString).toEqual(true);
        expect(falseInString).toEqual(false);
        expect(trueInStringUpper).toEqual(true);
        expect(falseInStringUpper).toEqual(false);
        expect(trueString).toEqual(true);
        expect(falseString).toEqual(false);
      });
    });

    // TODO
    describe("inState", () => {
      it("should determine if the address is in NY state", () => {
        // const policy = Policy();
        // const address = new Address();
        // expect(address.inState(policy))...; //true
        // const nonNysAddress = new Address(...);
        // expect(nonNysAddress.inState(policy))...; // false
      });
    });
    // TODO
    describe("inCity", () => {});

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

    describe("residentialWorkAddress", () => {
      const residentialAddress = new Address({
        line1: "street address",
        isResidential: "true",
      });
      const nonResidentialAddress = new Address({
        line1: "street address",
        isResidential: "false",
      });

      it("should return false for addresses that are not work address", () => {
        const isWorkAddress = false;
        expect(
          residentialAddress.residentialWorkAddress(isWorkAddress)
        ).toEqual(false);
        expect(
          nonResidentialAddress.residentialWorkAddress(isWorkAddress)
        ).toEqual(false);
      });

      it("should return true for work addresses that are residential", () => {
        const isWorkAddress = true;
        expect(
          residentialAddress.residentialWorkAddress(isWorkAddress)
        ).toEqual(true);
        expect(
          nonResidentialAddress.residentialWorkAddress(isWorkAddress)
        ).toEqual(false);
      });
    });

    describe("nonResidentialHomeAddress", () => {
      const residentialAddress = new Address({
        line1: "street address",
        isResidential: "true",
      });
      const nonResidentialAddress = new Address({
        line1: "street address",
        isResidential: "false",
      });

      it("should return false for a work address", () => {
        const isWorkAddress = true;
        expect(
          residentialAddress.nonResidentialHomeAddress(isWorkAddress)
        ).toEqual(false);
        expect(
          nonResidentialAddress.nonResidentialHomeAddress(isWorkAddress)
        ).toEqual(false);
      });

      it("should return true for non work addresses that are not residential", () => {
        const isWorkAddress = false;
        expect(
          residentialAddress.nonResidentialHomeAddress(isWorkAddress)
        ).toEqual(false);
        expect(
          nonResidentialAddress.nonResidentialHomeAddress(isWorkAddress)
        ).toEqual(true);
      });
    });

    describe("addressForTemporaryCard", () => {
      const residentialAddress = new Address({
        line1: "street address",
        isResidential: "true",
      });
      const nonResidentialAddress = new Address({
        line1: "street address",
        isResidential: "false",
      });

      it("returns a temporary card for a residential work address", () => {
        const isWorkAddress = true;
        expect(
          residentialAddress.addressForTemporaryCard(isWorkAddress)
        ).toEqual(true);
      });
      it("returns a temporary card for a non-residential home address that is not a work address", () => {
        const isWorkAddress = false;
        expect(
          nonResidentialAddress.addressForTemporaryCard(isWorkAddress)
        ).toEqual(true);
      });
      it("returns false for any other type of address", () => {
        // non-residential work address
        let isWorkAddress = true;
        expect(
          nonResidentialAddress.addressForTemporaryCard(isWorkAddress)
        ).toEqual(false);

        // residential address that is not a work address
        isWorkAddress = false;
        expect(
          residentialAddress.addressForTemporaryCard(isWorkAddress)
        ).toEqual(false);
      });
    });

    // TODO:
    describe("validationResponse", () => {});

    describe("validatedVersion", () => {
      it("should return the current address if it already has been validated", () => {
        // mock that the address is valid and has been validated.
        const address = new Address({
          hasBeenValidated: true,
        });
        expect(address.validatedVersion()).toEqual(address);
      });

      it("should return undefined if the address is not valid", () => {
        // mock that the address is valid and has been validated.
        const address = new Address({
          line1: "not valid address",
        });
        address.isValid = false;
        expect(address.validatedVersion()).toEqual(undefined);
      });

      it("should try to validate the address but it failed", () => {
        const address = new Address({
          line1: "some address",
        });
        // mock this function for now until it's implemented.
        address.validationResponse = jest.fn().mockReturnValue(undefined);

        let validatedVersion = address.validatedVersion();
        expect(validatedVersion).toEqual(undefined);
      });
      it("should try to validate the address and succeeded", () => {
        const address = new Address({
          line1: "some address",
        });
        address.validate();

        expect(address.address.hasBeenValidated).toEqual(false);

        let validatedVersion = address.validatedVersion();
        expect(validatedVersion.address.hasBeenValidated).toEqual(true);
        expect(validatedVersion).toEqual(address);
      });
    });

    // TODO: This needs more when the AddressValidationsAPI is done.
    describe("normalizedVersion", () => {
      it("should return the current address if it already has been validated", () => {
        // mock that the address is valid and has been validated.
        const address = new Address({
          hasBeenValidated: true,
        });
        expect(address.normalizedVersion()).toEqual(address);
      });
    });
  });
});