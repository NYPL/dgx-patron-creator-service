/* eslint-disable */
const BarcodeDb = require("../../../db");
const luhn = require("../../helpers/luhnValidations");

/**
 * Creates Barcode objects.
 */
class Barcode {
  constructor(args) {
    this.ilsClient = args["ilsClient"];
    // This will return the instance of the class that's
    // already connected to the database.
    this.db = BarcodeDb();
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
      tries -= 1;
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
      result = await this.db.query(query);
      barcode = result.rows[0].barcode;
      newBarcode = false;
    } catch (error) {
      // There are no unused barcodes so get the lowest barcode to generate
      // a new barcode.
      query =
        "select barcode from barcodes where used=true order by barcodes asc limit 1;";
      result = await this.db.query(query);
      // Remove the last digit from the existing barcode since we need a
      // 13-digit number to pass through the luhn-algorithm.
      barcode = Math.floor(parseInt(result.rows[0].barcode, 10) / 10);
      // Subtract one for the next barcode.
      barcode -= 1;
      // Pass the value and get a 14-digit barcode.
      barcode = luhn.calculate(barcode);
      newBarcode = true;
    }

    return { barcode, newBarcode };
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
    let dbError = false;

    while (!barcodeAvailable && tries > 0) {
      // make sure barcode is available on ILS
      barcodeAvailable = await this.ilsClient.available(
        barcodeToTry,
        isBarcode
      );

      // If the barcode is available, update the database.
      if (barcodeAvailable) {
        // The barcode is new so insert it into the database.
        if (newBarcode) {
          try {
            await this.addBarcode(barcodeToTry, true);
            dbError = false;
          } catch (error) {
            // While attempting to insert the new barcode, it was already used
            // by a different process, so try this process again with a new
            // barcode.
            dbError = true;
            barcodeAvailable = false;
            tries = 5;
          }
        } else {
          // The barcode was already in the database so update it as used.
          try {
            await this.markUsed(barcodeToTry, true);
            dbError = false;
          } catch (error) {
            // The barcode we thought was unused and available in the ILS is
            // now used when checking in the database. Reset and try a new
            // barcode.
            dbError = true;
            barcodeAvailable = false;
            tries = 5;
            // The previous barcode came from the database as unused, but now
            // we are trying the next barcode and assuming it's a new barcode
            // not already in the database.
            newBarcode = true;
          }
        }

        // We found an available barcode in the ILS, but there was a database
        // issue. Instead of breaking out of the loop, try a new barcode.
        if (!dbError) {
          break;
        }
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

  /**
   * release()
   * Close the pool connection to the database.
   */
  async release() {
    await this.db.release();
  }

  /**
   * markUsed(barcode, used)
   * Set a barcode to used or unused in the database.
   * @param {string} barcode
   * @param {boolean} used
   */
  async markUsed(barcode, used) {
    // When setting a barcode to used, we expect it to be unused in the database.
    // Likewise, when setting a barcode to unused, we expect the value to be
    // used in the database. If either of those tasks cause an issue, it will
    // be caught.
    const query = `UPDATE barcodes SET used=${used} WHERE barcode='${barcode}' where used=${!used};`;
    let result = await this.db.query(query);

    if (result.rowCount !== 1) {
      if (used) {
        // While attempting to set a barcode to used, it was already used,
        // so attempt a new barcode instead.
        throw new Error(
          "The barcode to be marked as used was already set as used. Try a new barcode."
        );
      } else {
        // While attempting to free a barcode and set it to unused, it was
        // already set to unused.
        throw new Error(
          "The barcode to be marked as unused was already set as unused."
        );
      }
    }
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
    try {
      await this.db.query(query);
    } catch (error) {
      // The barcode we thought was new and unused has since been created.
      // Throw an error so a new barcode is attempted.
      if (error.constraint === "barcodes_pkey") {
        throw new Error("Barcode already in database!");
      }
    }
  }
}

module.exports = Barcode;
