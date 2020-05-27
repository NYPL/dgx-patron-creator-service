const {
  Card,
  CardValidator,
} = require('../../../../api/models/v0.3/modelCard');

const Policy = require('../../../../api/models/v0.3/modelPolicy');
const Address = require('../../../../api/models/v0.3/modelAddress');
const NameValidationAPI = require('../../../../api/controllers/v0.3/NameValidationAPI');
const UsernameValidationAPI = require('../../../../api/controllers/v0.3/UsernameValidationAPI');
const IlsClient = require('../../../../api/controllers/v0.3/IlsClient');
const {
  NoILSClient,
  ILSIntegrationError,
} = require('../../../../api/helpers/errors');
const Barcode = require('../../../../api/models/v0.3/modelBarcode');

jest.mock('../../../../api/controllers/v0.3/NameValidationAPI');
jest.mock('../../../../api/controllers/v0.3/UsernameValidationAPI');
jest.mock('../../../../api/controllers/v0.3/IlsClient');
jest.mock('../../../../api/models/v0.3/modelBarcode');

const basicCard = {
  name: 'First Last',
  address: new Address({ line1: '476th 5th Ave.', city: 'New York' }),
  username: 'username',
  pin: '1234',
  // required for web applicants
  birthdate: '01/01/1988',
};

