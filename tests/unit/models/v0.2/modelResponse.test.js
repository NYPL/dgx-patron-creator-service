const modelResponse = require('../../../../api/models/v0.2/modelResponse');

const exampleStatus = 999;
const requestData = {
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
};

const ilsResponse = {
  link: 'https://nypl-sierra-test.iii.com/iii/sierra-api/v4/patrons/7129988',
};

const patronCreatorResult = {
  data: [
    {
      id: 7129988,
      names: [
        'TestLastName, TestFirstName',
      ],
      barcodes: [
        'barcode_2018_06_14_328pm',
      ],
      expirationDate: '',
      birthDate: '1978-01-01',
      emails: [
        'test_email_2018_07_10_0951_a1@test.com',
        'test_email_2018_07_10_0951_b2@test.com',
      ],
      patronType: 151,
      pin: '4316',
      addresses: [
        {
          lines: [
            'ADDRESS LINE 1',
            'ADDRESS LINE 2',
          ],
          type: 'a',
        },
      ],
      blockInfo: {
        code: '-',
      },
      patronCodes: {
        pcode1: 's',
        pcode2: 'f',
        pcode3: 5,
        pcode4: 0,
      },
      phones: [
        {
          number: '917-123-4567',
          type: 't',
        },
      ],
    },
  ],
  count: 1,
  totalCount: 0,
  statusCode: exampleStatus,
  debugInfo: [],
};

describe('modelPatronCreatorResponse', () => {
  it('assigns received data to the patron object in the response', () => {
    expect(modelResponse.patronCreator(ilsResponse, exampleStatus, requestData))
      .toEqual(patronCreatorResult);
  });
});
