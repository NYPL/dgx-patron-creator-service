const modelDebug = require('../../../api/model/modelDebug');
const filledFields = [
  { name: 'val1', value: 'Name' }
];
const blankFields = [
  { name: 'val2', value: null },
  { name: 'val3', value: NaN },
  { name: 'val4', value: '' },
  { name: 'val5', value: 0 },
  { name: 'val6', value: false },
];

describe('checkMissingRequiredField', () => {
  it('returns a required field if it is missing', () => {
    expect(modelDebug.checkMissingRequiredField(filledFields.concat(blankFields))).toEqual(blankFields);
  });
  it('returns nothing if there are no missing fields', () => {
    expect(modelDebug.checkMissingRequiredField(filledFields)).toEqual([]);
  });
});

describe('renderMissingFieldDebugMessage', () => {
  it('creates a debug message if a field is missing', () => {
    expect(modelDebug.checkMissingRequiredField(filledFields.concat(blankFields))).toEqual(blankFields);
  });
  it('does not create a debug message if there are no missing fields', () => {
    expect(modelDebug.checkMissingRequiredField(filledFields)).toEqual([]);
  });
});
