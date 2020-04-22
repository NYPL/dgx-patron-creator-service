/* eslint-disable */

/**
 * Creates Barcode objects.
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
  mark_used(barcode) {
    noop();
  }
  // this wasnt used in previous codebase
  mark_unused(barcode) {
    noop();
  }
  // update in db that barcode is unused

  // Might not need to implement this
  send_barcode_alert_email(count) {
    if (Barcode.LOW_BARCODE_ALERT_COUNTS.includes(count)) {
      // get last barcode from db
      // send email - AdminMailer was used before
    }
  }

  // returns next available barcode record
  next_available(tries = 10) {
    // make ils connection helper
    const client = new IlsHelper();
    let barcode_found = false;
    let barcode;

    while (!barcode_found && tries > 0) {
      // get the first available barcode
      barcode = undefined;
      if (!barcode) {
        this.send_barcode_alert_email();
        return;
      }

      this.mark_used(barcode.barcode);

      // # make sure barcode is available on ILS
      barcode_found = client.available(barcode.barcode);

      tries -= 1;
    }

    this.send_barcode_alert_email();
    return barcode_found ? barcode.barcode : null;
  }
}

Barcode.LOW_BARCODE_ALERT_COUNTS = [1, 5, 10, 25, 50, 100, 250, 500];

export default Barcode;
