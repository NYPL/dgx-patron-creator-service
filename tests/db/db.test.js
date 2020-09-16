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
  afterAll(async () => {
    // Delete the database table after all the test have run.
    await db.directQuery("DROP TABLE barcodes;");
    await db.release();
  });

  describe("init", () => {
    it("creates a table and inserts seed data on first call", async () => {
      // Let's drop the table in case it's already there.
      try {
        await db.directQuery("DROP TABLE barcodes;");
      } catch (error) {
        console.log("The table doesn't already exist, continuing.");
      }

      // There's no table 'barcodes' to begin with.
      await expect(db.query("SELECT * FROM barcodes")).rejects.toThrow(
        'relation "barcodes" does not exist'
      );

      await db.init();

      // Init creates the table and inserts barcode '28888855432452'.
      const result = await db.query("SELECT * FROM barcodes");
      expect(result.rows[0].barcode).toEqual("28888855432452");
      expect(result.rows[0].used).toEqual(true);
    });
  });

  // A wrapper function around the postgres `query` method which takes any
  // sql query and runs it.
  describe("query", () => {
    beforeAll(async () => {
      await db.init();
    });

    it("should insert data", async () => {
      const result = await db.query(
        "INSERT INTO barcodes (barcode, used) VALUES ('28888055434384', false);"
      );

      expect(result.rowCount).toEqual(1);
    });

    it("should retrieve the barcodes", async () => {
      let result = await db.query("SELECT * FROM barcodes;");

      expect(result.rows.length).toEqual(2);

      result = await db.query(
        "SELECT barcode, used FROM barcodes WHERE used=false ORDER BY barcodes ASC limit 1;"
      );

      expect(result.rows[0].barcode).toEqual("28888055434384");
      expect(result.rows[0].used).toEqual(false);
    });
  });
});
