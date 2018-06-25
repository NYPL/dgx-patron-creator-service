const modelStreamPatron = require('../../../api/model/modelStreamPatron');

var data = { simplePatron: {} }
var modeledResponse = { data: data }
var defaultStreamedObject = {
  "simplePatron": {"address": {"city": "", "line_1": "", "line_2": "",
  "state": "", "zip": ""}, "barcode": "", "birthdate": "", "ecommunications_pref": "",
  "email": "", "name": "", "patron_agency": "", "patron_id": "", "pin": "",
  "policy_type": "", "username": ""}};

describe('modelStreamPatron', () => {
  it('returns a default streamed object if simplePatron is provided ', () => {
    return expect(
      modelStreamPatron.modelStreamPatron.transformSimplePatronRequest(data, modeledResponse))
        .resolves.toEqual(expect.objectContaining(defaultStreamedObject)
    );
  });

  it('returns an error message if data.simplePatron is not present ', () => {
    return expect(modelStreamPatron.modelStreamPatron.transformSimplePatronRequest({}, modeledResponse))
      .rejects.toEqual("simplePatron object was not found");
  });

  it('returns an error message if data.simplePatron is not present ', () => {
    return expect(modelStreamPatron.modelStreamPatron.transformSimplePatronRequest(data, { data: {} }))
      .rejects.toEqual("modeledResponse simplePatron object was not found");
  });
});
