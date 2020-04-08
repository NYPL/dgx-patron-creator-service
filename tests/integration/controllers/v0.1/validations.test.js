const request = require('request');
const expect = require('chai').expect;
const faker = require('faker');

const generateUsernameOptions = (username) => ({
  uri: 'http://localhost:3001/api/v0.1/validations/username',
  method: 'POST',
  json: { username },
});
const generateAddressOptions = (address) => ({
  uri: 'http://localhost:3001/api/v0.1/validations/address',
  method: 'POST',
  json: {
    address,
    is_work_or_school_address: true,
  },
});

// TODO: Mocking the Kinesis stream as seen here: https://github.com/NYPL-discovery/node-nypl-streams-client/blob/pb/mocked-sdk-in-test-suite/test/encoding.test.js
if (process.env.INTEGRATION_TESTS === 'true') {
  // eslint-disable-next-line no-console
  console.log('*** Running integration tests ***');
  describe('validations/username v0.1 route', () => {
    it('sends an available username data to Card Creator', (done) => {
      const randomValidName = faker.name.firstName() + Math.floor(Math.random() * 100000);
      const usernameOptions = generateUsernameOptions(randomValidName);
      // eslint-disable-next-line no-unused-vars
      request.post(usernameOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(true);
        expect(res.body.data.type).equal('available-username');
        expect(res.body.data.card_type).equal('standard');
        expect(res.body.data.message).equal('This username is available.');
        done();
      });
    });

    it('sends an unavailable username data to Card Creator', (done) => {
      const usernameOptions = generateUsernameOptions('nyplusername');
      // eslint-disable-next-line no-unused-vars
      request.post(usernameOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(false);
        expect(res.body.data.type).equal('unavailable-username');
        expect(res.body.data.card_type).equal(null);
        expect(res.body.data.message).equal(
          'This username is unavailable. Please try another.',
        );
        done();
      });
    });

    it('sends an invalid username data to Card Creator', (done) => {
      const usernameOptions = generateUsernameOptions('nypl--');
      // eslint-disable-next-line no-unused-vars
      request.post(usernameOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(false);
        expect(res.body.data.type).equal('invalid-username');
        expect(res.body.data.card_type).equal(null);
        expect(res.body.data.message).equal(
          'Username must be 5-25 alphanumeric characters (A-z0-9).',
        );
        done();
      });
    });
  });

  describe('validations/address v0.1 route', () => {
    it('sends a valid standard address to Card Creator', (done) => {
      const address = {
        line_1: '476 5th Avenue',
        city: 'New York',
        state: 'NY',
        zip: '10018',
      };
      const addressOptions = generateAddressOptions(address);
      // eslint-disable-next-line no-unused-vars
      request.post(addressOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(true);
        expect(res.body.data.type).equal('valid-address');
        expect(res.body.data.card_type).equal('standard');
        expect(res.body.data.message).equal(
          'This valid address will result in a standard library card.',
        );
        expect(res.body.data.addresses.length).equal(1);
        done();
      });
    });
    it('sends a valid address outside of NY to Card Creator', (done) => {
      const address = {
        line_1: ' 101 Independence Ave SE, Washington',
        city: 'Washington',
        county: '',
        state: 'DC',
        zip: '20540',
      };
      const addressOptions = generateAddressOptions(address);
      // eslint-disable-next-line no-unused-vars
      request.post(addressOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(true);
        expect(res.body.data.type).equal('valid-address');
        expect(res.body.data.card_type).equal(null);
        expect(res.body.data.message).equal(
          'Library cards are only available for residents of New York State or students and commuters working in New York City.',
        );
        expect(res.body.data.addresses.length).equal(1);
        done();
      });
    });
    it('sends a valid address to Card Creator but it is temporary', (done) => {
      const address = {
        line_1: '3747 61st St.',
        city: 'New York',
        state: 'NY',
        zip: '11377',
      };
      const addressOptions = generateAddressOptions(address);
      // eslint-disable-next-line no-unused-vars
      request.post(addressOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(true);
        expect(res.body.data.type).equal('valid-address');
        expect(res.body.data.card_type).equal('temporary');
        expect(res.body.data.message).equal(
          'This valid address will result in a temporary library card. You must visit an NYPL branch within the next 30 days to receive a standard card.',
        );
        expect(res.body.data.addresses.length).equal(1);
        done();
      });
    });
    it('sends a valid address to Card Creator and get multiple addresses', (done) => {
      const address = {
        line_1: '331 61st St.',
        city: 'New York',
        state: 'NY',
        zip: '11377',
      };
      const addressOptions = generateAddressOptions(address);
      // eslint-disable-next-line no-unused-vars
      request.post(addressOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(true);
        expect(res.body.data.type).equal('alternate-addresses');
        expect(res.body.data.card_type).equal(null);
        expect(res.body.data.message).equal(
          'Alternate addresses have been identified.',
        );
        expect(res.body.data.addresses.length).equal(2);
        done();
      });
    });
    it('sends an unrecognized address to Card Creator', (done) => {
      const address = {
        line_1: '1123 fake Street',
        line_2: '',
        city: 'New York',
        county: '',
        state: 'NY',
        zip: '05150',
      };
      const addressOptions = generateAddressOptions(address);
      // eslint-disable-next-line no-unused-vars
      request.post(addressOptions, (err, res, body) => {
        if (!res) {
          // eslint-disable-next-line no-console
          console.log(
            "*** Note: You aren't receiving a response.  Make sure the server is running in another tab. ***",
          );
        }
        expect(res.statusCode).equal(200);
        expect(res.body.data.status_code_from_card_creator).equal(200);
        expect(res.body.data.valid).equal(false);
        expect(res.body.data.type).equal('unrecognized-address');
        expect(res.body.data.card_type).equal(null);
        expect(res.body.data.message).equal('Street not found');
        expect(res.body.data.addresses.length).equal(0);
        done();
      });
    });
  });
} else {
  console.log('*** Skipping integration tests ***'); // eslint-disable-line no-console
  console.log(
    '*** Run integration tests with this command: `INTEGRATION_TESTS=true npm test` ***',
  ); // eslint-disable-line no-console
  describe('example test', () => {
    it('always passes', () => {
      // at least one test is required or else the test suite will not run
    });
  });
}
