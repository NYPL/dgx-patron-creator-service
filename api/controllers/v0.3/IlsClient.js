/* eslint-disable */
const axios = require("axios");

/**
 * Helper class to setup API calls to the ILS.
 */
const IlsClient = (args) => {
  const createUrl = args["createUrl"] || "";
  const findUrl = args["findUrl"] || "";
  const ilsToken = args["ilsToken"] || "";
  // TBD if these should be moved into this file.
  // const tokenUrl = args["tokenUrl"] || "";
  // const ilsClientKey = args["ilsClientKey"] || "";
  // const ilsClientPassword = args["ilsClientPassword"] || "";
  // const ilsTokenTimestamp = args["ilsTokenTimestamps"] || "";

  // TODO: Implement the error classes and codes
  // const StandardError = (err = "Standard error") => { throw new Error(err) };
  // const IlsError = () => StandardError("ILS Error");
  // const NotFoundError = () => IlsError();
  // const MultipleMatchesError = () => IlsError();
  // const HttpError = () => IlsError();
  // const ConnectionTimeoutError = () => HttpError();

  const createPatron = async (patron) => {
    if (!patron.validForIls) {
      throw new Error("IlsError");
    }
    let ilsPatron = formattedPatronData(patron);

    console.log("ilsPatron", ilsPatron);
    return await axios
      .post(createUrl, ilsPatron, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ilsToken}`,
        },
      })
      .then((axiosResponse) => {
        return axiosResponse;
        // const modeledResponse = modelResponse.patronCreator(
        //   axiosResponse.data,
        //   axiosResponse.status,
        //   req.body
        // ); // eslint-disable-line max-len
        // modelStreamPatron
        //   .transformPatronRequest(req.body, modeledResponse)
        //   .then((streamPatronData) => {
        //     streamPatron(req, res, streamPatronData, modeledResponse);
        //   })
        //   .catch(() => {
        //     // eslint-disable-next-line max-len
        //     renderResponse(req, res, 201, modeledResponse); // respond with 201 even if streaming fails
        //   });
      })
      .catch((axiosError) => {
        return axiosError;
      });
  };

  /**
   * available(barcodeOrUsername, isBarcode)
   * For the /find endpoint in the ILS, a 200 response means that the username
   * was found and is therefore not available. A 404 response means that the
   * username was not found and is therefore available. Unfortunately, those
   * are the responses from the ILS at the moment.
   *
   * The barcode field tag is denoted as 'b' and the username field tag is
   * denoted as 'u'.
   *
   * @param {string} barcodeOrUsername
   * @param {boolean}} isBarcode
   */
  const available = async (barcodeOrUsername, isBarcode = true) => {
    const fieldTag = isBarcode
      ? IlsClient.BARCODE_FIELD_TAG
      : IlsClient.USERNAME_FIELD_TAG;
    // These two query parameters are required to make a valid GET request.
    const params = `?varFieldTag=${fieldTag}&varFieldContent=${barcodeOrUsername}`;
    let available = false;

    await axios
      .get(`${findUrl}${params}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ilsToken}`,
        },
      })
      .then((response) => {
        const status = response.status;
        const data = response.data;
        // {
        //   "id": 5346889,
        //   "expirationDate": "2029-10-21",
        //   "birthDate": "1988-01-19",
        //   "patronType": 10,
        //   "patronCodes": {
        //     "pcode1": "s",
        //     "pcode2": "f",
        //     "pcode3": 5,
        //     "pcode4": 0
        //   },
        //   "homeLibraryCode": "ma",
        //   "message": {
        //     "code": "-",
        //     "accountMessages": [
        //       "edwin.gzmn@gmail.com"
        //     ]
        //   },
        //   "blockInfo": {
        //     "code": "-"
        //   },
        //   "moneyOwed": 2.5
        // }

        if (status === 200 && data.id) {
          available = false;
        }
      })
      .catch((error) => {
        const response = error.response;

        // The ILS returns a 404 with the record not found...
        // so it's available!
        if (
          response.status === 404 &&
          response.data.name === "Record not found"
        ) {
          available = true;
        }
      });

    return available;
  };

  /**
   * formatAddress(address, isWorkAddress)
   * Format a patron's address as ILS expects it.
   * Types: "a" is primary address, "h" is alternate (work) address
   * The address needs to be formatted in this shape:
   * {
   *   "lines": [
   *     "5775 Golden Gate Parkway",
   *     "San Francisco, CA 94129 USA"
   *   ],
   *   "type": "h"
   * }
   *
   * @param {Address object} address
   * @param {boolean} isWorkAddress
   */
  const formatAddress = (address, isWorkAddress = false) => {
    const type = isWorkAddress
      ? IlsClient.WORK_ADDRESS_FIELD_TAG // 'h'
      : IlsClient.ADDRESS_FIELD_TAG; // 'a'
    const fullString = address.toString();
    const lines = fullString.split("\n");

    return { lines, type };
  };

  // This needs to be updated
  const formattedPatronData = (patron) => {
    // Addresses are now in a list.
    let addresses = [];
    let varFields = [];

    let address = formatAddress(patron.address);
    addresses.push(address);
    // if (patron.worksInCity) {
    //   let workAddress = formatAddress(patron.workAddress);
    //   addresses.push(workAddress);
    // }

    let usernameVarField = {
      fieldTag: IlsClient.USERNAME_FIELD_TAG,
      content: patron.username,
    };
    let ecommunicationsVarField = ecommunicationsPref(
      patron.ecommunicationsPref
    );

    varFields.push(usernameVarField);
    // varFields.push(ecommunicationsVarField);

    let fields = {
      names: [patron.name],
      addresses: addresses,
      pin: patron.pin,
      patronType: parseInt(patron.ptype, 10),
      expirationDate: patron.expirationDate.toISOString().slice(0, 10),
      varFields,
    };

    if (patron.barcode) {
      fields["barcodes"] = [patron.barcode];
    }
    if (patron.email && patron.email.length) {
      fields["emails"] = [patron.email];
    }
    if (patron.birthdate) {
      fields["birthDate"] = patron.birthdate;
    }

    return fields;
  };

  // Opt-in/opt-out of marketing email
  // Get true/false and need to convert it to 's' and '-'
  // ('s' = subscribed; '-' = not subscribed)
  const ecommunicationsPref = (ecommunicationsPrefValue) => {
    let value = ecommunicationsPrefValue ? "s" : "-";

    return {
      fieldTag: IlsClient.ECOMMUNICATIONS_PREF_FIELD_TAG,
      content: value,
    };
  };

  return {
    createPatron,
    available,
  };
};

IlsClient.MINOR_AGE = 11;
// Field tags to access patron information in ILS
IlsClient.BIRTHDATE_FIELD_TAG = "51";
// Barcode AND username are indexed on this tag.
IlsClient.BARCODE_FIELD_TAG = "b";
IlsClient.PIN_FIELD_TAG = "=";
// Opt-in/out of Marketing's email subscription service ('s' = subscribed; '-' = not subscribed)
IlsClient.ECOMMUNICATIONS_PREF_FIELD_TAG = "44";
IlsClient.PTYPE_FIELD_TAG = "47";
IlsClient.ADDRESS_FIELD_TAG = "a";
IlsClient.WORK_ADDRESS_FIELD_TAG = "h";
IlsClient.NAME_FIELD_TAG = "n";
IlsClient.EMAIL_FIELD_TAG = "z";
IlsClient.PATRONID_FIELD_TAG = ".";
IlsClient.EXPIRATION_FIELD_TAG = "43";
IlsClient.USERNAME_FIELD_TAG = "u";
IlsClient.HOME_LIB_FIELD_TAG = "53";
IlsClient.PATRON_AGENCY_FIELD_TAG = "158";
// ILS notifications ('p' = phone or 'z' = email)
IlsClient.NOTICE_PREF_FIELD_TAG = "268";
IlsClient.NOTE_FIELD_TAG = "x";
// Standard and temporary expiration times
IlsClient.STANDARD_EXPIRATION_TIME = [3, 0, 0]; // [years, month, days]
IlsClient.TEMPORARY_EXPIRATION_TIME = [0, 0, 30]; // [years, month, days]
IlsClient.WEB_APPLICANT_EXPIRATION_TIME = [0, 0, 90]; // [years, month, days]
// Ptypes for various library card offerings
IlsClient.WEB_APPLICANT_PTYPE = 1;
IlsClient.NO_PRINT_ADULT_METRO_PTYPE = 2;
IlsClient.NO_PRINT_ADULT_NYS_PTYPE = 3;
IlsClient.ADULT_METRO_PTYPE = 10;
IlsClient.ADULT_NYS_PTYPE = 11;
IlsClient.SENIOR_METRO_PTYPE = 20;
IlsClient.SENIOR_NYS_PTYPE = 21;
IlsClient.TEEN_METRO_PTYPE = 50;
IlsClient.TEEN_NYS_PTYPE = 51;
IlsClient.REJECTED_PTYPE = 101;
IlsClient.ILS_ERROR = "-1";
IlsClient.PTYPE_TO_TEXT = {
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
IlsClient.DEFAULT_HOME_LIB = "";
IlsClient.DEFAULT_PATRON_AGENCY = "202";
IlsClient.DEFAULT_NOTICE_PREF = "z";
IlsClient.DEFAULT_NOTE = `Patron's work/school address is ADDRESS2[ph].
                    Out-of-state home address is ADDRESS1[pa].`;
IlsClient.DEFAULT_ECOMMUNICATIONS_PREF = "s";
IlsClient.WEB_APPLICANT_AGENCY = "198";
IlsClient.WEB_APPLICANT_NYS_AGENCY = "199";
// Error codes
IlsClient.NOT_FOUND = "9001";
IlsClient.MULTIPLE_MATCHES = "9002";
// String-type marc tag
IlsClient.STRING_MARCTAG = { "@xsi:type": "xsd:string" };
// fields that require marc tag to be set
IlsClient.WITH_MARCTAG = ["expiration", "ptype"];

module.exports = IlsClient;
