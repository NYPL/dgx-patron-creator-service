import Card, { CardValidator } from '../../../../api/models/v0.3/modelCard';
import Policy from '../../../../api/models/v0.3/modelPolicy';
import Address from '../../../../api/models/v0.3/modelAddress';
import NameValidationAPI from '../../../../api/controllers/v0.3/NameValidationAPI';
import UsernameValidationAPI from '../../../../api/controllers/v0.3/UsernameValidationAPI';

jest.mock('../../../../api/controllers/v0.3/NameValidationAPI');
jest.mock('../../../../api/controllers/v0.3/UsernameValidationAPI');

const basicCard = {
  name: 'First Last',
  address: new Address({ line1: '476th 5th Ave.', city: 'New York' }),
  username: 'username',
  pin: '1234',
};

describe('CardValidator', () => {
  const { validateBirthdate } = CardValidator();

  describe('validateBirthdate', () => {
    it("returns no errors if the policy doesn't require it", () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/1988',
        policy: Policy(),
      });

      const validatedCard = validateBirthdate(card);

      expect(validatedCard.errors).toEqual({});
    });

    it('returns no errors if the policy requires it but the birthdate is valid', () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/1988',
        policy: Policy({ policyType: 'webApplicant' }),
      });

      const validatedCard = validateBirthdate(card);

      expect(validatedCard.errors).toEqual({});
    });
    it('returns an error if the policy requires it and the birthdate is not valid', () => {
      const card = new Card({
        ...basicCard,
        birthdate: '01/01/2013',
        policy: Policy({ policyType: 'webApplicant' }),
      });

      const validatedCard = validateBirthdate(card);

      expect(validatedCard.errors).toEqual({
        age: ['Date of birth is below the minimum age of 13.'],
      });
    });
  });

  describe('validateAddress', () => {});

  describe('validate', () => {});
});

