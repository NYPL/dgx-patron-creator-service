const modelRequestBody = require('../../../../api/models/v0.2/modelRequestBody');

const emptyPatronObject = null;
const fullPatronObject = { generalPatron: { dateOfBirth: 'date of birth', policy_type: 'example policy_type', patron_agency: 'example patron_agency' } };
const ecommunicationsPrefTruePatronObject = { generalPatron: { ecommunications_pref: true } };
const ecommunicationsPrefFalsePatronObject = { generalPatron: { ecommunications_pref: false } };

describe('modelGeneralPatron', () => {
  it('contains an empty birthdate if empty dateOfBirth is given', () => {
    expect(modelRequestBody.modelGeneralPatron(emptyPatronObject)).toEqual(expect.objectContaining({ birthdate: '' }));
  });

  it('contains "date of birth" as birthdate', () => {
    expect(modelRequestBody.modelGeneralPatron(fullPatronObject)).toEqual(expect.objectContaining({ birthdate: 'date of birth' }));
  });

  it('does not contain dateOfBirth', () => {
    expect(modelRequestBody.modelGeneralPatron(fullPatronObject)).not.toEqual(expect.objectContaining({ dateOfBirth: 'date of birth' }));
  });

  it('contains policy_type', () => {
    expect(modelRequestBody.modelGeneralPatron(fullPatronObject)).toEqual(expect.objectContaining({ policy_type: 'example policy_type' }));
  });

  it('if there is no policy_type, it uses the default type web_applicant', () => {
    expect(modelRequestBody.modelGeneralPatron(emptyPatronObject)).toEqual(expect.objectContaining({ policy_type: 'web_applicant' }));
  });

  it('converts ecommunications_pref value from true to "s"', () => {
    expect(modelRequestBody.modelGeneralPatron(ecommunicationsPrefTruePatronObject)).toEqual(expect.objectContaining({ ecommunications_pref: 's' }));
  });

  it('converts ecommunications_pref value from false to "-"', () => {
    expect(modelRequestBody.modelGeneralPatron(ecommunicationsPrefFalsePatronObject)).toEqual(expect.objectContaining({ ecommunications_pref: '-' }));
  });

  it('contains patron_agency', () => {
    expect(modelRequestBody.modelGeneralPatron(fullPatronObject)).toEqual(expect.objectContaining({ patron_agency: 'example patron_agency' }));
  });

  it('sets patron_agency to "198" if not present', () => {
    expect(modelRequestBody.modelGeneralPatron(emptyPatronObject)).toEqual(expect.objectContaining({ patron_agency: '198' }));
  });
});
