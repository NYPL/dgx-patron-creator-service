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
  describe('validateBirthdate', () => {
    it("returns no errors if the policy doesn't require it", () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/1988',
        policy: Policy(),
      });

      const validatedCard = cardValidator.validateBirthdate(card);

      expect(validatedCard.errors).toEqual({});
    });

    it('returns no errors if the policy requires it but the birthdate is valid', () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/1988',
        policy: Policy({ policyType: 'webApplicant' }),
      });

      const validatedCard = cardValidator.validateBirthdate(card);

      expect(validatedCard.errors).toEqual({});
    });
    it('returns an error if the policy requires it and the birthdate is not valid', () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/2013',
        policy: Policy({ policyType: 'webApplicant' }),
      });

      const validatedCard = cardValidator.validateBirthdate(card);

      expect(validatedCard.errors).toEqual({
        age: ['Date of birth is below the minimum age of 13.'],
      });
    });
  });

  describe('validateAddress', () => {});

  describe('validate', () => {});
});

describe('Card', () => {
  describe('Init', () => {
    it('should not set a temporary card by default', () => {
      const card = new Card(basicCard);
      expect(card.isTemporary).toEqual(false);
    });
  });

  describe('validations', () => {});

  describe('checkValidName', () => {
    it('should return whatever value is already set', () => {
      const card = new Card(basicCard);
      expect(card.hasValidName).toEqual(undefined);
      // mock that it has a valid name
      card.hasValidName = true;
      expect(card.checkValidName()).toEqual(true);
      // mock that it has an invalid name
      card.hasValidName = false;
      expect(card.checkValidName()).toEqual(false);
    });
    it("should return if it's not already valid and validation is disabled", () => {
      const card = new Card(basicCard);
      // mock that it has a valid name
      expect(card.checkValidName()).toEqual(true);
    });
    it('should check for name validity', () => {
      const card = new Card(basicCard);
      card.nameValidationDisabled = false;
      // Mock until NameValidationAPI is implemented.
      card.checkNameValidity = jest.fn().mockReturnValue(true);

      expect(card.checkValidName()).toEqual(true);
    });
  });
  // TODO when NameValidationApi is complete
  describe('checkNameValidity', () => {});

  describe('checkValidUsername', () => {
    it('should return whatever value is already set', () => {
      const card = new Card(basicCard);
      expect(card.hasValidUsername).toEqual(undefined);
      // mock that it has a valid name
      card.hasValidUsername = true;
      expect(card.checkValidUsername()).toEqual(true);
      // mock that it has an invalid name
      card.hasValidUsername = false;
      expect(card.checkValidUsername()).toEqual(false);
    });
    it('should check for username availability', () => {
      const card = new Card(basicCard);
      // Mock until UsernameValidationApi is implemented.
      card.checkUsernameAvailability = jest.fn().mockReturnValue(true);

      expect(card.checkValidName()).toEqual(true);
    });
  });

  // TODO when UsernameValidationApi is complete
  describe('checkUsernameAvailability', () => {});

  describe('requiredByPolicy', () => {});
  describe('worksInCity', () => {});
  describe('livesOrWorksInCity', () => {});
  describe('livesInState', () => {});

  describe('validForIls', () => {
    it('should return false if the card is not valid', () => {
      const card = new Card(basicCard);
      expect(card.validForIls()).toEqual(false);
    });
    it('should return false if the card is valid but there is no ptype', () => {
      const card = new Card(basicCard);
      // mocking this for now
      card.validate();
      expect(card.validForIls()).toEqual(false);
    });
    it('should return true if the card is valid and there is a ptype', () => {
      const card = new Card(basicCard);
      // mocking this for now
      card.ptype = '2';
      card.valid = true;
      expect(card.validForIls()).toEqual(true);
    });
  });

  describe('setBarcode', () => {});
  describe('setPtype', () => {});

  describe('setTemporary', () => {
    it('should not be temporary by default and set to temporary', () => {
      const card = new Card(basicCard);

      expect(card.isTemporary).toEqual(false);
      card.setTemporary();
      expect(card.isTemporary).toEqual(true);
    });
  });

  describe('cardDenied', () => {});
  describe('normalizedBirthdate', () => {
    const card = new Card(basicCard);
    it('should return undefined if nothing is passed', () => {
      expect(card.normalizedBirthdate()).toEqual(undefined);
    });
    it('should return a new date object', () => {
      const date = '01/01/1988';
      expect(card.normalizedBirthdate(date)).toEqual(new Date(date));
    });
  });

  describe('createIlsPatron', () => {});
  describe('setPatronId', () => {});
  describe('setTemporaryBarcode', () => {});
  describe('checkCardTypePolicy', () => {});
  describe('details', () => {});
  describe('selectMessage', () => {});
});
