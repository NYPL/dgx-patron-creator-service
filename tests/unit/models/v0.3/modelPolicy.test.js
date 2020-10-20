const Policy = require("../../../../api/models/v0.3/modelPolicy");
const { Card } = require("../../../../api/models/v0.3/modelCard");
const Address = require("../../../../api/models/v0.3/modelAddress");

describe("Policy", () => {
  it("should return the three valid types", () => {
    const policy = Policy();

    expect(policy.validTypes).toEqual([
      "simplye",
      "webApplicant",
      "simplyeJuvenile",
    ]);
  });

  describe("SimplyE", () => {
    const policy = Policy();

    it("returns the default simplye policy and related values", () => {
      expect(policy.policyType).toEqual("simplye");

      // returns the full policy in `.policy`
      expect(policy.policy).toEqual(policy.ilsPolicies.simplye);

      // Values found in IlsClient:
      expect(policy.policyField("agency")).toEqual("202");
      expect(Object.keys(policy.policyField("ptype"))).toEqual([
        "metro",
        "default",
      ]);
      expect(policy.policyField("requiredFields")).toEqual([
        "email",
        "barcode",
        "ageGate",
      ]);
      expect(Object.keys(policy.policyField("serviceArea"))).toEqual([
        "city",
        "county",
        "state",
      ]);
      expect(policy.policyField("minimumAge")).toEqual(13);
    });

    it("verifies that `email` and `barcode` are required fields", () => {
      expect(policy.isRequiredField("email")).toEqual(true);
      expect(policy.isRequiredField("barcode")).toEqual(true);
      expect(policy.isRequiredField("ageGate")).toEqual(true);
    });

    it("returns the ptype for patrons in the metro", () => {
      // Metro residents have a city of "New York" or can also have counties
      // of Richmond, Queens, New York, Kings, and the Bronx.
      const metroAddress = new Address({
        line1: "476th 5th Ave",
        city: "New York",
        state: "New York",
        zip: "10018",
      });
      // Card = Patron
      const metroCard = new Card({
        name: "some name",
        username: "username",
        address: metroAddress,
        pin: "1234",
        // TODO: This cyclical dependancy seems unnecessary but will update later.
        policy,
      });
      const metroAddress2 = new Address({
        line1: "some address",
        state: "New York",
        county: "Queens",
        zip: "11368",
      });
      const metroCard2 = new Card({
        name: "some name",
        username: "username",
        address: metroAddress2,
        pin: "1234",
        policy,
      });
      const simplyePtype = policy.ilsPolicies.simplye.ptype;
      const metroPtype = simplyePtype.metro.id;

      let ptype = policy.determinePtype(metroCard);
      expect(ptype).toEqual(metroPtype);
      expect(ptype).toEqual(2);

      ptype = policy.determinePtype(metroCard2);
      expect(ptype).toEqual(metroPtype);
      expect(ptype).toEqual(2);
    });

    it("returns the ptype for patrons in the state", () => {
      const stateAddress = new Address({
        line1: "Some address",
        city: "Albany",
        state: "New York",
        zip: "10018",
      });
      const stateCard = new Card({
        name: "some name",
        username: "username",
        address: stateAddress,
        pin: "1234",
        policy,
      });

      const simplyePtype = policy.ilsPolicies.simplye.ptype;
      const nysPtype = simplyePtype.default.id;

      const ptype = policy.determinePtype(stateCard);
      expect(ptype).toEqual(nysPtype);
      expect(ptype).toEqual(3);
    });

    it("sets up the correct expiration dates", () => {
      const ptypes = policy.ilsPolicies.simplye.ptype;
      const nonMetroPtype = ptypes.default.id;
      const metroPtype = ptypes.metro.id;

      // Check the Non-metro ptype first:
      let exptime = policy.getExpirationPoliciesForPtype(nonMetroPtype);

      // The standard time is 3 years or 1095 days.
      expect(exptime.standard).toEqual(1095);
      // The temporary time is 30 days.
      expect(exptime.temporary).toEqual(30);

      // Check the metro ptype next:
      exptime = policy.getExpirationPoliciesForPtype(metroPtype);

      // The standard time is 3 years or 1095 days.
      expect(exptime.standard).toEqual(1095);
      // The temporary time is 30 days.
      expect(exptime.temporary).toEqual(30);
    });
  });

  describe("Web Applicant", () => {
    const policy = Policy({ policyType: "webApplicant" });

    it("returns a web applicant policy and policyType", () => {
      expect(policy.policyType).toEqual("webApplicant");

      // returns the full policy in `.policy`
      expect(policy.policy).toEqual(policy.ilsPolicies.webApplicant);

      // Values found in IlsClient:
      expect(policy.policyField("agency")).toEqual("198");
      expect(Object.keys(policy.policyField("ptype"))).toEqual([
        "default",
        "digTemp",
        "digNonMetro",
        "digMetro",
      ]);
      expect(policy.policyField("requiredFields")).toEqual([
        "email",
        "barcode",
        "birthdate",
      ]);
      expect(Object.keys(policy.policyField("serviceArea"))).toEqual([
        "city",
        "county",
        "state",
      ]);
      expect(policy.policyField("minimumAge")).toEqual(13);
    });

    it("verifies that `email`, `barcode`, and `birthdate` are required fields", () => {
      expect(policy.isRequiredField("email")).toEqual(true);
      expect(policy.isRequiredField("barcode")).toEqual(true);
      expect(policy.isRequiredField("birthdate")).toEqual(true);
      expect(policy.isRequiredField("ageGate")).toEqual(false);
    });

    it("always returns the default web ptype for web applications", () => {
      const address = new Address({
        line1: "476th 5th Ave",
        city: "New York City",
        state: "New York",
        zip: "10018",
      });
      // Card = Patron
      const card = new Card({
        name: "some name",
        username: "username",
        address,
        pin: "1234",
      });
      const webApplicantPtype = policy.ilsPolicies.webApplicant.ptype;
      const webPtypeID = webApplicantPtype.default.id;

      const ptype = policy.determinePtype(card);
      expect(ptype).toEqual(webPtypeID);

      // The ptype value is '1':
      expect(ptype).toEqual(1);
    });

    it("sets up the correct expiration dates", () => {
      const ptypes = policy.ilsPolicies.webApplicant.ptype;
      const webApplicantPtype = ptypes.default.id;

      const exptime = policy.getExpirationPoliciesForPtype(webApplicantPtype);

      // The standard time is 3 years or 1095 days.
      expect(exptime.standard).toEqual(1095);
      // The temporary time is 90 days.
      expect(exptime.temporary).toEqual(90);
    });
  });

  describe("SimplyE Juvenile", () => {
    const policy = Policy({ policyType: "simplyeJuvenile" });

    it("returns a simplyeJuvenile policy and policyType", () => {
      expect(policy.policyType).toEqual("simplyeJuvenile");

      // returns the full policy in `.policy`
      expect(policy.policy).toEqual(policy.ilsPolicies.simplyeJuvenile);

      // Values found in IlsClient:
      expect(policy.policyField("agency")).toEqual("202");
      expect(Object.keys(policy.policyField("ptype"))).toEqual(["default"]);
      expect(policy.policyField("requiredFields")).toEqual([
        "email",
        "barcode",
      ]);
      expect(Object.keys(policy.policyField("serviceArea"))).toEqual([
        "city",
        "county",
        "state",
      ]);
    });

    it("verifies that `email`, `barcode`, and `birthdate` are required fields", () => {
      expect(policy.isRequiredField("email")).toEqual(true);
      expect(policy.isRequiredField("barcode")).toEqual(true);
    });

    it("always returns the default ptype for simplye juvenile accounts", () => {
      const address = new Address({
        line1: "476th 5th Ave",
        city: "New York City",
        state: "New York",
        zip: "10018",
      });
      const card = new Card({
        name: "some name",
        username: "username",
        address,
        pin: "1234",
      });
      const simplyeJuvenilePtype = policy.ilsPolicies.simplyeJuvenile.ptype;
      const juvenilePType = simplyeJuvenilePtype.default.id;

      const ptype = policy.determinePtype(card);
      expect(ptype).toEqual(juvenilePType);

      // The ptype value is '4':
      expect(ptype).toEqual(4);
    });

    it("sets up the correct expiration dates", () => {
      const ptypes = policy.ilsPolicies.simplyeJuvenile.ptype;
      const juvenilePType = ptypes.default.id;

      const exptime = policy.getExpirationPoliciesForPtype(juvenilePType);

      // Both the standard and temporary time is 3 years or 1095 days.
      expect(exptime.standard).toEqual(1095);
      expect(exptime.temporary).toEqual(1095);
    });
  });
});
