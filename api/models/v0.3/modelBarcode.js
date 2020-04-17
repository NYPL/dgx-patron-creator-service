const barcode = (props) => {
  const LOW_BARCODE_ALERT_COUNTS = [1, 5, 10, 25, 50, 100, 250, 500];

  // validate uniqueness of barcodes
  // get an unused barcode starting in descending order
  //  { where(used: false).order(barcode: :desc) }
  const available = "Barcode db object";
  this.available = !!available.present;

  const mark_used = (barcode) => {
    // update in db that barcode was used
  };

  // this wasnt used before
  const mark_unused = (barcode) => {
    // update in db that barcode is unused
  };

  // This is for admins to add multiple barcodes at once.
  // prob wont be needed
  this.from_list = (list_string) => {
    const lines = list_string.split("\n");

    lines.forEach(line => {
      line.trim();
      // Hmm this doesn't seem to be used?
      let duplicate = this.find_by_barcode(line);
      if (line.length && !duplicate) {
        // create a new and unused barcode
      }
    });
  };

  const send_barcode_alert_email = (count) => {
    if (this.LOW_BARCODE_ALERT_COUNTS.includes(count)) {
      // get last barcode from db
      // send email - AdminMailer was used before
    }
  }

  // returns next available barcode record
  this.next_available = (tries=10) => {
    // make ils connection helper
    const client = IlsHelper.new;
    const barcode_found = false;
    let barcode;

    while (!barcode_found && tries > 0) {
      // get the first available barcode
      barcode = undefined;
      if (!barcode) {
        send_barcode_alert_email()
        return;
      }

      mark_used(barcode.barcode)

      // # make sure barcode is available on ILS
      barcode_found = client.available(barcode.barcode);

      tries -= 1
    }

    send_barcode_alert_email()
    return barcode_found ? barcode.barcode : null;
  };
};

module.exports = {
  barcode,
};
