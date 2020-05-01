const Policy = require('../../../../api/models/v0.3/modelPolicy');
const { Card } = require('../../../../api/models/v0.3/modelCard');
const Address = require('../../../../api/models/v0.3/modelAddress');

describe('Policy', () => {
  it('should return the two valid types', () => {
    const policy = Policy();

    expect(policy.validTypes).toEqual(['simplye', 'webApplicant']);
  });

  it('validates that the policy type is an approved type', () => {
    const defaultPolicy = Policy();
    const simplyePolicy = Policy({ policyType: 'simplye' });
    const webApplicantPolicy = Policy({ policyType: 'webApplicant' });
    const badPolicy = Policy({ policyType: 'badPolicy' });

    expect(defaultPolicy.usesAnApprovedPolicy()).toEqual(true);
    expect(simplyePolicy.usesAnApprovedPolicy()).toEqual(true);
    expect(webApplicantPolicy.usesAnApprovedPolicy()).toEqual(true);
    expect(badPolicy.usesAnApprovedPolicy()).toEqual(false);
  });

  describe('SimplyE', () => {
    const policy = Policy();

    it('returns the default simplye policy and related values', () => {
      expect(policy.policyType).toEqual('simplye');
      expect(policy.isDefault).toEqual(true);

      // returns the full policy in `.policy`
      expect(policy.policy).toEqual(policy.ilsPolicy.simplye);

      // Values found in IlsClient:
      expect(policy.policyField('agency')).toEqual('202');
      expect(Object.keys(policy.policyField('ptype'))).toEqual([
        'metro',
        'default',
      ]);
      // The type is for 3 years in an array of [years, months, days]
      expect(policy.policyField('cardType').standard).toEqual([3, 0, 0]);
      expect(policy.policyField('requiredFields')).toEqual([
        'email',
        'barcode',
      ]);
      expect(Object.keys(policy.policyField('serviceArea'))).toEqual([
        'city',
        'county',
        'state',
      ]);
      expect(policy.policyField('minimumAge')).toEqual(undefined);
    });

    it('is not a web applicant', () => {
      expect(policy.isWebApplicant).toEqual(false);
    });

    it('verifies that `email` and `barcode` are required fields', () => {
      expect(policy.isRequiredField('email')).toEqual(true);
      expect(policy.isRequiredField('barcode')).toEqual(true);
      expect(policy.isRequiredField('birthdate')).toEqual(false);
    });

    it('returns the ptype for patrons in the metro', () => {
      // Metro residents have a city of "New York" or can also have counties
      // of Richmond, Queens, New York, Kings, and the Bronx.
      const metroAddress = new Address({
        line1: '476th 5th Ave',
        city: 'New York',
        state: 'New York',
        zip: '10018',
      });
      // Card = Patron
      const metroCard = new Card({
        name: 'some name',
        username: 'username',
        address: metroAddress,
        pin: '1234',
        // This cyclical dependancy seems unnecessary but will update later.
        policy,
      });
      const metroAddress2 = new Address({
        line1: 'some address',
        state: 'New York',
        county: 'Queens',
        zip: '11368',
      });
      const metroCard2 = new Card({
        name: 'some name',
        username: 'username',
        address: metroAddress2,
        pin: '1234',
        // This cyclical dependancy seems unnecessary but will update later.
        policy,
      });
      const simplyePtype = policy.ilsPolicy.simplye.ptype;
      const metroPtype = simplyePtype.metro.id;

      let ptype = policy.determinePtype(metroCard);
      expect(ptype).toEqual(metroPtype);
      expect(ptype).toEqual(2);

      ptype = policy.determinePtype(metroCard2);
      expect(ptype).toEqual(metroPtype);
      expect(ptype).toEqual(2);
    });

    it('returns the ptype for patrons in the state', () => {
      const stateAddress = new Address({
        line1: 'Some address',
        city: 'Albany',
        state: 'New York',
        zip: '10018',
      });
      const stateCard = new Card({
        name: 'some name',
        username: 'username',
        address: stateAddress,
        pin: '1234',
        policy,
      });

      const simplyePtype = policy.ilsPolicy.simplye.ptype;
      const nysPtype = simplyePtype.default.id;

      const ptype = policy.determinePtype(stateCard);
      expect(ptype).toEqual(nysPtype);
      expect(ptype).toEqual(3);
    });

    it("doesn't update the agency for non-web applicants", () => {
      const agency = policy.determineAgency();
      const agency2 = policy.determineAgency({ patronAgency: '199' });

      // The agency always stays as 202 which is the default patron agency.
      expect(agency).toEqual('202');
      expect(agency2).toEqual('202');
      expect(policy.policyField('agency')).toEqual('202');
    });
  });

  describe('Web Applicant', () => {
    const policy = Policy({ policyType: 'webApplicant' });

    it('returns a web applicant policy and policyType', () => {
      expect(policy.policyType).toEqual('webApplicant');
      expect(policy.isDefault).toEqual(false);

      // returns the full policy in `.policy`
      expect(policy.policy).toEqual(policy.ilsPolicy.webApplicant);

      // Values found in IlsClient:
      expect(policy.policyField('agency')).toEqual('198');
      expect(Object.keys(policy.policyField('ptype'))).toEqual(['default']);
      // The card type is for 90 days in an array of [years, months, days]
      expect(policy.policyField('cardType').standard).toEqual([0, 0, 90]);
      expect(policy.policyField('requiredFields')).toEqual(['birthdate']);
      expect(policy.policyField('serviceArea')).toEqual(undefined);
      expect(policy.policyField('minimumAge')).toEqual(13);
    });

    it('is not a web applicant', () => {
      expect(policy.isWebApplicant).toEqual(true);
    });

    it('verifies that `birthdate` is a required field', () => {
      expect(policy.isRequiredField('email')).toEqual(false);
      expect(policy.isRequiredField('barcode')).toEqual(false);
      expect(policy.isRequiredField('birthdate')).toEqual(true);
    });

    it('always returns the default web ptype for web applications', () => {
      const address = new Address({
        line1: '476th 5th Ave',
        city: 'New York City',
        state: 'New York',
        zip: '10018',
      });
      // Card = Patron
      const card = new Card({
        name: 'some name',
        username: 'username',
        address,
        pin: '1234',
      });
      const webApplicantPtype = policy.ilsPolicy.webApplicant.ptype;
      const webPtypeID = webApplicantPtype.default.id;

      const ptype = policy.determinePtype(card);
      expect(ptype).toEqual(webPtypeID);

      // For web applicants, address is not checked, so it's okay
      // to not pass in the patron param;
      const ptypeNoPatron = policy.determinePtype();
      expect(ptypeNoPatron).toEqual(webPtypeID);

      // The ptype value is '1':
      expect(ptype).toEqual(1);
      expect(ptypeNoPatron).toEqual(1);
    });

    it('updates the agency for web applicants', () => {
      // Initial agency is "web applicant agency"
      expect(policy.policyField('agency')).toEqual('198');

      // The agency stays the same without any `patronAgency` param passed in.
      const sameAgency = policy.determineAgency();
      expect(sameAgency).toEqual('198');
      expect(policy.policyField('agency')).toEqual('198');

      // Now the agency should be updated to `web applicant NY State agency`.
      const nysAgency = policy.determineAgency({ patronAgency: '199' });
      expect(nysAgency).toEqual('199');
      expect(policy.policyField('agency')).toEqual('199');
    });
  });
});
