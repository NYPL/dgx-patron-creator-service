const request = require('request');
const expect = require('chai').expect;

const options = {
  uri: 'http://localhost:3001/api/v0.2/patrons',
  method: 'POST',
  json: {
    names: [
      'TestLastName, TestFirstName',
    ],
    barcodes: [
      'barcode_2018_06_14_328pm',
    ],
    pin: '4316',
    expirationDate: '2019-01-01',
    birthDate: '1978-01-01',
    emails: [
      'test_email_2018_07_10_0951_a1@test.com',
      'test_email_2018_07_10_0951_b2@test.com',
    ],
    patronType: 151,
    patronCodes: {
      pcode1: 's',
      pcode2: 'f',
      pcode3: 5,
      pcode4: 0,
    },
    blockInfo: {
      code: '-',
    },
    addresses: [{
      lines: [
        'ADDRESS LINE 1',
        'ADDRESS LINE 2',
      ],
      type: 'a',
    }],
    phones: [{
      number: '917-123-4567',
      type: 't',
    }],
  },
};

if (process.env.INTEGRATION_TESTS === 'true') {
  describe('createPatron v0.2 route', () => {
    console.log('*** Running integration tests ***'); // eslint-disable-line no-console
    // TODO: Mocking the Kinesis stream as seen here: https://github.com/NYPL-discovery/node-nypl-streams-client/blob/pb/mocked-sdk-in-test-suite/test/encoding.test.js
    it('sends the patron data to the ILS', (done) => {
      request.post(options, (err, res, body) => {
        if (!res) {
          console.log("*** Note: You aren't receiving a response from the Patron Creator Service.  Make sure the server is running in another tab. ***"); // eslint-disable-line no-console
        }
        expect(res.statusCode).equal(201);
        expect(res.body.id).to.be.a('Number'); // eslint-disable-line jest/valid-expect
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
