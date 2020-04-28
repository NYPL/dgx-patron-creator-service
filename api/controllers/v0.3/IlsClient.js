/* eslint-disable */
const axios = require("axios");

/**
 * Helper class to setup API calls to the ILS.
 */
const IlsClient = (args) => {
  const createUrl = args["createUrl"] || "";
  const findUrl = args["findUrl"] || "";
  const tokenUrl = args["tokenUrl"] || "";
  const ilsClientKey = args["ilsClientKey"] || "";
  const ilsClientPassword = args["ilsClientPassword"] || "";
  const ilsToken = args["ilsToken"] || "";
  const ilsTokenTimestamp = args["ilsTokenTimestamps"] || "";

  // TODO: Implement the error classes and codes
  // const StandardError = (err = "Standard error") => { throw new Error(err) };
  // const IlsError = () => StandardError("ILS Error");
  // const NotFoundError = () => IlsError();
  // const MultipleMatchesError = () => IlsError();
  // const HttpError = () => IlsError();
  // const ConnectionTimeoutError = () => HttpError();

  const createPatron = (params) => {
    if (!params.patron.validForIls) {
      throw new Error("IlsError");
    }
    let ilsPatron = formattedPatronData(params);

    axios
      .post(createUrl, ilsPatron, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ilsToken}`,
        },
      })
      .then((axiosResponse) => {
        const modeledResponse = modelResponse.patronCreator(
          axiosResponse.data,
          axiosResponse.status,
          req.body
        ); // eslint-disable-line max-len
        modelStreamPatron
          .transformPatronRequest(req.body, modeledResponse)
          .then((streamPatronData) => {
            streamPatron(req, res, streamPatronData, modeledResponse);
          })
          .catch(() => {
            // eslint-disable-next-line max-len
            renderResponse(req, res, 201, modeledResponse); // respond with 201 even if streaming fails
          });
      })
      .catch((axiosError) => {
        try {
          const errorResponseData = modelResponse.errorResponseData(
            collectErrorResponseData(
              axiosError.response.status,
              "",
              axiosError.response.data,
              "",
              ""
            ) // eslint-disable-line comma-dangle
          );
          renderResponse(
            req,
            res,
            axiosError.response.status,
            errorResponseData
          );
        } catch (error) {
          const errorResponseData = modelResponse.errorResponseData(
            collectErrorResponseData(
              500,
              "",
              `Error related to ${process.env.ILS_CREATE_PATRON_URL} or publishing to the NewPatron stream.`,
              "",
              ""
            ) // eslint-disable-line comma-dangle
          );
          renderResponse(req, res, 500, errorResponseData);
        }
      });
  };

  /**
   * available(barcodeOrUsername, isBarcode)
   * For the /find endpoint in the ILS, a 200 response means that the username
   * was found and is therefore not available. A 404 response means that the
   * username was not found and is therefore available. Unfortunately, those
   * are the responses from the ILS at the moment.
   *
   * @param {string} barcodeOrUsername
   * @param {boolean}} isBarcode
   */
  const available = async (barcodeOrUsername, isBarcode = true) => {
    const fieldTag = isBarcode ? "b" : "u";
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

  // To update the barcode
  const updatePatron = (patron) => {
    if (!patron.validForIls) {
      throw new Error("IlsError");
    }
    let ilsPatron = formattedPatronData(patron);

    // Call update url
    // axios.post(`${createUrl}${patron.id}`);
  };

  const getPatronIdFromResponse = (response) => {
    return response.id;
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

    // Addresses are now in a list.
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
  };

  // Determine whether a patron should have a permanent card.
  const longExpiration = (patron) => {
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
  };

  const expirationAsField = (time) => {
    // TODO convert date object
    let expiration = time.strftime("%Y%m%d000000");
    return this.customField(
      IlsClient.EXPIRATION_FIELD_TAG,
      expiration,
      IlsClient.STRING_MARCTAG
    );
  };

  const longExpirationAsField = (patron) => {
    let timeNow = Date.now();
    return this.expirationAsField(
      `${timeNow}${parseInt(patron.policy.card_type["standard"], 10)}`
    );
  };

  const shortExpirationAsField = (patron) => {
    let timeNow = Date.now();
    return this.expirationAsField(
      `${timeNow}${parseInt(patron.policy.card_type["temporary"], 10)}`
    );
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
IlsClient.STANDARD_EXPIRATION_TIME = "3"; // years
IlsClient.TEMPORARY_EXPIRATION_TIME = "30"; // days
IlsClient.WEB_APPLICANT_EXPIRATION_TIME = "90"; // days
// Ptypes for various library card offerings
IlsClient.WEB_APPLICANT_PTYPE = "1";
IlsClient.NO_PRINT_ADULT_METRO_PTYPE = "2";
IlsClient.NO_PRINT_ADULT_NYS_PTYPE = "3";
IlsClient.ADULT_METRO_PTYPE = "10";
IlsClient.ADULT_NYS_PTYPE = "11";
IlsClient.SENIOR_METRO_PTYPE = "20";
IlsClient.SENIOR_NYS_PTYPE = "21";
IlsClient.TEEN_METRO_PTYPE = "50";
IlsClient.TEEN_NYS_PTYPE = "51";
IlsClient.REJECTED_PTYPE = "101";
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
