const modelStreamPatron = require('../../../../api/models/v0.2/modelStreamPatron');

const requestBody = {
  patronCodes: {
    pcode4: null, // necessary until we are no longer hard coding it in modelStreamPatron.js
  },
};
const modeledResponse = { data: requestBody };
const defaultStreamedObject = {
  data: {
    id: '',
    names: [],
    barcodes: [],
    expirationDate: '',
    birthDate: '',
    emails: [],
    pin: null,
    patronType: null,
    patronCodes: {
      pcode4: -1,
    },
    blockInfo: null,
    addresses: null,
    phones: null,
  },
};

describe('modelStreamPatron', () => {
  it('returns a default streamed object if patron is provided ', () => expect(
    modelStreamPatron.modelStreamPatron.transformPatronRequest(requestBody, modeledResponse))
    .resolves.toEqual(expect.objectContaining(defaultStreamedObject.data)));
});
