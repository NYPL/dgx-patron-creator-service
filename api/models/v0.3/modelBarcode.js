/* eslint-disable */
const db = require("../../../db");

/**
 * Creates Barcode objects.
 */
class Barcode {
  constructor(args) {
    this.ilsClient = args["ilsClient"];
  }

  /**
   * getNextAvailableBarcode()
   * Generates a new barcode in the database from the last one in the database,
   * and verifies it's available in the ILS. If it is, return it.
   */
  async getNextAvailableBarcode() {
    let barcode = await this.generateNewBarcode();
    let tries = 3;

    // Arbitary amount to try.
    while (!barcode && tries > 0) {
      barcode = await this.generateNewBarcode();
    }

    // TODO: Figure out how to close a db connection if the service will
    // be a lambda.
    // this.release();

    return barcode;
  }

  /**
   * generateNewBarcode()
   * Get and check if the next available barcode in the database is available.
   */
  async generateNewBarcode() {
    const { barcode, newBarcode } = await this.nextAvailableFromDB();
    // Perhaps this barcode from the database isn't actually available in the
    // ILS. If that's the case, the next available barcode in the ILS is
    // returned. Otherwise, the initial barcode is the "finalBarcode".
    const { available, finalBarcode } = await this.availableInIls(
      barcode,
      newBarcode
    );

    if (available) {
      return finalBarcode;
    }
    return;
  }

  /**
   * nextAvailableFromDB
   * Query the database for a barcode to use.
   */
  async nextAvailableFromDB() {
    let barcode;
    let result;
    let query;
    let newBarcode;

    // First try getting a barcode that is unused. This is not a "new"
    // barcode so we don't need to subtract one from it.
    try {
      query =
        "select barcode from barcodes where used=false order by barcodes asc limit 1;";
      result = await db.query(query);
      barcode = result.rows[0].barcode;
      newBarcode = false;
    } catch (error) {
      // There are no unused barcodes so get the lowest barcode that was
      // used and subtract one from it. This is the next new available one.
      query =
        "select barcode from barcodes where used=true order by barcodes asc limit 1;";
      result = await db.query(query);
      barcode = `${parseInt(result.rows[0].barcode, 10) - 1}`;
      newBarcode = true;
    }

    return { barcode, newBarcode };
  }

  /**
   * release()
   * Close the pool connection to the database.
   */
  async release() {
    await db.release();
  }

  /**
   * markUsed(barcode, used)
   * Set a barcode to used or not used in the database.
   * @param {string} barcode
   * @param {boolean} used
   */
  async markUsed(barcode, used = false) {
    const query = `UPDATE barcodes SET used=${used} WHERE barcode='${barcode}';`;
    await db.query(query);
  }

  /**
   * freeBarcode(barcode)
   * Set an existing barcode to unused.
   * @param {string} barcode
   */
  async freeBarcode(barcode) {
    await this.markUsed(barcode, false);
  }

  /**
   * addBarcode(barcode, used)
   * Add a new barcode to the database and set used to true or false (default).
   * @param {string} barcode
   * @param {boolean} used
   */
  async addBarcode(barcode, used = false) {
    const query = `INSERT INTO barcodes (barcode, used) VALUES ('${barcode}', ${used});`;
    await db.query(query);
  }

  /**
   * availableInIls(barcode, newBarcode, tries)
   * Check the current barcode's availability in the ILS. It will try the
   * next barcode in the sequence until an available one is found (based on
   * the amount of tries). If the barcode is available, return it but also
   * add it to the database and check it off as used. If the barcode was
   * originally not new (so already in the database marked as unused), then
   * just update the used value to true.
   *
   * @param {string} barcode
   * @param {boolean} newBarcode
   * @param {number} tries
   */
  async availableInIls(barcode, newBarcode, tries = 5) {
    const isBarcode = true;
    let barcodeAvailable = false;
    let barcodeToTry = barcode;

    while (!barcodeAvailable && tries > 0) {
      // make sure barcode is available on ILS
      barcodeAvailable = await this.ilsClient.available(
        barcodeToTry,
        isBarcode
      );

      // If the barcode is available, insert it into the database.
      if (barcodeAvailable) {
        if (newBarcode) {
          this.addBarcode(barcodeToTry, true);
        } else {
          this.markUsed(barcodeToTry, true);
        }
        break;
      }

      // Otherwise, let's try once more with the next barcode in the sequence.
      tries -= 1;
      barcodeToTry = `${barcodeToTry - 1}`;
    }

    return {
      available: barcodeAvailable,
      finalBarcode: barcodeToTry,
    };
  }
}

module.exports = Barcode;
