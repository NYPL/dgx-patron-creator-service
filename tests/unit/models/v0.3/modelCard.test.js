import Card, { CardValidator } from '../../../../api/models/v0.3/modelCard';
import Policy from '../../../../api/models/v0.3/modelPolicy';

const basicCard = {
  name: 'First Last',
  address: '476th 5th Ave.',
  username: 'firstLast',
  pin: '1234',
};

describe('CardValidator', () => {
  const cardValidator = new CardValidator();
  describe('validate_birthdate', () => {
    it("returns no errors if the policy doesn't require it", () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/1988',
        policy: Policy(),
      });

      const validatedCard = cardValidator.validate_birthdate(card);

      expect(validatedCard.errors).toEqual({});
    });

    it('returns no errors if the policy requires it but the birthdate is valid', () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/1988',
        policy: Policy({ policyType: 'webApplicant' }),
      });

      const validatedCard = cardValidator.validate_birthdate(card);

      expect(validatedCard.errors).toEqual({});
    });
    it('returns an error if the policy requires it and the birthdate is not valid', () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/2013',
        policy: Policy({ policyType: 'webApplicant' }),
      });

      const validatedCard = cardValidator.validate_birthdate(card);

      expect(validatedCard.errors).toEqual({
        age: ['Date of birth is below the minimum age of 13.'],
      });
    });
  });

  describe('validate_address', () => {});

  describe('validate', () => {});
});

describe('Card', () => {
  describe('Init', () => {
    it('should not set a temporary card by default', () => {
      const card = new Card(basicCard);
      expect(card.is_temporary).toEqual(false);
    });
  });

  describe('validations', () => {});

  describe('check_valid_name', () => {
    it('should return whatever value is already set', () => {
      const card = new Card(basicCard);
      expect(card.has_valid_name).toEqual(undefined);
      // mock that it has a valid name
      card.has_valid_name = true;
      expect(card.check_valid_name()).toEqual(true);
      // mock that it has an invalid name
      card.has_valid_name = false;
      expect(card.check_valid_name()).toEqual(false);
    });
    it("should return if it's not already valid and validation is disabled", () => {
      const card = new Card(basicCard);
      // mock that it has a valid name
      expect(card.check_valid_name()).toEqual(true);
    });
    it('should check for name validity', () => {
      const card = new Card(basicCard);
      card.name_validation_disabled = false;
      // Mock until NameValidationAPI is implemented.
      card.check_name_validity = jest.fn().mockReturnValue(true);

      expect(card.check_valid_name()).toEqual(true);
    });
  });
  // TODO when NameValidationApi is complete
  describe('check_name_validity', () => {});

  describe('check_valid_username', () => {
    it('should return whatever value is already set', () => {
      const card = new Card(basicCard);
      expect(card.has_valid_username).toEqual(undefined);
      // mock that it has a valid name
      card.has_valid_username = true;
      expect(card.check_valid_username()).toEqual(true);
      // mock that it has an invalid name
      card.has_valid_username = false;
      expect(card.check_valid_username()).toEqual(false);
    });
    it('should check for username availability', () => {
      const card = new Card(basicCard);
      // Mock until UsernameValidationApi is implemented.
      card.check_username_availability = jest.fn().mockReturnValue(true);

      expect(card.check_valid_name()).toEqual(true);
    });
  });

  // TODO when UsernameValidationApi is complete
  describe('check_username_availability', () => {});

  describe('required_by_policy', () => {});
  describe('works_in_city', () => {});
  describe('lives_or_works_in_city', () => {});
  describe('lives_in_state', () => {});

  describe('valid_for_ils', () => {
    it('should return false if the card is not valid', () => {
      const card = new Card(basicCard);
      expect(card.valid_for_ils()).toEqual(false);
    });
    it('should return false if the card is valid but there is no ptype', () => {
      const card = new Card(basicCard);
      // mocking this for now
      card.validate();
      expect(card.valid_for_ils()).toEqual(false);
    });
    it('should return true if the card is valid and there is a ptype', () => {
      const card = new Card(basicCard);
      // mocking this for now
      card.ptype = '2';
      card.valid = true;
      expect(card.valid_for_ils()).toEqual(true);
    });
  });

  describe('set_barcode', () => {});
  describe('set_ptype', () => {});

  describe('set_temporary', () => {
    it('should not be temporary by default and set to temporary', () => {
      const card = new Card(basicCard);

      expect(card.is_temporary).toEqual(false);
      card.set_temporary();
      expect(card.is_temporary).toEqual(true);
    });
  });

  describe('card_denied', () => {});
  describe('normalized_birthdate', () => {
    const card = new Card(basicCard);
    it('should return undefined if nothing is passed', () => {
      expect(card.normalized_birthdate()).toEqual(undefined);
    });
    it('should return a new date object', () => {
      const date = '01/01/1988';
      expect(card.normalized_birthdate(date)).toEqual(new Date(date));
    });
  });

  describe('create_ils_patron', () => {});
  describe('set_patron_id', () => {});
  describe('set_temporary_barcode', () => {});
  describe('check_card_type_policy', () => {});
  describe('details', () => {});
  describe('select_message', () => {});
});
