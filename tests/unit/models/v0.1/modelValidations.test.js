const modelValidations = require('../../../../api/models/v0.1/modelValidations');

/**
 * modelValidations
 * This file tests the output from modeling non-error responses from the
 * Card Creator. Each object is a response which modelValidations.username and
 * modelValidations.address get called with (response.data, response.status).
 */

/**
 * Usernames are requested in the form of: {"username": "mikeolson--"}
 * */

const invalidUsername = {
  status: 200,
  data: {
    type: 'invalid-username',
    card_type: null,
    message: 'Username must be 5-25 alphanumeric characters (A-z0-9).',
  },
};
const availableUsername = {
  status: 200,
  data: {
    type: 'available-username',
    card_type: 'standard',
    message: 'This username is available.',
  },
};
const unavailableUsername = {
  status: 200,
  data: {
    type: 'unavailable-username',
    card_type: null,
    message: 'This username is unavailable. Please try another.',
  },
};

/**
 * Addresses are requested in the form of:
 * {
 *   "address" : {
 *     "line_1" : "street address",
 *     "city" : "New York",
 *     "state" : "NY",
 *     "zip" : "10018"
 *   },
 *   "is_work_or_school_address" : true
 * }
 */

const validAddressStandard = {
  status: 200,
  data: {
    type: 'valid-address',
    message: 'This valid address will result in a standard library card.',
    address: {
      line_1: '476 5th Ave',
      line_2: '',
      city: 'New York',
      county: 'New York',
      state: 'NY',
      zip: '10018-2788',
      is_residential: false,
    },
    card_type: 'standard',
    original_address: {
      line_1: '476 5th Avenue',
      line_2: '',
      city: 'New York',
      county: '',
      state: 'NY',
      zip: '10018',
      is_residential: null,
    },
  },
};
const validAddressOutside = {
  status: 200,
  data: {
    type: 'valid-address',
    message:
      'Library cards are only available for residents of New York State or students and commuters working in New York City.',
    address: {
      line_1: '101 Independence Ave SE Washington',
      line_2: '',
      city: 'Washington',
      county: 'District of Columbia',
      state: 'DC',
      zip: '20540-0001',
      is_residential: true,
    },
    card_type: null,
    original_address: {
      line_1: ' 101 Independence Ave SE, Washington',
      line_2: '',
      city: 'Washington',
      county: '',
      state: 'DC',
      zip: '20540',
      is_residential: null,
    },
  },
};
const validAddressTemporary = {
  status: 200,
  data: {
    type: 'valid-address',
    message:
      'This valid address will result in a temporary library card. You must visit an NYPL branch within the next 30 days to receive a standard card.',
    address: {
      line_1: 'street address',
      line_2: '',
      city: 'Woodside',
      county: 'Queens',
      state: 'NY',
      zip: '11377-2546',
      is_residential: true,
    },
    card_type: 'temporary',
    original_address: {
      line_1: 'street address',
      line_2: '',
      city: 'Woodside',
      county: '',
      state: 'NY',
      zip: '11377',
      is_residential: null,
    },
  },
};
const validMultipleAddresses = {
  status: 200,
  data: {
    type: 'alternate-addresses',
    message: 'Alternate addresses have been identified.',
    addresses: [
      {
        type: 'valid-address',
        message: 'This valid address will result in a standard library card.',
        address: {
          line_1: '766 6th Avenue',
          line_2: '',
          city: 'New York',
          county: 'New York',
          state: 'NY',
          zip: '10010-2008',
          is_residential: false,
        },
        card_type: 'standard',
        original_address: {
          line_1: '766 6th Ave',
          line_2: '',
          city: 'New York',
          county: '',
          state: 'NY',
          zip: '10010',
          is_residential: null,
        },
      },
      {
        type: 'valid-address',
        message: 'This valid address will result in a standard library card.',
        address: {
          line_1: '766 Avenue Of The Americas',
          line_2: '',
          city: 'New York',
          county: 'New York',
          state: 'NY',
          zip: '10010-2008',
          is_residential: false,
        },
        card_type: 'standard',
        original_address: {
          line_1: '766 6th Ave',
          line_2: '',
          city: 'New York',
          county: '',
          state: 'NY',
          zip: '10010',
          is_residential: null,
        },
      },
    ],
    card_type: null,
    original_address: {
      line_1: '766 6th Ave',
      line_2: '',
      city: 'New York',
      county: '',
      state: 'NY',
      zip: '10010',
      is_residential: null,
    },
  },
};
const unrecognizedAddress = {
  status: 200,
  data: {
    type: 'unrecognized-address',
    message: 'Street not found',
    original_address: {
      line_1: '1123 fake Street',
      line_2: '',
      city: 'New York',
      county: '',
      state: 'NY',
      zip: '05150',
      is_residential: null,
    },
  },
};

