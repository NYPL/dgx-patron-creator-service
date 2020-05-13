const Barcode = require('../../../../api/models/v0.3/modelBarcode');
const IlsClient = require('../../../../api/controllers/v0.3/IlsClient');
const BarcodeDb = require('../../../../db');

// Initialize the connection to the database.
const db = BarcodeDb({
  database: 'barcodes_test',
  port: '5432',
  user: process.env.DB_USER_TEST,
  host: process.env.DB_HOST_TEST,
  password: process.env.DB_PASSWORD_TEST,
});

jest.mock('../../../../api/controllers/v0.3/IlsClient');

describe('Barcode', () => {
  beforeAll(async () => {
    await db.init();
  });

  afterAll(async () => {
    // Delete the database table after all the test have run.
    // TODO: Not working?
    await db.query('drop table barcodes;');
    await db.release();
  });

  it('should initialize the class', () => {
    IlsClient.mockImplementation(() => ({
      available: () => 'available mock function',
    }));

    const barcode = new Barcode({ ilsClient: IlsClient() });

    expect(barcode.ilsClient).toBeDefined();
    expect(barcode.db).toBeDefined();
  });

  describe('getNextAvailableBarcode', () => {});

  describe('nextLuhnValidCode', () => {
    it('should return undefined if the barcode is not 14 digits', () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });

      const nextBarcode = barcode.nextLuhnValidCode('1234');
      expect(nextBarcode).toBeUndefined();
    });

    it('should get the next available barcode', () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });

      const nextBarcode = barcode.nextLuhnValidCode('28888055432443');
      expect(nextBarcode).toEqual('28888055432435');
    });
  });

  describe('nextAvailableFromDB', () => {
    it('should get the first used barcode from the database', async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const querySpy = jest.spyOn(barcode.db, 'query');
      const luhnSpy = jest.spyOn(barcode, 'nextLuhnValidCode');
      const nextBarcode = await barcode.nextAvailableFromDB();

      // It first tries to get the lowest barcode that is unused.
      expect(querySpy).toHaveBeenCalledWith(
        'select barcode from barcodes where used=false order by barcodes asc limit 1;',
      );
      // But there aren't any so get the small used one and make a new barcode.
      expect(querySpy).toHaveBeenCalledWith(
        'select barcode from barcodes where used=true order by barcodes asc limit 1;',
      );
      expect(querySpy).toHaveBeenCalled();

      // The Luhn algorithm gets the current barcode to generate the next one.
      expect(luhnSpy).toHaveBeenCalledWith('28888055432443');

      // The next available barcode after 28888055432443 which is
      // already in the database is:
      expect(nextBarcode.barcode).toEqual('28888055432435');
      expect(nextBarcode.newBarcode).toEqual(true);
    });

    it('should get an unused barcode from the database', async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });

      // Let's manually add a barcode in the database but set it to unused.
      // The `nextAvailableFromDB` function should pick this up.
      await barcode.addBarcode('28888055432435', false);

      const querySpy = jest.spyOn(barcode.db, 'query');
      const nextBarcode = await barcode.nextAvailableFromDB();

      // The two queries we expect to have been called to the database:
      expect(querySpy).toHaveBeenCalled();
      // Note: These are written in order they are called but jest doesn't
      // care about order.
      expect(querySpy).toHaveBeenCalledWith(
        'select barcode from barcodes where used=false order by barcodes asc limit 1;',
      );

      // This barcode was already in the database so "newBarcode" is false.
      expect(nextBarcode.barcode).toEqual('28888055432435');
      expect(nextBarcode.newBarcode).toEqual(false);
    });
  });

  describe('availableInIls', () => {});

  describe('release', () => {
    it('should call the postgres release function', async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const spy = jest
        .spyOn(barcode.db, 'release')
        .mockImplementation(() => 'release');

      await barcode.release();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('markUsed', () => {});

  describe('freeBarcode', () => {
    it('should call the markUsed function always setting the barcode to false', async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      // We don't want to test `markUsed` since it was already tested,
      // just that `freeBarcode` always calls `markUsed` with the
      // barcode and "used" set to false.
      const spy = jest.spyOn(barcode, 'markUsed').mockImplementation();

      await barcode.freeBarcode('12345');
      expect(spy).toHaveBeenCalledWith('12345', false);

      await barcode.freeBarcode('1235678');
      expect(spy).toHaveBeenCalledWith('1235678', false);

      await barcode.freeBarcode('123345678');
      expect(spy).toHaveBeenCalledWith('123345678', false);
    });
  });

  describe('addBarcode', () => {
    it('successfully inserts a barcode into the database', async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const querySpy = jest.spyOn(barcode.db, 'query');

      const addedBarcode = await barcode.addBarcode('12345');

      // One row was affected in the database.
      expect(addedBarcode).toEqual(1);
      expect(querySpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO barcodes (barcode, used) VALUES ('12345', false);",
      );
    });

    it('tries but fails to insert a barcode into the database because it already exists', async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const querySpy = jest.spyOn(barcode.db, 'query');

      // This insertion was successful.
      const result = await barcode.addBarcode('123456');
      expect(result).toEqual(1);

      // But not this one!
      await expect(barcode.addBarcode('123456')).rejects.toThrow(
        'Barcode already in database!',
      );

      // The call from the previous test gets added.
      expect(querySpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO barcodes (barcode, used) VALUES ('123456', false);",
      );
    });

    it('tries but fails to insert a barcode into the database', async () => {
      const barcode = new Barcode({ ilsClient: IlsClient() });
      // Mock that the database is down or there's some other error:
      const querySpy = jest
        .spyOn(barcode.db, 'query')
        .mockImplementation(
          jest.fn().mockRejectedValueOnce(new Error('uh oh!')),
        );

      // Something unexpected happened in the database.
      await expect(barcode.addBarcode('1234567')).rejects.toThrow(
        'Error inserting barcode into the database',
      );
      // The calls from the previous tests gets added.
      expect(querySpy).toHaveBeenCalled();
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO barcodes (barcode, used) VALUES ('1234567', false);",
      );
    });
  });
});