describe('Card', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    NameValidationAPI.mockClear();
    UsernameValidationAPI.mockClear();
  });

  describe('Init', () => {
    it('should not set a temporary card by default', () => {
      const card = new Card(basicCard);
      expect(card.isTemporary).toEqual(false);
    });
  });

  describe('validate', () => {});

  describe('checkValidName', () => {
    it('should return whatever value is already set', () => {
      const card = new Card(basicCard);
      // It is undefined by default.
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

  // TODO: update when NameValidationAPI is complete
  describe('checkNameValidity', () => {
    const card = new Card(basicCard);

    it('fails because the name is not valid', () => {
      // Mocking that the ILS request returned false and name is not valid.
      NameValidationAPI.mockImplementation(() => ({ validate: () => false }));

      expect(card.checkNameValidity()).toEqual(false);
    });

    it('passes because the name is valid', () => {
      // Mocking that the ILS request returned true and name is valid.
      NameValidationAPI.mockImplementation(() => ({
        validate: () => ({ valid: true, type: 'valid-name' }),
      }));

      expect(card.checkNameValidity()).toEqual(true);
    });
  });

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
      // Mock until UsernameValidationAPI is implemented.
      card.checkUsernameAvailability = jest.fn().mockReturnValue(true);

      expect(card.checkValidName()).toEqual(true);
    });
  });

  // TODO: update when UsernameValidationAPI is complete
  describe('checkUsernameAvailability', () => {
    const card = new Card(basicCard);

    it('fails because the username is not valid', () => {
      // Mocking that the ILS request returned false and username is invalid.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => ({ type: 'invalid-username' }),
        responses: {},
      }));

      expect(card.checkUsernameAvailability()).toEqual(false);
    });

    it('fails because the username is unavailable', () => {
      // Mocking that the ILS request returned false and username is unavailable.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => ({ type: 'unavailable-username' }),
        responses: {},
      }));

      expect(card.checkUsernameAvailability()).toEqual(false);
    });

    it('passes because the name is valid', () => {
      const available = {
        type: 'available-username',
        card_type: 'standard',
        message: 'This username is available',
      };
      // Mocking that the ILS request returned true and username is available.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => available,
        responses: { available },
      }));

      expect(card.checkUsernameAvailability()).toEqual(true);
    });
  });

  // For `requiredByPolicy`, a Card checks if its policy requires specific
  // fields, but not if the Card itself has those field attributes.
  describe('requiredByPolicy', () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: 'webApplicant' });

    it('should check for email and barcode for simplye policies', () => {
      const card = new Card({
        ...basicCard,
        policy: simplyePolicy,
      });

      expect(card.requiredByPolicy('email')).toEqual(true);
      expect(card.requiredByPolicy('barcode')).toEqual(true);
      expect(card.requiredByPolicy('birthdate')).toEqual(false);
    });

    it('should check for birthdate for web applicant policies', () => {
      const card = new Card({
        ...basicCard,
        policy: webApplicant,
      });

      expect(card.requiredByPolicy('email')).toEqual(false);
      expect(card.requiredByPolicy('barcode')).toEqual(false);
      expect(card.requiredByPolicy('birthdate')).toEqual(true);
    });
  });

  // Do they have a work address and is it in NYC?
  describe('worksInCity', () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: 'webApplicant' });
    const workAddressNotInCity = new Address({
      line1: 'street address',
      city: 'Albany',
      state: 'New York',
    });

    const workAddressInCity = new Address({
      line1: 'street address',
      city: 'New York',
      state: 'New York',
    });

    it('always returns false for web applications with or without a work address', () => {
      let card = new Card({
        ...basicCard,
        policy: webApplicant,
      });
      expect(card.worksInCity()).toEqual(false);

      card = new Card({
        ...basicCard,
        workAddress: workAddressNotInCity,
        policy: webApplicant,
      });
      expect(card.worksInCity()).toEqual(false);

      card = new Card({
        ...basicCard,
        workAddress: workAddressInCity,
        policy: webApplicant,
      });
      expect(card.worksInCity()).toEqual(false);
    });

    it('returns false because there is no work address', () => {
      const card = new Card({
        ...basicCard,
        policy: simplyePolicy,
      });
      expect(card.worksInCity()).toEqual(false);
    });

    it('returns false if there is a work address but not in the city', () => {
      const card = new Card({
        ...basicCard,
        workAddress: workAddressNotInCity,
        policy: simplyePolicy,
      });
      expect(card.worksInCity()).toEqual(false);
    });

    it('returns true if there is a work address and it is in the city', () => {
      const card = new Card({
        ...basicCard,
        workAddress: workAddressInCity,
        policy: simplyePolicy,
      });
      expect(card.worksInCity()).toEqual(true);
    });
  });

  // If they have a resident address, is it in NYC?
  // If not, do they work in NYC?
  describe('livesOrWorksInCity', () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: 'webApplicant' });
    const addressNotInCity = new Address({
      line1: 'street address',
      city: 'Albany',
      state: 'New York',
    });

    const addressInCity = new Address({
      line1: 'street address',
      city: 'New York',
      state: 'New York',
    });

    it('always returns false for web applications', () => {
      let card = new Card({
        ...basicCard,
        policy: webApplicant,
      });
      expect(card.livesOrWorksInCity()).toEqual(false);

      // Doesn't matter if they have a work address...
      card = new Card({
        ...basicCard,
        workAddress: addressNotInCity,
        policy: webApplicant,
      });
      expect(card.livesOrWorksInCity()).toEqual(false);

      // even if that work address is in the city.
      card = new Card({
        ...basicCard,
        workAddress: addressInCity,
        policy: webApplicant,
      });
      expect(card.livesOrWorksInCity()).toEqual(false);
    });

    it('returns false because they do not live in NYC', () => {
      const card = new Card({
        ...basicCard,
        address: new Address({ city: 'Albany' }),
        policy: simplyePolicy,
      });
      expect(card.livesOrWorksInCity()).toEqual(false);
    });

    it('returns true because they do not live in NYC but work there', () => {
      const card = new Card({
        ...basicCard,
        address: new Address({ city: 'Albany' }),
        workAddress: addressInCity,
        policy: simplyePolicy,
      });
      expect(card.livesOrWorksInCity()).toEqual(true);
    });

    it('returns true if they live in NYC regardless of work address', () => {
      let card = new Card({
        ...basicCard,
        policy: simplyePolicy,
      });
      expect(card.livesOrWorksInCity()).toEqual(true);

      card = new Card({
        ...basicCard,
        workAddress: addressInCity,
        policy: simplyePolicy,
      });
      expect(card.livesOrWorksInCity()).toEqual(true);
    });
  });

  // Are they in NY state?
  describe('livesInState', () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: 'webApplicant' });
    const addressNotNY = new Address({ state: 'New Jersey' });
    const addressNY = new Address({ state: 'New York' });

    it('returns false for all web applicants if they are in NY state or not', () => {
      const cardNotNY = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: webApplicant,
      });
      const cardNY = new Card({
        ...basicCard,
        address: addressNY,
        policy: webApplicant,
      });

      expect(cardNotNY.livesInState()).toEqual(false);
      expect(cardNY.livesInState()).toEqual(false);
    });

    it('returns false if they are not in NY state', () => {
      const cardNotNY = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: simplyePolicy,
      });

      expect(cardNotNY.livesInState()).toEqual(false);
    });

    it('returns true if they are in NY state', () => {
      const cardNY = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });

      expect(cardNY.livesInState()).toEqual(true);
    });
  });

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

  // TODO when barcode API is ready
  describe('setBarcode', () => {});

  describe('setPtype', () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: 'webApplicant' });
    const addressNotNY = new Address({ state: 'New Jersey' });
    const addressNY = new Address({ city: 'New York City' });

    it('always sets the same ptype for web applicants regardless of address', () => {
      const cardNotNY = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: webApplicant,
      });
      const cardNY = new Card({
        ...basicCard,
        address: addressNY,
        policy: webApplicant,
      });

      cardNotNY.setPtype();
      cardNY.setPtype();
      // web applicants ptype is '1'
      expect(cardNotNY.ptype).toEqual('1');
      expect(cardNY.ptype).toEqual('1');
    });

    it('sets the ptype for patrons who live or work in NYC', () => {
      const cardInNYC = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });

      const cardWorksInNYC = new Card({
        ...basicCard,
        address: new Address({ city: 'Albany' }),
        workAddress: addressNY,
        policy: simplyePolicy,
      });

      // patrons in the metro area are ptype of '2'
      cardInNYC.setPtype();
      expect(cardInNYC.ptype).toEqual('2');
      cardWorksInNYC.setPtype();
      expect(cardWorksInNYC.ptype).toEqual('2');
    });

    it('sets the ptype for patrons who live in NY state but not NYC', () => {
      const cardNYState = new Card({
        ...basicCard,
        address: new Address({ state: 'New York' }),
        policy: simplyePolicy,
      });

      // patrons in the NY state area are ptype of '3'
      cardNYState.setPtype();
      expect(cardNYState.ptype).toEqual('3');
    });
  });

  describe('setTemporary', () => {
    it('should not be temporary by default and set to temporary when called', () => {
      const card = new Card(basicCard);

      expect(card.isTemporary).toEqual(false);
      card.setTemporary();
      expect(card.isTemporary).toEqual(true);
    });
  });

  describe('cardDenied', () => {
    const simplyePolicy = Policy();
    const webApplicant = Policy({ policyType: 'webApplicant' });
    const addressNotNY = new Address({ city: 'Hoboken', state: 'New Jersey' });
    const addressNY = new Address({ city: 'New York City', state: 'New York' });

    it('returns false for web applicants, anyone can get a card', () => {
      const card = new Card({
        ...basicCard,
        policy: webApplicant,
      });

      // It doesn't matter if it's a work address or not.
      const isWorkAddress = undefined;
      // It can check any address, but check its own for now.
      expect(card.cardDenied(card.address, isWorkAddress)).toEqual(false);
    });

    it('returns true if they are not in NY state', () => {
      const card = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: simplyePolicy,
      });

      // It doesn't matter if it's a work address or not.
      const isWorkAddress = undefined;
      expect(card.cardDenied(card.address, isWorkAddress)).toEqual(true);
    });

    // Patrons get a card if they work in NYC.
    it('returns false if they are not in NY state, but work in NYC', () => {
      const card = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: simplyePolicy,
      });

      const isWorkAddress = true;
      expect(card.cardDenied(card.address, isWorkAddress)).toEqual(false);
    });

    it('returns false if they are in NY state', () => {
      const card = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });

      // It doesn't matter if it's a work address or not.
      const isWorkAddress = undefined;
      expect(card.cardDenied(card.address, isWorkAddress)).toEqual(false);
    });
  });

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

  // TODO when Ils API is implemented.
  describe('createIlsPatron', () => {});
  describe('setPatronId', () => {});
  describe('setTemporaryBarcode', () => {});

  describe('checkCardTypePolicy', () => {
    const simplyePolicy = Policy();
    const addressNotNY = new Address({ city: 'Hoboken', state: 'New Jersey' });

    it('returns a card denied object response for any denied card', () => {
      const card = new Card({
        ...basicCard,
        address: addressNotNY,
        policy: simplyePolicy,
      });

      // The card must be denied to get the right response.
      expect(card.cardDenied(card.address)).toEqual(true);
      expect(card.checkCardTypePolicy(card.address)).toEqual({
        ...Card.RESPONSES.cardDenied,
        address: card.address.address,
      });
    });

    it('returns a temporary card for residential work addresses', () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: 'New York',
          state: 'New York',
          isResidential: 'true',
        }),
        policy: simplyePolicy,
      });
      const isWorkAddress = true;

      expect(card.checkCardTypePolicy(card.address, isWorkAddress)).toEqual({
        ...Card.RESPONSES.temporaryCard,
        address: card.address.address,
      });
    });

    it('returns a temporary card for non-residential home addresses', () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: 'New York',
          state: 'New York',
          isResidential: 'false',
        }),
        policy: simplyePolicy,
      });
      const isWorkAddress = false;

      expect(card.checkCardTypePolicy(card.address, isWorkAddress)).toEqual({
        ...Card.RESPONSES.temporaryCard,
        address: card.address.address,
      });
    });

    it('returns a standard card', () => {
      const card = new Card({
        ...basicCard,
        address: new Address({
          city: 'New York',
          state: 'New York',
          isResidential: 'true',
        }),
        policy: simplyePolicy,
      });
      const isWorkAddress = false;

      expect(card.checkCardTypePolicy(card.address, isWorkAddress)).toEqual({
        ...Card.RESPONSES.standardCard,
        address: card.address.address,
      });
    });
  });

  // Mock values for now
  describe('details', () => {
    const simplyePolicy = Policy();
    const card = new Card({
      ...basicCard,
      address: new Address({
        city: 'New York',
        state: 'New York',
        isResidential: 'true',
      }),
      policy: simplyePolicy,
    });

    // These are mocked for now
    card.barcode = '123456789';

    it('returns an object with basic details', () => {
      const details = card.details();

      expect(details.barcode).toEqual('123456789');
      expect(details.username).toEqual('username');
      expect(details.pin).toEqual('1234');
      expect(details.temporary).toEqual(false);
      expect(details.message).toEqual('Your library card has been created.');
    });

    it('adds the patron ID if it was created', () => {
      // mocked for now
      card.patronId = '123456789';
      const details = card.details();

      expect(details.barcode).toEqual('123456789');
      expect(details.username).toEqual('username');
      expect(details.pin).toEqual('1234');
      expect(details.temporary).toEqual(false);
      expect(details.message).toEqual('Your library card has been created.');
      // Only takes a certain substring.
      // TODO: verify it's the correct substring from the source.
      expect(details.patronId).toEqual('234567');
    });

    it('returns a temporary card message', () => {
      // mocked for now
      card.isTemporary = true;
      const details = card.details();

      expect(details.barcode).toEqual('123456789');
      expect(details.username).toEqual('username');
      expect(details.pin).toEqual('1234');
      expect(details.temporary).toEqual(true);
      expect(details.message)
        .toEqual(`Your library card is temporary because your personal information could not be
        verified. Visit your local NYPL branch within 30 days to
        upgrade to a standard card.`);
    });
  });

  describe('selectMessage', () => {
    const simplyePolicy = Policy();
    const card = new Card({
      ...basicCard,
      address: new Address({
        city: 'New York',
        state: 'New York',
        isResidential: 'true',
      }),
      policy: simplyePolicy,
    });

    it('returns a valid created card message', () => {
      expect(card.selectMessage()).toEqual(
        'Your library card has been created.',
      );
    });

    it('returns a temporary card message with the generic "personal information" reason', () => {
      card.isTemporary = true;
      expect(card.selectMessage())
        .toEqual(`Your library card is temporary because your personal information could not be
        verified. Visit your local NYPL branch within 30 days to
        upgrade to a standard card.`);
    });

    it('returns a temporary card message with the bad "address" reason', () => {
      // This happens because the address is not residential.
      card.isTemporary = true;
      card.address.address.isResidential = false;

      expect(card.selectMessage())
        .toEqual(`Your library card is temporary because your address could not be
        verified. Visit your local NYPL branch within 30 days to
        upgrade to a standard card.`);
    });

    it('returns a temporary card message with the bad "work address" reason', () => {
      // This happens because the work address is residential.
      card.isTemporary = true;
      card.address.address.isResidential = true;
      card.workAddress = new Address({
        city: 'New York',
        state: 'New York',
        isResidential: 'true',
      });

      expect(card.selectMessage())
        .toEqual(`Your library card is temporary because your work address could not be
        verified. Visit your local NYPL branch within 30 days to
        upgrade to a standard card.`);
    });
  });
});
