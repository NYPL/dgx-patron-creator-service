/* eslint-disable */

/**
 * Creates Barcode objects.
 * TODO: This might require a DB connection to store and keep track of
 * barcodes being used.
 */
class Barcode {
  constructor() {
    // validate uniqueness of barcodes
    // get an unused barcode starting in descending order
    //  { where(used: false).order(barcode: :desc) }
    const available = "Barcode db object";
    this.available = !!available;
  }

  // update in db that barcode was used
  markUsed(barcode) {
    noop();
  }
  // this wasnt used in previous codebase
  markUnused(barcode) {
    noop();
  }
  // update in db that barcode is unused

  // Might not need to implement this
  sendBarcodeAlertEmail(count) {
    if (Barcode.LOW_BARCODE_ALERT_COUNTS.includes(count)) {
      // get last barcode from db
      // send email - AdminMailer was used before
    }
  }

  // returns next available barcode record
  nextavailable(tries = 10) {
    // make ils connection helper
    const client = new IlsHelper();
    let barcodeFound = false;
    let barcode;

    while (!barcodeFound && tries > 0) {
      // get the first available barcode
      barcode = undefined;
      if (!barcode) {
        this.sendBarcodeAlertEmail();
        return;
      }

      this.markUsed(barcode.barcode);

      // # make sure barcode is available on ILS
      barcodeFound = client.available(barcode.barcode);

      tries -= 1;
    }

    this.sendBarcodeAlertEmail();
    return barcodeFound ? barcode.barcode : null;
  }
}

Barcode.LOW_BARCODE_ALERT_COUNTS = [1, 5, 10, 25, 50, 100, 250, 500];

export default Barcode;
