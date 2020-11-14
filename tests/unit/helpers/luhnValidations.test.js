const luhn = require("../../../api/helpers/luhnValidations");

// This is an internal function that calculates the checksum digit.
// Internally, a "0" is added at the end of the sequence.
describe("luhnChecksum", () => {
  it("returns the checksum digit of a sequence of numbers", () => {
    // The original number is 2888805543244.
    let checksumDigit = luhn.checksum("28888055432440");
    expect(checksumDigit).toEqual(3);

    checksumDigit = luhn.checksum(28888055432440);
    expect(checksumDigit).toEqual(3);
  });
});

describe("luhnCalculate", () => {
  it("returns a valid sequence of numbers with the checksum digit included", () => {
    let completeSequence = luhn.calculate("2888805543244");
    expect(completeSequence).toEqual("28888055432443");

    completeSequence = luhn.calculate(2888805543244);
    expect(completeSequence).toEqual("28888055432443");
  });
});

describe("luhnValidate", () => {
  it("checks if a number is a valid sequence following the Luhn-algorithm", () => {
    let isValid = luhn.validate("28888055432443");
    expect(isValid).toEqual(true);

    isValid = luhn.validate("28888055432444");
    expect(isValid).toEqual(false);
  });
});
