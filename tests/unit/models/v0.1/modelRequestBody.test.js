const modelRequestBody = require('../../../../api/models/v0.1/modelRequestBody');

const emptyPatronObject = null;
const fullPatronObject = { simplePatron: { dateOfBirth: 'date of birth', policy_type: 'example policy_type', patron_agency: 'example patron_agency' } };
const ecommunicationsPrefTruePatronObject = { simplePatron: { ecommunications_pref: true } };
const ecommunicationsPrefFalsePatronObject = { simplePatron: { ecommunications_pref: false } };

describe('modelSimplePatron', () => {
  it('contains an empty birthdate if empty dateOfBirth is given', () => {
    expect(modelRequestBody.modelSimplePatron(emptyPatronObject)).toEqual(expect.objectContaining({ birthdate: '' }));
  });

  it('contains "date of birth" as birthdate', () => {
    expect(modelRequestBody.modelSimplePatron(fullPatronObject)).toEqual(expect.objectContaining({ birthdate: 'date of birth' }));
  });

  it('does not contain dateOfBirth', () => {
    expect(modelRequestBody.modelSimplePatron(fullPatronObject)).not.toEqual(expect.objectContaining({ dateOfBirth: 'date of birth' }));
  });

  it('contains policy_type', () => {
    expect(modelRequestBody.modelSimplePatron(fullPatronObject)).toEqual(expect.objectContaining({ policy_type: 'example policy_type' }));
  });

  it('if there is no policy_type, it uses the default type web_applicant', () => {
    expect(modelRequestBody.modelSimplePatron(emptyPatronObject)).toEqual(expect.objectContaining({ policy_type: 'web_applicant' }));
  });

  it('converts ecommunications_pref value from true to "s"', () => {
    expect(modelRequestBody.modelSimplePatron(ecommunicationsPrefTruePatronObject)).toEqual(expect.objectContaining({ ecommunications_pref: 's' }));
  });

  it('converts ecommunications_pref value from false to "-"', () => {
    expect(modelRequestBody.modelSimplePatron(ecommunicationsPrefFalsePatronObject)).toEqual(expect.objectContaining({ ecommunications_pref: '-' }));
  });

  it('contains patron_agency', () => {
    expect(modelRequestBody.modelSimplePatron(fullPatronObject)).toEqual(expect.objectContaining({ patron_agency: 'example patron_agency' }));
  });

  it('sets patron_agency to "198" if not present', () => {
    expect(modelRequestBody.modelSimplePatron(emptyPatronObject)).toEqual(expect.objectContaining({ patron_agency: '198' }));
  });
});
