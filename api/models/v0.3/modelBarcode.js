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
   * Generates a barcode in the database from the last one in the database,
   * and verifies it's available in the ILS. If it is, return it.
   */
  async getNextAvailableBarcode() {
    const { barcode, newBarcode } = await this.nextAvailableFromDB();

    // If no barcode could be generated from the database, return.
    if (!barcode) {
      return;
    }

    // If the barcode obtained from the database above is available in the ILS,
    // return it as `finalBarcode`. But if the barcode from the database
    // isn't actually available in the ILS, then a new barcode is generated
    // and checked for its availability in the ILS. This will be `finalBarcode`
    // and will be different than the barcode obtained above from the database.
    const { available, finalBarcode } = await this.availableInIls(
      barcode,
      newBarcode
    );

    // TODO: Figure out how to close a db connection if the service will
    // be a lambda.
    // this.release();

    return available ? finalBarcode : undefined;
  }

  /**
   * nextLuhnValidCode(barcode)
   * Return the next Luhn-valid barcode.
   *
   * @param {string} barcode
   */
  nextLuhnValidCode(barcode) {
    if (!barcode || barcode.length !== 14) {
      return;
    }

    // Remove the last digit from the existing barcode since we need a
    // 13-digit number to pass through the Luhn-algorithm.
    let newValidBarcode = Math.floor(parseInt(barcode, 10) / 10);
    // Add one to get the next valid value.
    newValidBarcode += 1;
    // Pass the 13-digit value and get a new and valid 14-digit barcode.
    return luhn.calculate(newValidBarcode);
  }

  /**
   * nextAvailableFromDB
   * Query the database for a barcode to use. It will first attempt to retrieve
   * an existing barcode that is unused. If none are found, then it will get
   * the highest value barcode as a reference to generate a new barcode using
   * the `nextLuhnValidCode` method.
   */
  async nextAvailableFromDB() {
    let barcode;
    let result;
    let query;
    let newBarcode;

    // First try getting a barcode that is unused. This is not a "new"
    // barcode so we don't need to manipulate it.
    try {
      query =
        "SELECT barcode FROM barcodes WHERE used=false ORDER BY barcodes ASC LIMIT 1;";
      result = await this.db.query(query);
      barcode = result.rows[0].barcode;
      newBarcode = false;
    } catch (error) {
      // There are no unused barcodes so get the biggest barcode value to
      // generate a new barcode from.
      query =
        "SELECT barcode FROM barcodes WHERE used=true ORDER BY barcodes DESC LIMIT 1;";
      result = await this.db.query(query);
      barcode = this.nextLuhnValidCode(result.rows[0].barcode);
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
  async availableInIls(barcode, newBarcode, tries = 10) {
    const initialTries = tries;
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
            tries = initialTries;
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
            tries = initialTries;
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
      barcodeToTry = this.nextLuhnValidCode(barcodeToTry);
    }

    return {
      available: barcodeAvailable,
      finalBarcode: barcodeToTry,
    };
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
    const query = `UPDATE barcodes SET used=${used} WHERE barcode='${barcode}' AND used=${!used};`;
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
      const result = await this.db.query(query);
      return result.rowCount;
    } catch (error) {
      // The barcode we thought was new and unused has since been created.
      // Throw an error so a new barcode is attempted.
      if (error.constraint === "barcodes_pkey") {
        throw new Error("Barcode already in database!");
      }
      throw new Error("Error inserting barcode into the database");
    }
  }

  /**
   * release()
   * Close the pool connection to the database.
   */
  async release() {
    await this.db.release();
  }
}

module.exports = Barcode;
