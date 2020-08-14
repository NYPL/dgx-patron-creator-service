const Barcode = require("../../../../api/models/v0.3/modelBarcode");
const IlsClient = require("../../../../api/controllers/v0.3/IlsClient");
const BarcodeDb = require("../../../../db");
const { DatabaseError } = require("../../../../api/helpers/errors");

// Initialize the connection to the database.
const db = BarcodeDb({
  database: "barcodes_test",
  port: "5432",
  user: process.env.DB_USER_TEST,
  host: process.env.DB_HOST_TEST,
  password: process.env.DB_PASSWORD_TEST,
});

jest.mock("../../../../api/controllers/v0.3/IlsClient");

describe("Barcode", () => {
  beforeAll(async () => {
    await db.init();
  });

  afterAll(async () => {
    // Delete the database table after all the test have run.
    await db.directQuery("DROP TABLE barcodes;");
    await db.release();
  });

  it("should initialize the class", () => {
    IlsClient.mockImplementation(() => ({
      available: () => "available mock function",
    }));

    const barcode = new Barcode({ ilsClient: IlsClient() });

    expect(barcode.ilsClient).toBeDefined();
    expect(barcode.db).toBeDefined();
  });

  // This function internally calls `nextAvailableFromDb` and `availableInIls`
  // which are tested separately, so those are mocked in this set of tests.
  // Returning an available barcode depends on whether `availableInIls` finds
  // and returns a barcode that _is_ available.
  describe("getNextAvailableBarcode", () => {
    it("returns undefined if it can't get a barcode", async () => {
      const barcode = new Barcode({});

      barcode.nextAvailableFromDB = jest
        .fn()
        .mockReturnValue({ barcode: "1234", newBarcode: true });
      barcode.availableInIls = jest
        .fn()
        .mockReturnValue({ available: false, finalBarcode: "1234" });

      await expect(barcode.getNextAvailableBarcode()).resolves.toEqual(
        undefined,
      );
    });

    it("returns an available barcode", async () => {
      const barcode = new Barcode({});

      barcode.nextAvailableFromDB = jest
        .fn()
        .mockReturnValue({ barcode: "1234", newBarcode: true });
      // Mock that this barcode is available!
      barcode.availableInIls = jest
        .fn()
        .mockReturnValue({ available: true, finalBarcode: "1234" });

      await expect(barcode.getNextAvailableBarcode()).resolves.toEqual("1234");
    });
  });

  describe("nextLuhnValidCode", () => {
    it("should return undefined if the barcode is not 14 digits", () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });

      const nextBarcode = barcode.nextLuhnValidCode("1234");
      expect(nextBarcode).toBeUndefined();
    });

    it("should get the next available barcode", () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });

      const nextBarcode = barcode.nextLuhnValidCode("28888055434373");
      expect(nextBarcode).toEqual("28888055434381");
    });

    it("should take a number to get the next nth Luhn-valid code", () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });

      const nextBarcode = barcode.nextLuhnValidCode("28888055434373", 100);
      expect(nextBarcode).toEqual("28888055435370");
    });
  });

  describe("nextAvailableFromDB", () => {
    it("should get the first used barcode from the database", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const querySpy = jest.spyOn(barcode.db, "query");
      const luhnSpy = jest.spyOn(barcode, "nextLuhnValidCode");
      const nextBarcode = await barcode.nextAvailableFromDB();

      // It first tries to get the lowest barcode that is unused.
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT barcode FROM barcodes WHERE used=false ORDER BY barcodes ASC LIMIT 1;",
      );
      // But there aren't any so get the largest used one and make a new barcode.
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT barcode FROM barcodes WHERE used=true ORDER BY barcodes DESC LIMIT 1;",
      );
      expect(querySpy).toHaveBeenCalled();

      // The Luhn algorithm gets the current barcode to generate the next one.
      expect(luhnSpy).toHaveBeenCalledWith("28888055434373");

      // The next available barcode after 28888055434373 which is
      // already in the database is:
      expect(nextBarcode.barcode).toEqual("28888055434381");
      expect(nextBarcode.newBarcode).toEqual(true);
    });

    it("should get an unused barcode from the database", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });

      // Let's manually add a barcode in the database but set it to unused.
      // The `nextAvailableFromDB` function should pick this up.
      await barcode.addBarcode("28888055432435", false);

      const querySpy = jest.spyOn(barcode.db, "query");
      const nextBarcode = await barcode.nextAvailableFromDB();

      // The two queries we expect to have been called to the database:
      expect(querySpy).toHaveBeenCalled();
      // Note: These are written in order they are called but jest doesn't
      // care about order.
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT barcode FROM barcodes WHERE used=false ORDER BY barcodes ASC LIMIT 1;",
      );

      // This barcode was already in the database so "newBarcode" is false.
      expect(nextBarcode.barcode).toEqual("28888055432435");
      expect(nextBarcode.newBarcode).toEqual(false);
    });
  });

  describe("availableInIls", () => {
    it("tries x amount of times so call the ILS", async () => {
      IlsClient.mockImplementation(() => ({
        available: () => false,
      }));
      const ilsClient = IlsClient();
      const ilsSpy = jest.spyOn(ilsClient, "available");
      const barcode = new Barcode({ ilsClient });
      // Mocking that we return the same barcode because it's not important for
      // this test. In reality, a new barcode would be generated to hit the
      // ILS for availability.
      barcode.nextLuhnValidCode = jest.fn().mockReturnValue("12345");

      // The default is 10. The second parameter doesn't matter in this case
      // since the ILS will return false and we'll try another barcode.
      // The second parameter is to either add a new barcode into the database
      // or update an existing one.
      const available = await barcode.availableInIls("12345", false);
      expect(available.available).toEqual(false);
      // Normally this would be different but we're mocking that the
      // luhn-algorithm returns the same barcode.
      expect(available.finalBarcode).toEqual("12345");
      expect(ilsSpy).toHaveBeenCalledTimes(10);

      // Let's only try 5 times
      const available5 = await barcode.availableInIls("12345", false, 5);
      expect(available5.available).toEqual(false);
      // Normally this would be different but we're mocking that the
      // luhn-algorithm returns the same barcode.
      expect(available5.finalBarcode).toEqual("12345");
      // The previous 10 calls are added to the spy, so now we have 15.
      expect(ilsSpy).toHaveBeenCalledTimes(15);
    });

    it("adds a new barcode since the ILS says it is available and returns it", async () => {
      IlsClient.mockImplementation(() => ({
        available: () => true,
      }));
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const addBarcodeSpy = jest.spyOn(barcode, "addBarcode");
      const testBarcode = "98765";

      // This barcode is new.
      const available = await barcode.availableInIls(testBarcode, true);
      // And it's available in the ILS.
      expect(available.available).toEqual(true);
      expect(available.finalBarcode).toEqual(testBarcode);

      // Check that it was added to the database.
      expect(addBarcodeSpy).toHaveBeenCalled();
      expect(addBarcodeSpy).toHaveBeenCalledWith(testBarcode, true);
      // More verification.
      const result = await db.query(
        `SELECT * FROM barcodes WHERE barcode='${testBarcode}';`,
      );
      expect(result.rows[0].used).toEqual(true);
      expect(result.rows[0].barcode).toEqual(testBarcode);
    });

    it("attempts to add a new barcode available in the ILS but fails and tries again with a new barcode", async () => {
      IlsClient.mockImplementation(() => ({
        available: () => true,
      }));
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const testBarcode = "9876543";
      const nextBarcode = "9876542";
      barcode.addBarcode = jest
        .fn()
        .mockRejectedValueOnce(
          new DatabaseError("Error from database attempting to insert."),
        )
        .mockReturnValue(true);
      barcode.nextLuhnValidCode = jest.fn().mockReturnValue(nextBarcode);
      const addBarcodeSpy = jest.spyOn(barcode, "addBarcode");

      // This barcode is new so attempt to add it into the database,
      // but we're mocking that the database call throws an error. Let's only
      // try this twice.
      const available = await barcode.availableInIls(testBarcode, true, 2);

      expect(addBarcodeSpy).toHaveBeenCalledTimes(2);
      // The first attempt which failed.
      expect(addBarcodeSpy).toHaveBeenCalledWith(testBarcode, true);
      // The next attempt which was successful.
      expect(addBarcodeSpy).toHaveBeenCalledWith(nextBarcode, true);

      // We expect the second barcode attempt to be returned, not the initial.
      expect(available.available).toEqual(true);
      expect(available.finalBarcode).not.toEqual(testBarcode);
      expect(available.finalBarcode).toEqual(nextBarcode);
    });

    it("updates a existing barcode since the ILS says it is available and returns it", async () => {
      IlsClient.mockImplementation(() => ({
        available: () => true,
      }));
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const markUsedSpy = jest.spyOn(barcode, "markUsed");
      const testBarcode = "987654";

      // Mock that the barcode already exists in the database.
      await barcode.addBarcode(testBarcode, false);
      // It is initially unused.
      let result = await db.query(
        `SELECT * FROM barcodes WHERE barcode='${testBarcode}';`,
      );
      expect(result.rows[0].used).toEqual(false);
      expect(result.rows[0].barcode).toEqual(testBarcode);

      // This barcode is not new.
      const available = await barcode.availableInIls(testBarcode, false);
      // But it's available in the ILS.
      expect(available.available).toEqual(true);
      expect(available.finalBarcode).toEqual(testBarcode);

      // Since this is not a new barcode, instead of inserting it into the
      // database, update it.
      expect(markUsedSpy).toHaveBeenCalled();
      expect(markUsedSpy).toHaveBeenCalledWith(testBarcode, true);
      // Now it should be marked as used.
      result = await db.query(
        `SELECT * FROM barcodes WHERE barcode='${testBarcode}';`,
      );
      expect(result.rows[0].used).toEqual(true);
      expect(result.rows[0].barcode).toEqual(testBarcode);
    });

    it("attempts to update an existing barcode that is available in the ILS but fails and tries again with a new barcode", async () => {
      IlsClient.mockImplementation(() => ({
        available: () => true,
      }));
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const testBarcode = "9876543";
      const nextBarcode = "9876542";
      barcode.markUsed = jest
        .fn()
        .mockRejectedValueOnce(
          new DatabaseError("Error from database attempting to update."),
        )
        .mockReturnValue(true);
      barcode.nextLuhnValidCode = jest.fn().mockReturnValue(nextBarcode);
      const markUsedSpy = jest.spyOn(barcode, "markUsed");
      const addBarcodeSpy = jest.spyOn(barcode, "addBarcode");

      // This barcode is not new so attempt to update it in the database,
      // but we're mocking that the database call throws an error. Let's only
      // try this twice.
      const available = await barcode.availableInIls(testBarcode, false, 2);

      // The existing barcode is available and we tried to update the value
      // in the database. Something went wrong so we generated a new barcode
      // which must be added to the database. So `markUsed` is only called once.
      expect(markUsedSpy).toHaveBeenCalledTimes(1);
      // The first attempt which failed.
      expect(markUsedSpy).toHaveBeenCalledWith(testBarcode, true);
      // For the next attempt, the next generated barcode is added to the database.
      expect(addBarcodeSpy).toHaveBeenCalledTimes(1);
      expect(addBarcodeSpy).toHaveBeenCalledWith(nextBarcode, true);

      // We expect the second barcode attempt to be returned, not the initial.
      expect(available.available).toEqual(true);
      expect(available.finalBarcode).not.toEqual(testBarcode);
      expect(available.finalBarcode).toEqual(nextBarcode);
    });
  });

  describe("markUsed", () => {
    it("updates an existing barcode to used=true", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const barcodeNum = "999999999";

      // Insert a barcode and set it to used=false.
      await barcode.addBarcode(barcodeNum, false);

      let result = await db.query(
        `SELECT used FROM barcodes WHERE barcode='${barcodeNum}';`,
      );
      expect(result.rows[0].used).toEqual(false);

      await barcode.markUsed(barcodeNum, true);

      result = await db.query(
        `SELECT used FROM barcodes WHERE barcode='${barcodeNum}';`,
      );
      expect(result.rows[0].used).toEqual(true);
    });

    it("updates an existing barcode to used=false", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const barcodeNum = "999999998";

      // Insert a barcode and set it to used=true.
      await barcode.addBarcode(barcodeNum, true);

      let result = await db.query(
        `SELECT used FROM barcodes WHERE barcode='${barcodeNum}';`,
      );
      expect(result.rows[0].used).toEqual(true);

      await barcode.markUsed(barcodeNum, false);

      result = await db.query(
        `SELECT used FROM barcodes WHERE barcode='${barcodeNum}';`,
      );
      expect(result.rows[0].used).toEqual(false);
    });

    it("fails to update an existing barcode to used=false", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const barcodeNum = "999999997";

      // Insert a barcode and set it to used=false.
      await barcode.addBarcode(barcodeNum, false);

      const result = await db.query(
        `SELECT used FROM barcodes WHERE barcode='${barcodeNum}';`,
      );
      expect(result.rows[0].used).toEqual(false);

      // This barcode has used already set to false!
      await expect(barcode.markUsed(barcodeNum, false)).rejects.toThrow(
        "The barcode to be marked as unused was already set as unused.",
      );
    });

    it("fails to update an existing barcode to used=true", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const barcodeNum = "999999996";

      // Insert a barcode and set it to used=true.
      await barcode.addBarcode(barcodeNum, true);

      const result = await db.query(
        `SELECT used FROM barcodes WHERE barcode='${barcodeNum}';`,
      );
      expect(result.rows[0].used).toEqual(true);

      // This barcode has used already set to true!
      await expect(barcode.markUsed(barcodeNum, true)).rejects.toThrow(
        "The barcode to be marked as used was already set as used.",
      );
    });
  });

  describe("freeBarcode", () => {
    it("should call the markUsed function always setting the barcode to false", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      // We don't want to test `markUsed` since it was already tested,
      // just that `freeBarcode` always calls `markUsed` with the
      // barcode and "used" set to false.
      const spy = jest.spyOn(barcode, "markUsed").mockImplementation();

      await barcode.freeBarcode("12345");
      expect(spy).toHaveBeenCalledWith("12345", false);

      await barcode.freeBarcode("1235678");
      expect(spy).toHaveBeenCalledWith("1235678", false);

      await barcode.freeBarcode("123345678");
      expect(spy).toHaveBeenCalledWith("123345678", false);
    });
  });

  describe("addBarcode", () => {
    it("successfully inserts a barcode into the database", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const querySpy = jest.spyOn(barcode.db, "query");

      const addedBarcode = await barcode.addBarcode("123456");

      // One row was affected in the database.
      expect(addedBarcode).toEqual(1);
      expect(querySpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO barcodes (barcode, used) VALUES ('123456', false);",
      );
    });

    it("tries but fails to insert a barcode into the database because it already exists", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const querySpy = jest.spyOn(barcode.db, "query");

      // This insertion was successful.
      const result = await barcode.addBarcode("1234567");
      expect(result).toEqual(1);

      // But not this one!
      await expect(barcode.addBarcode("1234567")).rejects.toThrow(
        "Barcode already in database!",
      );

      // The call from the previous test gets added.
      expect(querySpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO barcodes (barcode, used) VALUES ('1234567', false);",
      );
    });

    it("tries but fails to insert a barcode into the database", async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      // Mock that the database is down or there's some other error:
      const querySpy = jest
        .spyOn(barcode.db, "query")
        .mockImplementation(
          jest.fn().mockRejectedValueOnce(new DatabaseError("uh oh!")),
        );

      // Something unexpected happened in the database.
      await expect(barcode.addBarcode("1234567")).rejects.toThrow(
        "Error inserting barcode into the database",
      );
      // The calls from the previous tests gets added.
      expect(querySpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO barcodes (barcode, used) VALUES ('1234567', false);",
      );
    });
  });
});
