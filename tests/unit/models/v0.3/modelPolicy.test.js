import Policy from '../../../../api/models/v0.3/modelPolicy';

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

      // Values found in IlsHelper:
      expect(policy.policyField('agency')).toEqual('202');
      expect(Object.keys(policy.policyField('ptype'))).toEqual([
        'metro',
        'default',
      ]);
      expect(policy.policyField('cardType').standard).toEqual('3 years');
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

    // TODO:
    // determinePtype

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

      // Values found in IlsHelper:
      expect(policy.policyField('agency')).toEqual('198');
      expect(Object.keys(policy.policyField('ptype'))).toEqual(['default']);
      expect(policy.policyField('cardType').standard).toEqual('90 days');
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
