const modelStreamPatron = require('../../../../api/models/v0.2/modelStreamPatron');

const data = { generalPatron: {} };
const modeledResponse = { data };
const defaultStreamedObject = {
  generalPatron: {
    address: {
      city: '', line_1: '', line_2: '', state: '', zip: '',
    },
    barcode: '',
    birthdate: '',
    ecommunications_pref: '',
    email: '',
    name: '',
    patron_agency: '',
    patron_id: '',
    pin: '',
    policy_type: '',
    username: '',
  },
};

describe('modelStreamPatron', () => {
  it('returns a default streamed object if generalPatron is provided ', () => expect(
    modelStreamPatron.modelStreamPatron.transformGeneralPatronRequest(data, modeledResponse))
    .resolves.toEqual(expect.objectContaining(defaultStreamedObject),
    ));

  it('returns an error message if data.generalPatron is not present ', () => expect(modelStreamPatron.modelStreamPatron.transformGeneralPatronRequest({}, modeledResponse))
    .rejects.toEqual(new Error('generalPatron object was not found')));

  it('returns an error message if modeledResponse is not present ', () => expect(modelStreamPatron.modelStreamPatron.transformGeneralPatronRequest(data, { data: {} }))
    .rejects.toEqual(new Error('modeledResponse generalPatron object was not found')));
});
