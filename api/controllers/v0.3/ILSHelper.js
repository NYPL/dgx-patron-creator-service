/* eslint-disable */
class ILSAPIClient {}

class IlsHelper {
  // ILS server error classes and codes
  // const StandardError = (err = "Standard error") => { throw new Error(err) };
  // const IlsError = () => StandardError("ILS Error");
  // const NotFoundError = () => IlsError();
  // const MultipleMatchesError = () => IlsError();
  // const HttpError = () => IlsError();
  // const ConnectionTimeoutError = () => HttpError();

  constructor(ilsClient = undefined) {
    this.client =
      ilsClient ||
      new ILSAPIClient({
        wsdl: this.ilsUrl,
        open_timeout: 15,
        read_timeout: 15,
        log: true,
        filters: ["username", "password"],
        log_level: "debug",
        pretty_print_xml: true,
      });
  }

  ilsUrl() {
    return `https://${process.env["ILS_SERVER"]}/iii/patronio/services/PatronIO?wsdl`;
  }

  callAndFailGracefully(params) {
    try {
      this.client.call(params);
    } catch (e) {
      let error;
      switch (
        e["fault"]["detail"]["com_iii_webapps_ws_patronio_patron_io_fault"][
          "code"
        ]
      ) {
        case IlsHelper.NOT_FOUND:
          error = "NotFoundError()";
          break;
        case IlsHelper.MULTIPLE_MATCHES:
          error = "MultipleMatchesError()";
          break;
        default:
          error = "IlsError()";
      }
      throw new Error(error);
      // TODO: catch HTTP timout errors
      // These errors are returned when the SOAP client times out
      // when connecting and when requesting (respectively).
    }
  }

  search(query) {
    return this.callAndFailGracefully({
      type: "search_patrons",
      message: {
        search_string: query,
        username: process.env["ILS_USERNAME"],
        password: process.env["ILS_PASSWORD"],
      },
    });
  }

  create_patron(patron) {
    if (!patron.validForIls) {
      throw new Error("IlsError");
    }
    let ilsPatron = this.patronFields(patron);

    return this.callAndFailGracefully({
      type: "create_patron",
      message: {
        patron: ilsPatron,
        username: process.env["ILS_USERNAME"],
        password: process.env["ILS_PASSWORD"],
      },
    });
  }

  updatePatron(patron) {
    if (!patron.validForIls) {
      throw new Error("IlsError");
    }
    let ilsPatron = this.patronFields(patron);

    return this.callAndFailGracefully({
      type: "update_patron",
      message: {
        patron: ilsPatron,
        username: process.env["ILS_USERNAME"],
        password: process.env["ILS_PASSWORD"],
      },
    });
  }

  getPatronIdFromResponse(response) {
    return response.body["multi_ref"][0]["patronId"];
  }

  available(barcodeOrUsername) {
    const result = search(
      `//${IlsHelper.BARCODE_FIELDTAG}//${barcodeOrUsername}`
    );
    return !!(result === "NotFoundError");
  }

  // Format a patron's address as ILS expects it.
  formatAddress(address) {
    return address.toUpperCase.gsub(/[\n\r]+/, "$");
  }

  // Internal: Format card fields for ILS patron creation/updates.
  formattedPatronData(patron) {
    let email;
    let birthdate;
    let workAddress;
    if (patron.email) {
      email = patron.email.gsub(/\s+/, "").toUpperCase;
    }
    if (patron.birthdate) {
      // birthdate = patron.birthdate.strftime("%Y%m%d000000");
      birthdate = patron.birthdate;
    }

    let address = this.formatAddress(patron.address);
    if (patron.worksInCity) {
      workAddress = this.formatAddress(patron.workAddress);
    }

    let fullName = patron.name.toUpperCase();
    if (!fullName.includes(",")) {
      // Existing TODO: Replace this code with a call to a dedicated human name
      // parsing library.

      // Simplistically assume person's name has two segments: the first
      // and last name, with no middle names or honorifics.
      // (e.g. "Dorothy Vaughn" "Katherine Johnson" "Mary Jackson")
      let [firstName, lastName] = fullName.split(" ", 2);
      firstName = firstName.trim();
      lastName = lastName.trim();

      if (firstName !== "" || lastName !== "") {
        fullName = `//${lastName}, //${firstName}`;
      } else {
        // Our assumption of at least two names was wrong, and we got
        // something like "Dorothy" or "Katherine " or " Jackson".
        // We'll take what we can get.
        fullName = firstName || lastName;
      }
    }

    let fields = {
      name: fullName,
      address: address,
      username: patron.username,
      pin: patron.pin,
      ptype: patron.ptype,
      workAddress: workAddress,
      ecommunications_pref: patron.ecommunicationsPref,
    };

    if (patron.barcode) {
      fields["barcode"] = patron.barcode;
    }
    if (email) {
      fields["email"] = email;
    }
    if (birthdate) {
      fields["birthdate"] = birthdate;
    }

    return fields;
  }

