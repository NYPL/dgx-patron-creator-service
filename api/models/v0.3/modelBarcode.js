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
    await db.release();
  }

  /**
   * markUsed(barcode, used)
   * Set a barcode to used or not used in the database.
   * @param {string} barcode
   * @param {boolean} used
   */
  async markUsed(barcode, used = false) {
    // A barcode from the database is attempted and available in the ILS. If
    // the patron wants to use it, set it to used, but if it was already taken
    // while the request was in process, then try a new barcode.
    if (used === true) {
      const alreadyUsed = `select used from barcodes where barcode='${barcode}';`;
      let result = await db.query(alreadyUsed);
      if (result.rows[0].used) {
        throw new Error(
          "The barcode to be marked as used was already set as used. Try a new barcode."
        );
      }
    }

    // Continue updating the existing barcode's `used` value.
    const query = `UPDATE barcodes SET used=${used} WHERE barcode='${barcode}';`;
    try {
      await db.query(query);
    } catch (error) {
      throw new Error(
        `Couldn't update barcode ${barcode} as used in the database.`
      );
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
      await db.query(query);
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
