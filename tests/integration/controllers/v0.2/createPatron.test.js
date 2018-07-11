const request = require('request');
const expect = require('chai').expect;
const faker = require('faker');

const options = {
  uri: 'http://localhost:3001/api/v0.2/patrons',
  method: 'POST',
  json: {
    simplePatron: {
      name: 'Mikey Olson, Jr.',
      dateOfBirth: '11/11/1987',
      email: 'mjolson@example.com',
      address: {
        line_1: '123 W40th Street',
        line_2: '',
        city: 'New York',
        state: 'NY',
        zip: '10018',
      },
      username: faker.name.firstName() + Math.floor(Math.random() * 10),
      pin: '1234',
      ecommunications_pref: true,
      policy_type: 'web_applicant',
      patron_agency: '198',
    },
  },
};

if (process.env.INTEGRATION_TESTS === 'true') {
  describe('createPatron v0.2 route', () => {
    // TODO: Mocking the Kinesis stream as seen here: https://github.com/NYPL-discovery/node-nypl-streams-client/blob/pb/mocked-sdk-in-test-suite/test/encoding.test.js
    it('sends the patron data to the ILS', (done) => {
      request.post(options, (err, res, body) => {
        expect(res.statusCode).to.equal(201);
        expect(res.body.data.simplePatron.status_code_from_ils).to.equal(200);
        expect(res.body.data.simplePatron.temporary).to.equal(true);
        done();
      });
    });
  });
} else {
  console.log('*** Skipping integration tests ***'); // eslint-disable-line no-console
  console.log('*** Run integration tests with this command: `INTEGRATION_TESTS=true npm test` ***'); // eslint-disable-line no-console
  describe('example test', () => {
    it('always passes', () => {
      // at least one test is required or else the test suite will not run
    });
  });
}
