/* eslint-disable */
const modelDebug = require("../../../../api/models/v0.2/modelDebug");

const filledFields = [{ name: "val1", value: "Name" }];
const blankFields = [
  { name: "val2", value: null },
  { name: "val3", value: NaN },
  { name: "val4", value: "" },
  { name: "val5", value: 0 },
  { name: "val6", value: false },
];

describe("checkMissingRequiredField", () => {
  it("returns a required field if it is missing", () => {
    expect(
      modelDebug.checkMissingRequiredField(filledFields.concat(blankFields))
    ).toEqual(blankFields);
  });
  it("returns nothing if there are no missing fields", () => {
    expect(modelDebug.checkMissingRequiredField(filledFields)).toEqual([]);
  });
});

describe("renderMissingFieldDebugMessage", () => {
  it("does not create a debug message if there are no missing fields", () => {
    expect(modelDebug.renderMissingFieldDebugMessage()).toEqual({});
  });
  it("creates a debug message if a field is missing", () => {
    const errorMessage = {
      val2: ["Missing val2."],
      val3: ["Missing val3."],
      val4: ["Missing val4."],
      val5: ["Missing val5."],
      val6: ["Missing val6."],
    };

    expect(modelDebug.renderMissingFieldDebugMessage(blankFields)).toEqual(
      errorMessage
    );
  });
});
