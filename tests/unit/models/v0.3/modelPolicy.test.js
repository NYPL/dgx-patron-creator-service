import Policy from '../../../../api/models/v0.3/modelPolicy';

describe('Policy', () => {
  describe('Init', () => {
    it('returns the default policy and policy_type', () => {
      const policy = new Policy();

      // Default is "simplye"
      expect(policy.policy_type).toEqual(Policy.DEFAULT_POLICY_TYPE);
      expect(policy.policy).toEqual(
        Policy.ils_policy[Policy.DEFAULT_POLICY_TYPE],
      );
    });
  });
});