describe('modelValidations', () => {
  describe('validate usernames', () => {
    it('should return an invalid username model', () => {
      expect(
        modelValidations.username(invalidUsername.data, invalidUsername.status),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: false,
          type: 'invalid-username',
          card_type: null,
          message: 'Username must be 5-25 alphanumeric characters (A-z0-9).',
          detail: {},
        },
      });
    });

    it('should return an available username model', () => {
      expect(
        modelValidations.username(
          availableUsername.data,
          availableUsername.status,
        ),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: true,
          type: 'available-username',
          card_type: 'standard',
          message: 'This username is available.',
          detail: {},
        },
      });
    });

    it('should return an unavailable username model', () => {
      expect(
        modelValidations.username(
          unavailableUsername.data,
          unavailableUsername.status,
        ),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: false,
          type: 'unavailable-username',
          card_type: null,
          message: 'This username is unavailable. Please try another.',
          detail: {},
        },
      });
    });
  });

  describe('validate addresses', () => {
    it('should return a valid standard address model', () => {
      expect(
        modelValidations.address(
          validAddressStandard.data,
          validAddressStandard.status,
        ),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: true,
          type: 'valid-address',
          card_type: 'standard',
          message: 'This valid address will result in a standard library card.',
          detail: {},
          addresses: [
            {
              line_1: '476 5th Ave',
              line_2: '',
              city: 'New York',
              county: 'New York',
              state: 'NY',
              zip: '10018-2788',
              is_residential: false,
            },
          ],
          original_address: {
            line_1: '476 5th Avenue',
            line_2: '',
            city: 'New York',
            county: '',
            state: 'NY',
            zip: '10018',
            is_residential: null,
          },
        },
      });
    });
    it('should return a valid outside NY address model', () => {
      expect(
        modelValidations.address(
          validAddressOutside.data,
          validAddressOutside.status,
        ),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: true,
          type: 'valid-address',
          card_type: null,
          message:
            'Library cards are only available for residents of New York State or students and commuters working in New York City.',
          detail: {},
          addresses: [
            {
              line_1: '101 Independence Ave SE Washington',
              line_2: '',
              city: 'Washington',
              county: 'District of Columbia',
              state: 'DC',
              zip: '20540-0001',
              is_residential: true,
            },
          ],
          original_address: {
            line_1: ' 101 Independence Ave SE, Washington',
            line_2: '',
            city: 'Washington',
            county: '',
            state: 'DC',
            zip: '20540',
            is_residential: null,
          },
        },
      });
    });
    it('should return a valid temporary address model', () => {
      expect(
        modelValidations.address(
          validAddressTemporary.data,
          validAddressTemporary.status,
        ),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: true,
          type: 'valid-address',
          card_type: 'temporary',
          message:
            'This valid address will result in a temporary library card. You must visit an NYPL branch within the next 30 days to receive a standard card.',
          detail: {},
          addresses: [
            {
              line_1: 'street address',
              line_2: '',
              city: 'Woodside',
              county: 'Queens',
              state: 'NY',
              zip: '11377-2546',
              is_residential: true,
            },
          ],
          original_address: {
            line_1: 'street address',
            line_2: '',
            city: 'Woodside',
            county: '',
            state: 'NY',
            zip: '11377',
            is_residential: null,
          },
        },
      });
    });
    it('should return a multiple valid addresses model', () => {
      expect(
        modelValidations.address(
          validMultipleAddresses.data,
          validMultipleAddresses.status,
        ),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: true,
          type: 'alternate-addresses',
          card_type: null,
          message: 'Alternate addresses have been identified.',
          detail: {},
          addresses: [
            {
              line_1: '766 6th Avenue',
              line_2: '',
              city: 'New York',
              county: 'New York',
              state: 'NY',
              zip: '10010-2008',
              is_residential: false,
            },
            {
              line_1: '766 Avenue Of The Americas',
              line_2: '',
              city: 'New York',
              county: 'New York',
              state: 'NY',
              zip: '10010-2008',
              is_residential: false,
            },
          ],
          original_address: {
            line_1: '766 6th Ave',
            line_2: '',
            city: 'New York',
            county: '',
            state: 'NY',
            zip: '10010',
            is_residential: null,
          },
        },
      });
    });
    it('should return an unrecognized address model', () => {
      expect(
        modelValidations.address(
          unrecognizedAddress.data,
          unrecognizedAddress.status,
        ),
      ).toEqual({
        data: {
          status_code_from_card_creator: 200,
          valid: false,
          type: 'unrecognized-address',
          card_type: null,
          message: 'Street not found',
          detail: {},
          addresses: [],
          original_address: {
            line_1: '1123 fake Street',
            line_2: '',
            city: 'New York',
            county: '',
            state: 'NY',
            zip: '05150',
            is_residential: null,
          },
        },
      });
    });
  });
});
