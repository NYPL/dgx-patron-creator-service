const { strToBool } = require('../../../api/helpers/utils');

describe('strToBool', () => {
  it('returns undefined for bad string', () => {
    const bool = strToBool();
    expect(bool).toEqual(false);
  });
  it('returns true or false if that value is in the string passed', () => {
    const trueInString = strToBool('true string');
    const falseInString = strToBool('false string');
    const trueInStringUpper = strToBool('True string');
    const falseInStringUpper = strToBool('False string');
    const trueString = strToBool('true');
    const falseString = strToBool('false');

    expect(trueInString).toEqual(true);
    expect(falseInString).toEqual(false);
    expect(trueInStringUpper).toEqual(true);
    expect(falseInStringUpper).toEqual(false);
    expect(trueString).toEqual(true);
    expect(falseString).toEqual(false);
  });
});
