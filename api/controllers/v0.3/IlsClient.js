/* eslint-disable */
const axios = require("axios");
const { ILSIntegrationError, InvalidRequest } = require("../../helpers/errors");

/**
 * Helper class to setup API calls to the ILS. Assumes that the patron card
 * object is already validated.
 */
const IlsClient = (args) => {
  const createUrl = args["createUrl"] || "";
  const findUrl = args["findUrl"] || "";
  const ilsToken = args["ilsToken"] || "";
  // We need the `id`, `patronType`, `varFields`, `addresses`, `emails`, and
  // `expirationDate` fields from the patron object (`id` is returned by
  // default), so those fields are added at the end of the endpoint request.
  const ilsResponseFields =
    "&fields=patronType,varFields,addresses,emails,expirationDate";
  // TBD if these should be moved into this file.
  // const tokenUrl = args["tokenUrl"] || "";
  // const ilsClientKey = args["ilsClientKey"] || "";
  // const ilsClientPassword = args["ilsClientPassword"] || "";
  // const ilsTokenTimestamp = args["ilsTokenTimestamps"] || "";

  /**
   * createPatron(patron)
   * First checks if the patron has met all the requirements before calling the
   * ILS API. If the patron is valid, format the data as the ILS expects it.
   * Returns the response from the ILS or an error.
   * Note: the newly created patron's id is in the response object in
   *  `response.data.link`.
   *
   * @param {Card object} patron
   */
  const createPatron = async (patron) => {
    let ilsPatron = formatPatronData(patron);

    return await axios
      .post(createUrl, ilsPatron, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ilsToken}`,
        },
      })
      .then((axiosResponse) => {
        // Example correct response:
        // {
        //   status: 200,
        //   data: {
        //     link: "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/{patron-id}"
        //   }
        // }
        return axiosResponse;
      })
      .catch((error) => {
        const response = error.response;

        // If the request to the ILS is missing a value or a key is of
        // and incorrect type, i.e. the barcode is sent as an integer
        // instead of a string.
        if (response.status === 400) {
          throw new InvalidRequest(
            `Invalid request to ILS: ${response.data.description}`
          );
        }

        if (!(response.status >= 500)) {
          return response;
        } else {
          throw new ILSIntegrationError(
            "The ILS could not be requested when attempting to create a patron."
          );
        }
      });
  };

  /**
   * updatePatron(patron)
   * First checks if the patron has met all the requirements before calling the
   * ILS API. If the patron is valid, format the data as the ILS expects it.
   * Returns the response from the ILS or an error.
   * Note: the newly created patron's id is in the response object in
   *  `response.data.link`.
   *
   * @param {Card object} patron
   * @param {object} updatedFields
   */
  const updatePatron = async (patronId, updatedFields) => {
    const putUrl = `${createUrl}${patronId}`;

    return await axios
      .put(putUrl, updatedFields, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ilsToken}`,
        },
      })
      .then((response) => {
        // Expects a 204 no content response.
        return response;
      })
      .catch((error) => {
        const response = error.response;
        // If the request to the ILS is missing a value or a key is of
        // and incorrect type, i.e. the barcode is sent as an integer
        // instead of a string.
        if (response.status === 400) {
          throw new InvalidRequest(
            `Invalid request to ILS: ${response.data.description}`
          );
        }

        if (response.status === 404) {
          // Throws 'Patron record not found'.
          throw new ILSIntegrationError(response.data.name);
        }

        if (!(response.status >= 500)) {
          return response;
        } else {
          throw new ILSIntegrationError(
            "The ILS could not be requested when attempting to update a patron."
          );
        }
      });
  };

  /**
   * getPatronFromBarcodeOrUsername(barcodeOrUsername, isBarcode)
   * Hits the /find endpoint in the ILS and returns a patron data object
   * or an error.
   *
   * The barcode field tag is denoted as 'b' and the username field tag is
   * denoted as 'u'.
   *
   * @param {string} barcodeOrUsername
   * @param {boolean} isBarcode
   */
  const getPatronFromBarcodeOrUsername = async (
    barcodeOrUsername,
    isBarcode = true
  ) => {
    const fieldTag = isBarcode
      ? IlsClient.BARCODE_FIELD_TAG
      : IlsClient.USERNAME_FIELD_TAG;
    // These two query parameters are required to make a valid GET request.
    const varFieldParams = `varFieldTag=${fieldTag}&varFieldContent=${barcodeOrUsername}`;
    const params = `?${varFieldParams}${ilsResponseFields}`;

    const response = await axios
      .get(`${findUrl}${params}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ilsToken}`,
        },
      })
      .then((response) => {
        return response;
      })
      .catch((error) => {
        return error.response;
      });

    return response;
  };

  /**
   * available(barcodeOrUsername, isBarcode)
   * Makes a call to the ILS to get a patron data object through the
   * `getPatronFromBarcodeOrUsername` function. A 200 response means that the
   * username or barcode was found and is therefore not available. A 404
   * response means that the username or barcode was not found and is
   * therefore available. A 409 response means that the ILS found a duplicate
   * and so the username or barcode is unavailable. These are the responses
   * from the ILS at the moment.
   *
   * @param {string} barcodeOrUsername
   * @param {boolean}} isBarcode
   */
  const available = async (barcodeOrUsername, isBarcode = true) => {
    const fieldType = isBarcode ? "barcode" : "username";
    let available = false;
    const response = await getPatronFromBarcodeOrUsername(
      barcodeOrUsername,
      isBarcode
    );

    // Is the response okay? If so, the username or barcode isn't available
    // since a patron was found.
    let status = response.status;
    let data = response.data;
    if (status === 200 && data.id) {
      available = false;
    }

    // The ILS returns a 404 with the record not found... so it's available!
    if (status === 404 && data.name === "Record not found") {
      available = true;
    } else if (
      // But if it returns 409, then a duplicate entry was found
      // and the field is not available.
      response.status == 409 &&
      response.data.name === "Internal server error" &&
      response.data.description ===
        "Duplicate patrons found for the specified varFieldTag[b]."
    ) {
      available = false;
    } else if (response.status >= 500) {
      throw new ILSIntegrationError(
        `The ILS could not be requested when validating the ${fieldType}.`
      );
    }

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
    const fullString = address.toString().toUpperCase();
    const lines = fullString.split("\n");

    return { lines, type };
  };

  /**
   * formatPatronName(name)
   * Format the patron's name so that it is last name and then first name
   * and in all caps. If it's a single name, just return it in all caps.
   *
   * @param {string} name
   */
  const formatPatronName = (name) => {
    if (!name) {
      return "";
    }

    if (name.indexOf(" ") === -1) {
      return name.toUpperCase();
    }

    const [first, last] = name.split(" ");

    return `${last}, ${first}`.toUpperCase();
  };

  /**
   * formatedPatronData(patron)
   * Format all the data into an object that the ILS understands.
   * Example of an ILS-ready object:
   * {
   *   names: [ 'FirstName LastName' ],
   *   addresses: [ { lines: ['476 5th Ave', 'New York, NY 10018'], type: 'a' } ],
   *   pin: '1234',
   *   patronType: 1,
   *   expirationDate: '2020-07-29',
   *   varFields: [ { fieldTag: 'u', content: 'username' } ],
   *   birthDate: '1988-01-01',
   *   homeLibraryCode: 'eb',
   * }
   *
   * @param {Card object} patron
   */
  const formatPatronData = (patron) => {
    // Addresses should be in a list.
    let addresses = [];
    // varFields is an array of objects.
    let varFields = [];
    // fixedFields is an object containing other objects.
    let fixedFields = {};
    let patronCodes = {};

    const address = formatAddress(patron.address);
    addresses.push(address);
    if (patron.worksInCity()) {
      const workAddress = formatAddress(patron.workAddress, true);
      addresses.push(workAddress);
    }

    const usernameVarField = {
      fieldTag: IlsClient.USERNAME_FIELD_TAG,
      content: patron.username,
    };

    // Add the existing varfields if any.
    if (patron.varFields && patron.varFields.length) {
      varFields.push(...patron.varFields);
    }
    varFields.push(usernameVarField);

    // E-communications value has a key of pcode1 in the patronCodes object.
    // Merging any other pcode values and overwriting patronCodes.
    patronCodes = ecommunicationsPref(patron.ecommunicationsPref, patronCodes);

    // Add agency fixedField
    fixedFields = agencyField(patron.agency, fixedFields);

    const patronName = formatPatronName(patron.name);

    let fields = {
      names: [patronName],
      addresses: addresses,
      pin: patron.pin,
      patronType: patron.ptype,
      patronCodes,
      expirationDate: patron.expirationDate.toISOString().slice(0, 10),
      varFields,
      fixedFields,
      homeLibraryCode: patron.homeLibraryCode,
    };

    if (patron.barcode) {
      fields["barcodes"] = [patron.barcode];
    }
    if (patron.email && patron.email.length) {
      fields["emails"] = [patron.email.toUpperCase()];
    }
    if (patron.birthdate) {
      fields["birthDate"] = patron.birthdate.toISOString().slice(0, 10);
    }

    return fields;
  };

  /**
   * agencyField(agency, fixedFields)
   * Keep any existing fixedFields but add the new one for the agency which
   * has a key of "158".
   *
   * @param {string} agency
   * @param {object} fixedFields
   */
  const agencyField = (agency, fixedFields) => ({
    "158": {
      label: "AGENCY",
      value: agency,
    },
    ...fixedFields,
  });

  /**
   * ecommunicationsPref(ecommunicationsPrefValue)
   * Opt-in/opt-out of marketing email. The request value is a boolean which
   * must be converted to a string. The values are 's' for subscribed (true
   * in the request) and '-' for not subscribed (false in the request).
   *
   * "pcode1" is always the NYPL library-defined patron data field
   * specifically for e-communications subscriptions. There is also a value
   * for unsubscribing, but since we are creating patrons only, that value
   * is not useful.
   *
   * This merges any existing values in the "patronCodes" object and
   * returns it.
   *
   * @param {boolean} ecommunicationsPrefValue
   * @param {object} patronCodes
   */
  const ecommunicationsPref = (
    ecommunicationsPrefValue = false,
    patronCodes
  ) => {
    let value = ecommunicationsPrefValue
      ? IlsClient.SUBSCRIBED_ECOMMUNICATIONS_PREF
      : IlsClient.NOT_SUBSCRIBED_ECOMMUNICATIONS_PREF;

    return { ...patronCodes, pcode1: value };
  };

  return {
    createPatron,
    available,
    getPatronFromBarcodeOrUsername,
    updatePatron,
    // For testing,
    agencyField,
    ecommunicationsPref,
    formatPatronData,
    formatAddress,
    formatPatronName,
  };
};

