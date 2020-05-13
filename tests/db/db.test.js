/* eslint-disable */

const BarcodeDb = require("../../db");

// If Travis is not running the tests, use the local environment variables.
if (!process.env.TRAVIS) {
  const pathName = `${process.cwd()}/config/deploy_development.env`;
  require("dotenv").config({ path: pathName });
}

// Initialize the connection to the database.
const db = BarcodeDb({
  database: "barcodes_test",
  port: "5432",
  user: process.env.DB_USER_TEST,
  host: process.env.DB_HOST_TEST,
  password: process.env.DB_PASSWORD_TEST,
});

describe("Barcodes Database", () => {
  beforeAll(async () => {
    await db.init();
  });

  afterAll(async () => {
    await db.release();
  });

  it("should test", async () => {
    const result = await db.query(
      "select * from barcodes order by barcodes desc limit 1;"
    );

    expect(result.rowCount).toEqual(1);
    expect(result.rows[0].barcode).toEqual("28888055432443");
  });

  // describe("init", () => {
  //   it("should call createTable and initInsert functions", async () => {
  //     const barcode = new Barcode({ ilsClient: IlsClient() });

  //     console.log(barcode);
  //     const createTableSpy = jest.spyOn(barcode, "createTable");
  //     const initInsertSpy = jest.spyOn(barcode, "initInsert");

  //     await barcode.init();

  //     expect(createTableSpy).toHaveBeenCalled();
  //     expect(initInsertSpy).toHaveBeenCalled();
  //   });
  // });
});