  // Determine whether a patron should have a permanent card.
  longExpiration(patron) {
    // False if a patron's existing work address isn't commercial
    if (patron.workAddress && patron.workAddress.isResidential) {
      return false;
    }

    // False if patron provides a home address that is not residential
    // False if patron does not have a recognized name
    // False if patron policy is not the default (:simplye)
    return (
      patron.address.isResidential &&
      patron.hasValidName &&
      patron.policy.isDefault
    );
  }

  patronFields(patron) {
    let fieldData = this.formattedPatronData(patron);

    let fields = [
      fieldData["name"],
      fieldData["address"],
      fieldData["ptype"],
      fieldData["username"],
      fieldData["pin"],
      fieldData["ecommunications_pref"],
      // notice_pref_as_field,
      // home_lib_as_field,
      patron.policy.agency,
    ];

    if (patron.worksInCity) {
      fields.push(fieldData["workAddress"]);
      fields.push(note_as_field);
    }

    if (this.longExpiration(patron)) {
      fields.push(this.longExpirationAsField(patron));
    } else {
      patron.set_temporary();
      fields.push(this.shortExpirationAsField(patron));
    }

    // Add required/optional fields according to policy.
    if (patron.barcode) {
      fields.push(fieldData["barcode"]);
    }
    if (patron.email) {
      fields.push(fieldData["email"]);
    }
    if (patron.birthdate) {
      fields.push(fieldData["birthdate"]);
    }

    return {
      patronFields: {
        patron_field: fields,
      },
      patronID: patron.patronId,
    };
  }

  blankField() {
    return { fieldTag: "", marcTag: 0, value: "", value_is_binary: false };
  }

  customField(fieldTag, value, marcTag = 0) {
    let field = this.blankField();
    field["field_tag"] = fieldTag;
    field["value"] = value;
    field["marc_tag"] = marcTag;
    return field;
  }

  expirationAsField(time) {
    // TODO convert date object
    let expiration = time.strftime("%Y%m%d000000");
    return this.customField(
      IlsHelper.EXPIRATION_FIELDTAG,
      expiration,
      IlsHelper.STRING_MARCTAG
    );
  }

  longExpirationAsField(patron) {
    let timeNow = Date.now();
    return this.expirationAsField(
      `${timeNow}${parseInt(patron.policy.card_type["standard"], 10)}`
    );
  }

  shortExpirationAsField(patron) {
    let timeNow = Date.now();
    return this.expirationAsField(
      `${timeNow}${parseInt(patron.policy.card_type["temporary"], 10)}`
    );
  }

  // Internal: Create dynamic field-creation method.
  //
  // field - A String representing the base field name. <field>_FIELDTAG
  //         must be set in IlsHelper. Can have any capitalization.
  //
  // value - A primitive type Object. May be nil. If nil, DEFAULT_<field>
  //         constant must be set in IlsHelper
  //
  // If the field requires the STRING_MARCTAG, it must be included in the
  // IlsHelper.WITH_MARK_TAG array.
  //
  // Signature
  //
  //   <field>_as_field([value])
  //
  // field - a field name
  //
  // Returns a Hash representing the custom field.
  dynamicFieldAsField(field, value) {
    try {
      field = field.toUpperCase();
      // get these values from the class:
      const fieldTag = `${field}_FIELDTAG`;
      value = value || `DEFAULT_${field}`;
      let marcTag = IlsHelper.WITH_MARCTAG.includes(field.downcase)
        ? IlsHelper.STRING_MARCTAG
        : null;
      return this.customField(fieldTag, value, marcTag);
    } catch (e) {
      // throw new NotImplementedError(`//${field} field details have not been set`);
      throw new Error(`//${field} field details have not been set`);
    }
  }
}

