const Policy = require("../../../../api/models/v0.3/modelPolicy");
const Card = require("../../../../api/models/v0.3/modelCard");
const Address = require("../../../../api/models/v0.3/modelAddress");

describe("Policy", () => {
  describe("Web Applicant", () => {
    const policy = Policy();

    it("returns the default webApplicant policy and policyType", () => {
      expect(policy.policyType).toEqual("webApplicant");

      // returns the full policy in `.policy`
      expect(policy.policy).toEqual(policy.ilsPolicies.webApplicant);

      // Values found in IlsClient:
      expect(policy.policyField("agency")).toEqual("198");
      expect(Object.keys(policy.policyField("ptype"))).toEqual([
        "default",
        "digitalTemporary",
        "digitalNonMetro",
        "digitalMetro",
      ]);
      expect(policy.policyField("requiredFields")).toEqual(["birthdate"]);
      expect(policy.policyField("minimumAge")).toEqual(13);
    });

    it("verifies that `birthdate` is a required field and not ageGate", () => {
      expect(policy.isRequiredField("birthdate")).toEqual(true);
      expect(policy.isRequiredField("ageGate")).toEqual(false);
    });

    it("sets up the correct expiration time in days", () => {
      const ptypes = policy.ilsPolicies.webApplicant.ptype;
      const webApplicantPtype = ptypes.default.id;
      const digitalTemporary = ptypes.digitalTemporary.id;
      const digitalNonMetro = ptypes.digitalNonMetro.id;
      const digitalMetro = ptypes.digitalMetro.id;

      let exptime = policy.getExpirationPoliciesForPtype(webApplicantPtype);
      // The standard time is 90 days.
      expect(exptime).toEqual(90);

      // Check the digital temporary ptype next:
      exptime = policy.getExpirationPoliciesForPtype(digitalTemporary);
      // The standard time is 30 days.
      expect(exptime).toEqual(30);

      // Check the metro ptype next:
      exptime = policy.getExpirationPoliciesForPtype(digitalNonMetro);
      // The standard time is 1 year or 365 days.
      expect(exptime).toEqual(365);

      // Check the metro ptype next:
      exptime = policy.getExpirationPoliciesForPtype(digitalMetro);
      // The standard time is 3 years or 1095 days.
      expect(exptime).toEqual(1095);
    });

    it("returns the ptype for patrons in the metro", () => {
      // Metro residents have a city of "New York" or can also have counties
      // of Richmond, Queens, New York, Kings, and the Bronx.
      const metroAddress = new Address({
        line1: "476th 5th Ave",
        city: "New York",
        state: "NY",
        zip: "10018",
        isResidential: true,
        hasBeenValidated: true,
      });
      const metroCard = new Card({
        name: "some name",
        username: "username",
        address: metroAddress,
        pin: "1234",
        location: "nyc",
        policy,
      });
      const metroAddress2 = new Address({
        line1: "some address",
        city: "Queens",
        county: "Queens",
        state: "NY",
        zip: "11368",
        isResidential: true,
        hasBeenValidated: true,
      });
      const metroCard2 = new Card({
        name: "some name",
        username: "username",
        address: metroAddress2,
        pin: "1234",
        location: "nyc",
        policy,
      });
      const webApplicant = policy.ilsPolicies.webApplicant.ptype;
      const digitalMetro = webApplicant.digitalMetro.id;

      let ptype = policy.determinePtype(metroCard);
      expect(ptype).toEqual(digitalMetro);
      expect(ptype).toEqual(9);

      ptype = policy.determinePtype(metroCard2);
      expect(ptype).toEqual(digitalMetro);
      expect(ptype).toEqual(9);
    });

    it("returns the ptype for nonMetro patron", () => {
      const stateAddress = new Address({
        line1: "Some address",
        city: "Albany",
        state: "NY",
        zip: "10018",
        isResidential: true,
        hasBeenValidated: true,
      });
      const stateCard = new Card({
        name: "some name",
        username: "username",
        address: stateAddress,
        pin: "1234",
        location: "nys",
        policy,
      });

      const webApplicant = policy.ilsPolicies.webApplicant.ptype;
      const digitalNonMetro = webApplicant.digitalNonMetro.id;

      const ptype = policy.determinePtype(stateCard);
      expect(ptype).toEqual(digitalNonMetro);
      expect(ptype).toEqual(8);
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
      expect(policy.policyField("requiredFields")).toEqual([]);
    });

    it("always returns the default ptype for simplye juvenile accounts", () => {
      const address = new Address({
        line1: "476th 5th Ave",
        city: "New York City",
        state: "NY",
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
      // The standard time is 3 years or 1095 days.
      expect(exptime).toEqual(1095);
    });
  });

  describe("SimplyE", () => {
    const policy = Policy({ policyType: "simplye" });

    it("returns the simplye policy and related values", () => {
      expect(policy.policyType).toEqual("simplye");

      // returns the full policy in `.policy`
      expect(policy.policy).toEqual(policy.ilsPolicies.simplye);

      // Values found in IlsClient:
      expect(policy.policyField("agency")).toEqual("202");
      expect(Object.keys(policy.policyField("ptype"))).toEqual([
        "default",
        "metro",
      ]);
      expect(policy.policyField("requiredFields")).toEqual(["ageGate"]);
      expect(policy.policyField("minimumAge")).toEqual(13);
    });

    it("verifies that `ageGate` is a required field", () => {
      expect(policy.isRequiredField("ageGate")).toEqual(true);
    });

    it("sets up the correct expiration dates", () => {
      const ptypes = policy.ilsPolicies.simplye.ptype;
      const nonMetro = ptypes.default.id;
      const metro = ptypes.metro.id;

      let exptime = policy.getExpirationPoliciesForPtype(nonMetro);
      // The standard time is 3 years or 1095 days.
      expect(exptime).toEqual(1095);

      exptime = policy.getExpirationPoliciesForPtype(metro);
      // The standard time is 3 years or 1095 days.
      expect(exptime).toEqual(1095);
    });
  });
});
