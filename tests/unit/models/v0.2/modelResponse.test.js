/* eslint-disable */
const modelResponse = require("../../../../api/models/v0.2/modelResponse");

const exampleStatus = 999;
const requestData = {
  names: ["TestLastName, TestFirstName"],
  barcodes: ["barcode_2018_06_14_328pm"],
  pin: "4316",
  expirationDate: "2019-01-01",
  birthDate: "1978-01-01",
  emails: [
    "test_email_2018_07_10_0951_a1@test.com",
    "test_email_2018_07_10_0951_b2@test.com",
  ],
  patronType: 151,
  patronCodes: {
    pcode1: "s",
    pcode2: "f",
    pcode3: 5,
    pcode4: 0,
  },
  blockInfo: {
    code: "-",
  },
  addresses: [
    {
      lines: ["ADDRESS LINE 1", "ADDRESS LINE 2"],
      type: "a",
    },
  ],
  phones: [
    {
      number: "917-123-4567",
      type: "t",
    },
  ],
};

const ilsResponse = {
  link:
    "https://qa-catalogservices.nypl.org/iii/sierra-api/v4/patrons/11111111",
};

const patronCreatorResult = {
  addresses: [
    {
      lines: ["ADDRESS LINE 1", "ADDRESS LINE 2"],
      type: "a",
    },
  ],
  barcodes: ["barcode_2018_06_14_328pm"],
  birthDate: "1978-01-01",
  blockInfo: {
    code: "-",
  },
  emails: [
    "test_email_2018_07_10_0951_a1@test.com",
    "test_email_2018_07_10_0951_b2@test.com",
  ],
  expirationDate: "2019-01-01",
  id: 11111111,
  names: ["TestLastName, TestFirstName"],
  patronCodes: {
    pcode1: "s",
    pcode2: "f",
    pcode3: 5,
    pcode4: 0,
  },
  patronType: 151,
  phones: [
    {
      number: "917-123-4567",
      type: "t",
    },
  ],
  pin: "4316",
};

describe("modelPatronCreatorResponse", () => {
  it("assigns received data to the patron object in the response", () => {
    expect(
      modelResponse.patronCreator(ilsResponse, exampleStatus, requestData)
    ).toEqual(patronCreatorResult);
  });
});
