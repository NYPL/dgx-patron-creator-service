/* eslint-disable */
import Address from "../../../../api/models/v0.3/modelAddress";

const emptyAddress = {
  line_1: "",
  line_2: "",
  city: "",
  county: "",
  state: "",
  zip: "",
  is_residential: undefined,
  errors: {},
  has_been_validated: false,
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
        line_1: "476th 5th Ave",
        city: "New York City",
        state: "New York",
      });

      expect(address.address).toEqual({
        ...emptyAddress,
        line_1: "476th 5th Ave",
        city: "New York City",
        state: "New York",
      });
    });

    it("returns a valid address if the parameter was passed", () => {
      const is_valid = true;
      let address = new Address({
        line_1: "476th 5th Ave",
        city: "New York City",
      });

      expect(address.is_valid).toEqual(false);

      address = new Address(
        {
          line_1: "476th 5th Ave",
          city: "New York City",
        },
        is_valid
      );

      expect(address.is_valid).toEqual(true);
    });

    it("returns an error if the two address lines are too long", () => {
      const address = new Address({
        line_1:
          "some very long line to throw a validation error for the address",
        line_2: "continuing the very long address line for the error more text",
        city: "New York City",
        state: "New York",
      });
      expect(address.validate()).toEqual(false);
      expect(address.address.errors).toEqual({
        line_1: "Address lines must be less than 100 characters combined",
      });
    });
  });

  describe("class methods", () => {
    describe("str_to_bool", () => {
      const str_to_bool = new Address().str_to_bool;

      it("returns undefined for bad string", () => {
        const bool = str_to_bool();
        expect(bool).toEqual(undefined);
      });
      it("returns true or false if that value is in the string passed", () => {
        const trueInString = str_to_bool("true string");
        const falseInString = str_to_bool("false string");
        const trueInStringUpper = str_to_bool("True string");
        const falseInStringUpper = str_to_bool("False string");
        const trueString = str_to_bool("true");
        const falseString = str_to_bool("false");

        expect(trueInString).toEqual(true);
        expect(falseInString).toEqual(false);
        expect(trueInStringUpper).toEqual(true);
        expect(falseInStringUpper).toEqual(false);
        expect(trueString).toEqual(true);
        expect(falseString).toEqual(false);
      });
    });

    // TODO
    describe("in_state", () => {
      it("should determine if the address is in NY state", () => {
        // const policy = Policy();
        // const address = new Address();
        // expect(address.in_state(policy))...; //true
        // const non_nys_address = new Address(...);
        // expect(non_nys_address.in_state(policy))...; // false
      });
    });
    // TODO
    describe("in_city", () => {});

    describe("to_string", () => {
      it("should return a string representation of the address", () => {
        const empty = new Address();
        expect(empty.toString().trim()).toEqual(",");

        const address = new Address({
          line_1: "476th 5th Ave",
          city: "New York City",
          state: "New York",
          zip: "10018",
        });
        expect(address.toString()).toEqual(
          "476th 5th Ave\nNew York City, New York 10018"
        );
      });
    });

    describe("residential_work_address", () => {
      const residentialAddress = new Address({
        line_1: "street address",
        is_residential: "true",
      });
      const nonResidentialAddress = new Address({
        line_1: "street address",
        is_residential: "false",
      });

      it("should return false for addresses that are not work address", () => {
        const is_work_address = false;
        expect(
          residentialAddress.residential_work_address(is_work_address)
        ).toEqual(false);
        expect(
          nonResidentialAddress.residential_work_address(is_work_address)
        ).toEqual(false);
      });

      it("should return true for work addresses that are residential", () => {
        const is_work_address = true;
        expect(
          residentialAddress.residential_work_address(is_work_address)
        ).toEqual(true);
        expect(
          nonResidentialAddress.residential_work_address(is_work_address)
        ).toEqual(false);
      });
    });

    describe("non_residential_home_address", () => {
      const residentialAddress = new Address({
        line_1: "street address",
        is_residential: "true",
      });
      const nonResidentialAddress = new Address({
        line_1: "street address",
        is_residential: "false",
      });

      it("should return false for a work address", () => {
        const is_work_address = true;
        expect(
          residentialAddress.non_residential_home_address(is_work_address)
        ).toEqual(false);
        expect(
          nonResidentialAddress.non_residential_home_address(is_work_address)
        ).toEqual(false);
      });

      it("should return true for non work addresses that are not residential", () => {
        const is_work_address = false;
        expect(
          residentialAddress.non_residential_home_address(is_work_address)
        ).toEqual(false);
        expect(
          nonResidentialAddress.non_residential_home_address(is_work_address)
        ).toEqual(true);
      });
    });

    describe("address_for_temporary_card", () => {
      const residentialAddress = new Address({
        line_1: "street address",
        is_residential: "true",
      });
      const nonResidentialAddress = new Address({
        line_1: "street address",
        is_residential: "false",
      });

      it("returns a temporary card for a residential work address", () => {
        const is_work_address = true;
        expect(
          residentialAddress.address_for_temporary_card(is_work_address)
        ).toEqual(true);
      });
      it("returns a temporary card for a non-residential home address that is not a work address", () => {
        const is_work_address = false;
        expect(
          nonResidentialAddress.address_for_temporary_card(is_work_address)
        ).toEqual(true);
      });
      it("returns false for any other type of address", () => {
        // non-residential work address
        let is_work_address = true;
        expect(
          nonResidentialAddress.address_for_temporary_card(is_work_address)
        ).toEqual(false);

        // residential address that is not a work address
        is_work_address = false;
        expect(
          residentialAddress.address_for_temporary_card(is_work_address)
        ).toEqual(false);
      });
    });

    // TODO:
    describe("validation_response", () => {});

    describe("validated_version", () => {
      it("should return the current address if it already has been validated", () => {
        // mock that the address is valid and has been validated.
        const address = new Address({
          has_been_validated: true,
        });
        expect(address.validated_version()).toEqual(address);
      });

      it("should return undefined if the address is not valid", () => {
        // mock that the address is valid and has been validated.
        const address = new Address({
          line_1: "not valid address",
        });
        address.is_valid = false;
        expect(address.validated_version()).toEqual(undefined);
      });

      it("should try to validate the address but it failed", () => {
        const address = new Address({
          line_1: "some address",
        });
        // mock this function for now until it's implemented.
        address.validation_response = jest.fn().mockReturnValue(undefined);

        let validatedVersion = address.validated_version();
        expect(validatedVersion).toEqual(undefined);
      });
      it("should try to validate the address and succeeded", () => {
        const address = new Address({
          line_1: "some address",
        });
        address.validate();

        expect(address.address.has_been_validated).toEqual(false);

        let validatedVersion = address.validated_version();
        expect(validatedVersion.address.has_been_validated).toEqual(true);
        expect(validatedVersion).toEqual(address);
      });
    });

    // TODO: This needs more when the AddressValidationsAPI is done.
    describe("normalized_version", () => {
      it("should return the current address if it already has been validated", () => {
        // mock that the address is valid and has been validated.
        const address = new Address({
          has_been_validated: true,
        });
        expect(address.normalized_version()).toEqual(address);
      });
    });
  });
});
