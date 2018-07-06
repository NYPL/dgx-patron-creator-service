const modelStreamPatron = require('../../../../api/models/v0.2/modelStreamPatron');

const data = { simplePatron: {} };
const modeledResponse = { data };
const defaultStreamedObject = {
  simplePatron: {
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
  it('returns a default streamed object if simplePatron is provided ', () => expect(
    modelStreamPatron.modelStreamPatron.transformSimplePatronRequest(data, modeledResponse))
    .resolves.toEqual(expect.objectContaining(defaultStreamedObject),
    ));

  it('returns an error message if data.simplePatron is not present ', () => expect(modelStreamPatron.modelStreamPatron.transformSimplePatronRequest({}, modeledResponse))
    .rejects.toEqual(new Error('simplePatron object was not found')));

  it('returns an error message if modeledResponse is not present ', () => expect(modelStreamPatron.modelStreamPatron.transformSimplePatronRequest(data, { data: {} }))
    .rejects.toEqual(new Error('modeledResponse simplePatron object was not found')));
});
