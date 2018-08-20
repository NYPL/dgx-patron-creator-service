const modelStreamPatron = require('../../../../api/models/v0.2/modelStreamPatron');

const requestBody = {};
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
      pcode1: null,
      pcode2: null,
      pcode3: null,
      pcode4: null,
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