IlsHelper.MINOR_AGE = 11;
// Field tags to access patron information in ILS
IlsHelper.BIRTHDATE_FIELDTAG = "51";
// Barcode AND username are indexed on this tag.
IlsHelper.BARCODE_FIELDTAG = "b";
IlsHelper.PIN_FIELDTAG = "=";
// Opt-in/out of Marketing's email subscription service ('s' = subscribed; '-' = not subscribed)
IlsHelper.ECOMMUNICATIONS_PREF_FIELDTAG = "44";
IlsHelper.PTYPE_FIELDTAG = "47";
IlsHelper.ADDRESS_FIELDTAG = "a";
IlsHelper.workAddress_FIELDTAG = "h";
IlsHelper.NAME_FIELDTAG = "n";
IlsHelper.EMAIL_FIELDTAG = "z";
IlsHelper.PATRONID_FIELDTAG = ".";
IlsHelper.EXPIRATION_FIELDTAG = "43";
IlsHelper.USERNAME_FIELDTAG = "u";
IlsHelper.HOME_LIB_FIELDTAG = "53";
IlsHelper.PATRON_AGENCY_FIELDTAG = "158";
// ILS notifications ('p' = phone or 'z' = email)
IlsHelper.NOTICE_PREF_FIELDTAG = "268";
IlsHelper.NOTE_FIELDTAG = "x";
// Standard and temporary expiration times
// TODO: Update these to integers
IlsHelper.STANDARD_EXPIRATION_TIME = "3 years";
IlsHelper.TEMPORARY_EXPIRATION_TIME = "30 days";
IlsHelper.WEB_APPLICANT_EXPIRATION_TIME = "90 days";
// Ptypes for various library card offerings
IlsHelper.WEB_APPLICANT_PTYPE = "1";
IlsHelper.NO_PRINT_ADULT_METRO_PTYPE = "2";
IlsHelper.NO_PRINT_ADULT_NYS_PTYPE = "3";
IlsHelper.ADULT_METRO_PTYPE = "10";
IlsHelper.ADULT_NYS_PTYPE = "11";
IlsHelper.SENIOR_METRO_PTYPE = "20";
IlsHelper.SENIOR_NYS_PTYPE = "21";
IlsHelper.TEEN_METRO_PTYPE = "50";
IlsHelper.TEEN_NYS_PTYPE = "51";
IlsHelper.REJECTED_PTYPE = "101";
IlsHelper.ILS_ERROR = "-1";
IlsHelper.PTYPE_TO_TEXT = {
  WEB_APPLICANT_PTYPE: "Web applicant (No Borrowing)",
  NO_PRINT_ADULT_METRO_PTYPE: "Adult 19-64 Metro (3 Year, No Print Borrowing)",
  NO_PRINT_ADULT_NYS_PTYPE: "Adult 19-64 NY State (3 Year, No Print Borrowing)",
  ADULT_METRO_PTYPE: "Adult 19-64 Metro (3 Year)",
  ADULT_NYS_PTYPE: "Adult 19-64 NY State (3 Year)",
  SENIOR_METRO_PTYPE: "Senior, 65+, Metro (3 Year)",
  SENIOR_NYS_PTYPE: "Senior, 65+, NY State (3 Year)",
  TEEN_METRO_PTYPE: "Teen Metro (3 Year)",
  TEEN_NYS_PTYPE: "Teen NY State (3 Year)",
  REJECTED_PTYPE: "Rejected",
  ILS_ERROR: "Unable to create in ILS",
};
// Default values for certain fields
IlsHelper.DEFAULT_HOME_LIB = "";
IlsHelper.DEFAULT_PATRON_AGENCY = "202";
IlsHelper.DEFAULT_NOTICE_PREF = "z";
IlsHelper.DEFAULT_NOTE = `Patron's work/school address is ADDRESS2[ph].
                    Out-of-state home address is ADDRESS1[pa].`;
IlsHelper.DEFAULT_ECOMMUNICATIONS_PREF = "s";
IlsHelper.WEB_APPLICANT_AGENCY = "198";
IlsHelper.WEB_APPLICANT_NYS_AGENCY = "199";

// Error codes
IlsHelper.NOT_FOUND = "9001";
IlsHelper.MULTIPLE_MATCHES = "9002";

// String-type marc tag
IlsHelper.STRING_MARCTAG = { "@xsi:type": "xsd:string" };
// fields that require marc tag to be set
IlsHelper.WITH_MARCTAG = ["expiration", "ptype"];

export default IlsHelper;