describe('CardValidator', () => {
  const { validateBirthdate } = CardValidator();

  describe('validateBirthdate', () => {
    it("returns no errors if the policy doesn't require it", () => {
      const card = new Card({
        ...basicCard,
        policy: Policy(),
      });

      const validatedCard = validateBirthdate(card);

      expect(validatedCard.errors).toEqual({});
    });

    it('returns no errors if the policy requires it but the birthdate is valid', () => {
      const card = new Card({
        ...basicCard,
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
    IlsClient.mockClear();
  });

  describe('Init', () => {
    it('should not set a temporary card by default', () => {
      const card = new Card(basicCard);
      expect(card.isTemporary).toEqual(false);
    });

    it("should set homeLibraryCard to 'eb' by default", () => {
      // `basicCard` does not have a homeLibraryCard value.
      let card = new Card(basicCard);

      expect(card.homeLibraryCode).toEqual('eb');

      // but if you set one, it'll be used
      card = new Card({
        name: 'First Last',
        address: new Address({ line1: '476th 5th Ave.', city: 'New York' }),
        username: 'username',
        pin: '1234',
        // required for web applicants
        birthdate: '01/01/1988',
        // random library code
        homeLibraryCode: 'aa',
      });

      expect(card.homeLibraryCode).toEqual('aa');
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
    const card = new Card(basicCard);

    it('should return whatever value is already set', async () => {
      expect(card.hasValidUsername).toEqual(undefined);
      // mock that it has a valid name
      card.hasValidUsername = true;
      expect(await card.checkValidUsername()).toEqual(true);
      // mock that it has an invalid name
      card.hasValidUsername = false;
      expect(await card.checkValidUsername()).toEqual(false);
    });
    it('should check for username availability', async () => {
      card.checkUsernameAvailability = jest.fn().mockReturnValue(true);
      card.hasValidUsername = undefined;
      expect(await card.checkValidUsername()).toEqual(true);
    });

    it('throws an error if no ilsClient was passed to the Card object, which calls the Username Validation API', async () => {
      // The current Card object doesn't have an IlsClient. We are mocking
      // the `checkUsernameAvailability` and throwing an error from there.
      const noIlsClient = new NoILSClient(
        'ILS Client not set in Username Validation API.',
      );
      // This is just to mock the class.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => {},
        responses: {},
      }));
      card.checkUsernameAvailability = jest.fn().mockRejectedValue(noIlsClient);

      // Mock that it hasn't been validated yet.
      card.hasValidUsername = undefined;

      await expect(card.checkValidUsername()).rejects.toEqual(noIlsClient);
    });

    it('throws an error if the ILS could not be reached', async () => {
      const iLSIntegrationError = new ILSIntegrationError(
        'The ILS could not be requested when validating the username.',
      );
      // This is just to mock the class.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => {},
        responses: {},
      }));
      card.checkUsernameAvailability = jest
        .fn()
        .mockRejectedValue(iLSIntegrationError);

      // Mock that it hasn't been validated yet.
      card.hasValidUsername = undefined;

      await expect(card.checkValidUsername()).rejects.toEqual(
        iLSIntegrationError,
      );
    });
  });

  describe('checkUsernameAvailability', () => {
    const card = new Card(basicCard);
    const available = {
      type: 'available-username',
      card_type: 'standard',
      message: 'This username is available',
    };

    it('returns an invalid username response', async () => {
      // Mocking that the ILS request returned false and username is invalid.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => ({ type: 'invalid-username' }),
        responses: { available },
      }));

      expect(await card.checkUsernameAvailability()).toEqual(false);
    });

    it('returns an unavailable username response', async () => {
      // Mocking that the ILS request returned false and username is unavailable.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => ({ type: 'unavailable-username' }),
        responses: { available },
      }));

      expect(await card.checkUsernameAvailability()).toEqual(false);
    });

    it('returns a valid username response', async () => {
      // Mocking that the ILS request returned true and username is available.
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => available,
        responses: { available },
      }));

      expect(await card.checkUsernameAvailability()).toEqual(true);
    });

    it('throws an error if no ilsClient was passed to the Card object, which calls the Username Validation API', async () => {
      // The current Card object doesn't have an IlsClient. We are mocking here
      // that the `validate` function, which calls the ILS, throws an error.
      const noIlsClient = new NoILSClient(
        'ILS Client not set in Username Validation API.',
      );
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => {
          throw noIlsClient;
        },
        responses: {},
      }));

      await expect(card.checkUsernameAvailability()).rejects.toEqual(
        noIlsClient,
      );
    });

    it('throws an error if the ILS could not be reached', async () => {
      const iLSIntegrationError = new ILSIntegrationError(
        'The ILS could not be requested when validating the username.',
      );
      UsernameValidationAPI.mockImplementation(() => ({
        validate: () => {
          throw iLSIntegrationError;
        },
        responses: {},
      }));

      await expect(card.checkUsernameAvailability()).rejects.toEqual(
        iLSIntegrationError,
      );
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

      // Defaults since the card wasn't validated.
      expect(card.valid).toEqual(false);
      expect(card.ptype).toEqual(undefined);
      expect(card.validForIls()).toEqual(false);
    });
    it('should return false if the card is valid but there is no ptype', async () => {
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: 'webApplicant' }),
      });

      // Mock a call to the ILS.
      card.checkUsernameAvailability = jest.fn().mockReturnValue(true);

      // This sets the `valid` flag to true but a ptype wasn't set.
      await card.validate();

      expect(card.valid).toEqual(true);
      expect(card.ptype).toEqual(undefined);
      expect(card.validForIls()).toEqual(false);
    });
    it('should return true if the card is valid and there is a ptype', async () => {
      // Let's create basic inputs.
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: 'webApplicant' }),
      });

      // Mock a call to the ILS.
      card.checkUsernameAvailability = jest.fn().mockReturnValue(true);
      // Let's try to validate the inputs.
      await card.validate();
      // When creating a patron in the ILS, the ptype is set before checking
      // if the card is valid for the ILS. Calling it here directly.
      card.setPtype();

      // Since it's a 'webApplicant', the pytpe is 2
      expect(card.valid).toEqual(true);
      expect(card.ptype).toEqual(1);
      expect(card.validForIls()).toEqual(true);
    });
  });

  describe('setBarcode', () => {
    beforeEach(() => {
      Barcode.mockClear();
    });
    it('should set the barcode in the card object', async () => {
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => '1234',
      }));

      const card = new Card(basicCard);

      await card.setBarcode();

      expect(card.barcode).toEqual('1234');
    });

    it('should throw an error if a barcode could not be generated', async () => {
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => undefined,
      }));

      const card = new Card(basicCard);

      await expect(card.setBarcode()).rejects.toThrow(
        'Could not generate a new barcode. Please try again.',
      );
    });
  });

  describe('freeBarcode', () => {
    beforeEach(() => {
      Barcode.mockClear();
    });
    it('should reset the barcode in the card object', async () => {
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => '1234',
        // Mocking calling the database and marking the barcode as unused.
        freeBarcode: () => 'ok',
      }));

      const card = new Card(basicCard);

      await card.setBarcode();
      expect(card.barcode).toEqual('1234');

      await card.freeBarcode();
      expect(card.barcode).toEqual('');
    });
  });

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
      expect(cardNotNY.ptype).toEqual(1);
      expect(cardNY.ptype).toEqual(1);
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
      expect(cardInNYC.ptype).toEqual(2);
      cardWorksInNYC.setPtype();
      expect(cardWorksInNYC.ptype).toEqual(2);
    });

    it('sets the ptype for patrons who live in NY state but not NYC', () => {
      const cardNYState = new Card({
        ...basicCard,
        address: new Address({ state: 'New York' }),
        policy: simplyePolicy,
      });

      // patrons in the NY state area are ptype of '3'
      cardNYState.setPtype();
      expect(cardNYState.ptype).toEqual(3);
    });
  });

  describe('setAgency', () => {
    const simplyePolicy = Policy();
    const simplyeJuvenilePolicy = Policy({ policyType: 'simplyeJuvenile' });
    const webApplicantPolicy = Policy({ policyType: 'webApplicant' });
    const addressNY = new Address({ city: 'New York City' });

    it('sets the agency for each policy type', () => {
      const web = new Card({
        ...basicCard,
        address: addressNY,
        policy: webApplicantPolicy,
      });
      const simplye = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyePolicy,
      });
      const simplyeJuvenile = new Card({
        ...basicCard,
        address: addressNY,
        policy: simplyeJuvenilePolicy,
      });

      web.setAgency();
      expect(web.agency).toEqual('198');

      simplye.setAgency();
      expect(simplye.agency).toEqual('202');

      simplyeJuvenile.setAgency();
      expect(simplyeJuvenile.agency).toEqual('202');
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

  describe('createIlsPatron', () => {
    beforeEach(() => {
      IlsClient.mockClear();
      Barcode.mockClear();
    });

    it('throws an error because the card is not valid', async () => {
      const card = new Card({
        ...basicCard,
        policy: Policy(),
      });

      await expect(card.createIlsPatron()).rejects.toThrow(
        'The card has not been validated or has no ptype.',
      );
    });

    it('does not attempt to create a barcode for web applicants', async () => {
      IlsClient.mockImplementation(() => ({
        createPatron: () => 'some patron',
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: 'webApplicant' }),
        ilsClient: IlsClient({}),
      });

      // Mocking this for now. Normally, we'd call .validate()
      card.valid = true;
      // Set up a spy for card.setBarcode() which shouldn't be called.
      const spy = jest.spyOn(card, 'setBarcode');

      await card.createIlsPatron();
      expect(spy).not.toHaveBeenCalled();
    });

    it('does attempt to create a barcode for simplye applicants', async () => {
      IlsClient.mockImplementation(() => ({
        createPatron: () => 'some patron',
      }));
      // Mocking that a barcode fails to be generated
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => '1234',
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: 'simplye' }),
        ilsClient: IlsClient({}),
      });

      // Mocking this for now. Normally, we'd call `card.validate()`.
      card.valid = true;
      // Set up a spy for card.setBarcode() which shouldn't be called.
      const spy = jest.spyOn(card, 'setBarcode');

      await card.createIlsPatron();
      expect(card.barcode).toEqual('1234');
      expect(spy).toHaveBeenCalled();
    });

    it('does attempt to create a barcode but fails!', async () => {
      IlsClient.mockImplementation(() => ({
        createPatron: () => 'some patron',
      }));
      // Mocking that a barcode fails to be generated
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => undefined,
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: 'simplye' }),
        ilsClient: IlsClient({}),
      });

      // Mocking this for now. Normally, we'd call .validate()
      card.valid = true;

      const data = await card.createIlsPatron();
      expect(data.status).toEqual(400);
      expect(data.data).toEqual(
        'Could not generate a new barcode. Please try again.',
      );
    });

    it('attempts to create a patron but fails', async () => {
      const integrationError = new ILSIntegrationError(
        'The ILS could not be requested when attempting to create a patron.',
      );
      // Mock that the ILS fails
      IlsClient.mockImplementation(() => ({
        createPatron: () => {
          throw integrationError;
        },
      }));
      // Mocking that a barcode fails to be generated
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => '1234',
        freeBarcode: () => true,
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: 'simplye' }),
        ilsClient: IlsClient(),
      });

      // Mocking this for now. Normally, we'd call .validate()
      card.valid = true;
      const spy = jest.spyOn(card, 'freeBarcode');

      await expect(card.createIlsPatron()).rejects.toEqual(integrationError);
      expect(spy).toHaveBeenCalled();
    });

    it('creates a patron', async () => {
      // Mock that the ILS fails
      IlsClient.mockImplementation(() => ({
        createPatron: () => ({
          status: 200,
          data: {
            link: 'ils-response-url',
          },
        }),
      }));
      // Mocking that a barcode fails to be generated
      Barcode.mockImplementation(() => ({
        getNextAvailableBarcode: () => '1234',
        freeBarcode: () => true,
      }));
      const card = new Card({
        ...basicCard,
        policy: Policy({ policyType: 'simplye' }),
        ilsClient: IlsClient(),
      });

      // Mocking this for now. Normally, we'd call .validate()
      card.valid = true;
      const spy = jest.spyOn(card, 'freeBarcode');

      const data = await card.createIlsPatron();

      expect(spy).not.toHaveBeenCalled();
      expect(data.status).toEqual(200);
      expect(data.data).toEqual({ link: 'ils-response-url' });
    });
  });

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

    // Mocked value
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
