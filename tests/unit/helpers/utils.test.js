const {
  strToBool,
  normalizeName,
  updateJuvenileName,
  normalizedBirthdate,
} = require("../../../api/helpers/utils");

describe("strToBool", () => {
  it("returns undefined for bad string", () => {
    const bool = strToBool();
    expect(bool).toEqual(false);
    const bool2 = strToBool({});
    expect(bool2).toEqual(false);
    const bool3 = strToBool(null);
    expect(bool3).toEqual(false);
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
    const parentNames = ["NOOK, TOM"];
    const name = "Timmy Tommy";
    expect(updateJuvenileName(name, parentNames)).toEqual(name);
  });

  it("updates the child's name if there is no last name", () => {
    const parentNames = ["NOOK, TOM"];
    const name = "Timmy";
    expect(updateJuvenileName(name, parentNames)).toEqual("Timmy NOOK");
  });
});

describe("normalizeName", () => {
  it("returns the name if it's in the preferred format", () => {
    const name = "James Bond";
    expect(normalizeName(name)).toEqual(name);
  });

  it("returned the normalized name if the request name is 'lastName, firstName'", () => {
    const name = "Bond, James";
    expect(normalizeName(name)).toEqual("James Bond");
  });

  it("returns the combined first and last name inputs", () => {
    // This is to show how it would work through Express' `req.body` object.
    const body = {
      name: undefined,
      firstName: "James",
      lastName: "Bond",
    };
    const { name, firstName, lastName } = body;
    expect(normalizeName(name, firstName, lastName)).toEqual("James Bond");
  });

  it("returns the name even if the last name is not added", () => {
    const body = {
      name: undefined,
      firstName: "James",
      lastName: undefined,
    };
    const { name, firstName, lastName } = body;
    expect(normalizeName(name, firstName, lastName)).toEqual("James");
  });
});

describe("normalizedBirthdate", () => {
  it("should return undefined if nothing is passed", () => {
    expect(normalizedBirthdate()).toEqual(undefined);
  });
  it("should return a new date object", () => {
    const date = "01/01/1988";
    expect(normalizedBirthdate(date)).toEqual(new Date(date));
  });
});
