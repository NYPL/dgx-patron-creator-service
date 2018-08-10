const modelStreamPatron = require('../../../../api/models/v0.2/modelStreamPatron');

const requestBody = {
  patronCodes: {
    pcode4: null, // necessary until we are no longer hard coding it in modelStreamPatron.js
  },
};
const modeledResponse = { data: requestBody };
const defaultStreamedObject = {
  data: {
    addresses: null,
    barcodes: [],
    birthDate: '',
    blockInfo: null,
    emails: [],
    expirationDate: '',
    id: '',
    names: [],
    patronCodes: {
      pcode4: 0,
    },
    patronType: null,
    phones: null,
    pin: null,
  },
};

describe('modelStreamPatron', () => {
  it('returns a default streamed object if patron is provided ', () => expect(
    modelStreamPatron.modelStreamPatron.transformPatronRequest(requestBody, modeledResponse))
    .resolves.toEqual(expect.objectContaining(defaultStreamedObject.data)));
});
