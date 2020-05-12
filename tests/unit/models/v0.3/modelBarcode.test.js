const Barcode = require('../../../../api/models/v0.3/modelBarcode');
const IlsClient = require('../../../../api/controllers/v0.3/IlsClient');
const BarcodeDb = require('../../../../db');
// const luhn = require("../../../../api/helpers/luhnValidations");

jest.mock('../../../../db');
jest.mock('../../../../api/controllers/v0.3/IlsClient');

describe('Barcode', () => {
  beforeEach(() => {
    BarcodeDb.mockClear();
  });

  it('should initialize the class', () => {
    IlsClient.mockImplementation(() => ({
      available: () => 'available mock function',
    }));
    BarcodeDb.mockImplementation(() => ({
      query: () => 'query mock function',
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
    // Mocking that the database table has one unused barcode. This is done
    // by just assuming that the mocked query function returns a value since
    // the first call to the database by this function will be to checked for
    // an existing and unused barcode.
    it('should get an unused barcode from the database', async () => {
      BarcodeDb.mockImplementation(() => ({
        query: () => ({ rows: [{ barcode: '28888055432443' }] }),
      }));
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const spy = jest.spyOn(barcode.db, 'query');
      const next = await barcode.nextAvailableFromDB();

      // The query we expect should have been called.
      expect(spy).toHaveBeenCalledWith(
        'select barcode from barcodes where used=false order by barcodes asc limit 1;',
      );
      expect(spy).toHaveBeenCalledTimes(1);
      expect(next.barcode).toEqual('28888055432443');
      expect(next.newBarcode).toEqual(false);
    });

    it('should get a used barcode from the database', async () => {
      BarcodeDb.mockImplementation(() => ({
        query: jest
          .fn()
          .mockResolvedValueOnce(new Error('no unused barcodes!'))
          .mockResolvedValueOnce({ rows: [{ barcode: '28888055432443' }] }),
      }));
      const barcode = new Barcode({ ilsClient: IlsClient() });
      const spy = jest.spyOn(barcode.db, 'query');
      const next = await barcode.nextAvailableFromDB();

      // The two queries we expect to have been called to the database:
      expect(spy).toHaveBeenCalledTimes(2);
      // Note: These are written in order they are called but jest doesn't
      // care about order.
      expect(spy).toHaveBeenCalledWith(
        'select barcode from barcodes where used=false order by barcodes asc limit 1;',
      );
      expect(spy).toHaveBeenCalledWith(
        'select barcode from barcodes where used=true order by barcodes asc limit 1;',
      );
      // The next available barcode after 28888055432443 is:
      expect(next.barcode).toEqual('28888055432435');
      expect(next.newBarcode).toEqual(true);
    });
  });

  describe('availableInIls', () => {});
  describe('release', () => {});
  describe('markUsed', () => {});
  describe('freeBarcode', () => {});
  describe('addBarcode', () => {});
});