IlsClient.MINOR_AGE = 13;
// Field tags to access patron information in ILS
IlsClient.BIRTHDATE_FIELD_TAG = "51";
// Barcode AND username are indexed on this tag.
IlsClient.BARCODE_FIELD_TAG = "b";
IlsClient.PIN_FIELD_TAG = "=";
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
IlsClient.STANDARD_EXPIRATION_TIME = 1095; // days, 3 years
IlsClient.TEMPORARY_EXPIRATION_TIME = 30; // days
IlsClient.WEB_APPLICANT_EXPIRATION_TIME = 90; // days
// Ptypes for various library card offerings
IlsClient.WEB_APPLICANT_PTYPE = 1;
IlsClient.SIMPLYE_METRO_PTYPE = 2;
IlsClient.SIMPLYE_NON_METRO_PTYPE = 3;
IlsClient.ADULT_METRO_PTYPE = 10;
IlsClient.ADULT_NYS_PTYPE = 11;
IlsClient.SENIOR_METRO_PTYPE = 20;
IlsClient.SENIOR_NYS_PTYPE = 21;
IlsClient.SIMPLYE_JUVENILE = 4;
IlsClient.SIMPLYE_JUVENILE_ONLY = 5;
IlsClient.SIMPLYE_YOUNG_ADULT = 6;
// The following two p-types don't have a code yet.
// Using 101 for now but MUST be updated.
IlsClient.DISABLED_METRO_NY_PTYPE = 101;
IlsClient.HOMEBOUND_NYC_PTYPE = 101;
IlsClient.TEEN_METRO_PTYPE = 50;
IlsClient.TEEN_NYS_PTYPE = 51;
IlsClient.MARLI_PTYPE = 81;
IlsClient.REJECTED_PTYPE = 101;
IlsClient.ILS_ERROR = "-1";
IlsClient.PTYPE_TO_TEXT = {
  WEB_APPLICANT_PTYPE: "Web applicant (No Borrowing)",
  ADULT_METRO_PTYPE: "Adult 18-64 Metro (3 Year)",
  ADULT_NYS_PTYPE: "Adult 18-64 NY State (3 Year)",
  SENIOR_METRO_PTYPE: "Senior, 65+, Metro (3 Year)",
  SENIOR_NYS_PTYPE: "Senior, 65+, NY State (3 Year)",
  DISABLED_METRO_NY_PTYPE: "Disabled Metro NY (3 Year)",
  HOMEBOUND_NYC_PTYPE: "Homebound NYC (3 Year)",
  SIMPLYE_METRO_PTYPE: "SimplyE Metro",
  SIMPLYE_NON_METRO_PTYPE: "SimplyE Non-Metro",
  SIMPLYE_JUVENILE: "SimplyE Juvenile",
  SIMPLYE_JUVENILE_ONLY: "SimplyE Juvenile Only",
  SIMPLYE_YOUNG_ADULT: "SimplyE Young Adult",
  TEEN_METRO_PTYPE: "Teen Metro (3 Year)",
  TEEN_NYS_PTYPE: "Teen NY State (3 Year)",
  MARLI_PTYPE: "Marli",
  REJECTED_PTYPE: "Rejected",
  ILS_ERROR: "Unable to create in ILS",
};
IlsClient.CAN_CREATE_DEPENDENTS = [
  IlsClient.ADULT_METRO_PTYPE,
  IlsClient.ADULT_NYS_PTYPE,
  IlsClient.SENIOR_METRO_PTYPE,
  IlsClient.SENIOR_NYS_PTYPE,
  IlsClient.DISABLED_METRO_NY_PTYPE,
  IlsClient.HOMEBOUND_NYC_PTYPE,
  IlsClient.SIMPLYE_METRO_PTYPE,
  IlsClient.SIMPLYE_NON_METRO_PTYPE,
  IlsClient.MARLI_PTYPE,
];
// Default values for certain fields
IlsClient.DEFAULT_HOME_LIB = "";
IlsClient.DEFAULT_PATRON_AGENCY = "202";
IlsClient.DEFAULT_NOTICE_PREF = "z";
IlsClient.DEFAULT_NOTE = `Patron's work/school address is ADDRESS2[ph].
                    Out-of-state home address is ADDRESS1[pa].`;
// Opt-in/out of Marketing's email subscription service:
// 's' = subscribed; '-' = not subscribed
// This needs to be sent in the patronCodes object in the pcode1 field
// { pcode1: 's' } or { pcode1: '-' }
IlsClient.SUBSCRIBED_ECOMMUNICATIONS_PREF = "s";
IlsClient.NOT_SUBSCRIBED_ECOMMUNICATIONS_PREF = "-";
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
