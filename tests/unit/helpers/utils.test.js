const { strToBool, updateJuvenileName } = require("../../../api/helpers/utils");

describe("strToBool", () => {
  it("returns undefined for bad string", () => {
    const bool = strToBool();
    expect(bool).toEqual(false);
  });
  it("returns true or false if that value is in the string passed", () => {
    const trueInString = strToBool("true string");
    const falseInString = strToBool("false string");
    const trueInStringUpper = strToBool("True string");
    const falseInStringUpper = strToBool("False string");
    const trueString = strToBool("true");
    const falseString = strToBool("false");

    expect(trueInString).toEqual(true);
    expect(falseInString).toEqual(false);
    expect(trueInStringUpper).toEqual(true);
    expect(falseInStringUpper).toEqual(false);
    expect(trueString).toEqual(true);
    expect(falseString).toEqual(false);
  });
});

describe("updateJuvenileName", () => {
  it("returns the name if no parent's name is passed", () => {
    const name = "Timmy";
    expect(updateJuvenileName(name)).toEqual(name);
  });

  it("returns the name if it contains a last name", () => {
    // The ILS returns an account name in an array called `names`.
    const parentNames = ["Tom Nook"];
    const name = "Timmy Tommy";
    expect(updateJuvenileName(name, parentNames)).toEqual(name);
  });

  it("updates the child's name if there is no last name", () => {
    const parentNames = ["Tom Nook"];
    const name = "Timmy";
    expect(updateJuvenileName(name, parentNames)).toEqual("Timmy Nook");
  });
});
