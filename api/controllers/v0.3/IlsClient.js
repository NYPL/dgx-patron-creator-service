const axios = require("axios");
const {
  ILSIntegrationError,
  InvalidRequest,
  NoILSCredentials,
} = require("../../helpers/errors");
const logger = require("../../helpers/Logger");
const encode = require("../../helpers/encode");
const constants = require("../../../constants");

/**
 * Helper class to setup API calls to the ILS. This class assumes that all the
 * patron data has already been validated. All this does is format the data
 * for API requests to the ILS.
 * @param {object} props
 */
class IlsClient {
  constructor(props, client) {
    const {
      createUrl,
      findUrl,
      tokenUrl,
      ilsClientKey,
      ilsClientSecret,
    } = props;
    this.createUrl = createUrl;
    this.findUrl = findUrl;
    this.tokenUrl = tokenUrl;
    this.ilsClientKey = ilsClientKey;
    this.ilsClientSecret = ilsClientSecret;
    this.ilsToken = null;
    this.ilsTokenTimestamp = null;
    this.sierraClient = client;
  }
  hasIlsToken() {
    return !!this.ilsToken;
  }
  // 3540000 = 59 minutes; tokens are for 60 minutes
  isTokenExpired() {
    const timeNow = new Date();
    return !!(
      this.ilsTokenTimestamp && timeNow - this.ilsTokenTimestamp > 3540000
    );
  }

  /**
   * formatAddress
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
   * @param {Address object} address
   * @param {boolean} isWorkAddress
   */
  static formatAddress(address, isWorkAddress = false) {
    const type = isWorkAddress
      ? constants.WORK_ADDRESS_FIELD_TAG // 'h'
      : constants.ADDRESS_FIELD_TAG; // 'a'
    const fullString = address.toString().toUpperCase();
    const lines = fullString.split("\n");

    return { lines, type };
  }

  /**
   * formatPatronName
   * Formats the patron's name to be in uppercase.
   * @param {string} name
   */
  static formatPatronName(name) {
    if (!name) {
      return "";
    }

    return name.toUpperCase();
  }

  /**
   * agencyField
   * Keep any existing fixedFields but add the new one for the agency which
   * has a key of "158".
   *
   * @param {string} agency
   * @param {object} fixedFields
   */
  static agencyField(
    agency = constants.DEFAULT_PATRON_AGENCY,
    fixedFields = {}
  ) {
    return {
      158: {
        label: "AGENCY",
        value: agency,
      },
      ...fixedFields,
    };
  }

  /**
   * notificationField
   * Keep any existing fixedFields but add a new field for the notification
   * type which has a key of "268". The values are: "-" (none), "z" (email),
   * and "p" (phone). Currently, we are only setting up the e-newsletter
   * notifications through the web app. For now, that same flag value
   * (`ecommunicationsPref`) is used to set the general notification
   * field value. If a user opts in for the e-newsletter, they'll also opt in
   * for the general notification through email. This is until UX is set up
   * in the web app.
   *
   * @param {boolean} optIn
   * @param {object} fixedFields
   */
  static notificationField(optIn = false, fixedFields = {}) {
    const pref = optIn ? constants.EMAIL_NOTICE_PREF : constants.NO_NOTICE_PREF;
    return {
      268: {
        label: "NOTICE PREFERENCE",
        value: pref,
      },
      ...fixedFields,
    };
  }

  /**
   * ecommunicationsPref
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
   * @param {boolean} ecommunicationsPrefValue
   * @param {object} patronCodes
   */
  static ecommunicationsPref(ecommunicationsPrefValue = false, patronCodes) {
    const value = ecommunicationsPrefValue
      ? constants.SUBSCRIBED_ECOMMUNICATIONS_PREF
      : constants.NOT_SUBSCRIBED_ECOMMUNICATIONS_PREF;

    return { ...patronCodes, pcode1: value };
  }

  /**
   * formatPatronData
   * Format all the data into an object that the ILS understands.
   * Note: even though we use the name "password" as per NYPL policy, the
   * attribute to send to the ILS *API* will remain as "pin".
   * Example of an ILS-ready object (with some fields):
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
   * @param {Card object} patron
   */
  static formatPatronData(patron) {
    // Addresses should be in a list.
    const addresses = [];
    // varFields is an array of objects.
    const varFields = [];
    // fixedFields is an object containing other objects.
    let fixedFields = {};
    let patronCodes = {};

    const address = this.formatAddress(patron.address);
    addresses.push(address);
    if (patron.worksInNYCity()) {
      const workAddress = this.formatAddress(patron.workAddress, true);
      addresses.push(workAddress);
    }

    const usernameVarField = {
      fieldTag: constants.USERNAME_FIELD_TAG,
      content: patron.username,
    };

    // Add the existing varfields if any.
    if (patron.varFields && patron.varFields.length) {
      varFields.push(...patron.varFields);
    }
    varFields.push(usernameVarField);

    // E-communications value has a key of pcode1 in the patronCodes object.
    // Merging any other pcode values and overwriting patronCodes.
    patronCodes = this.ecommunicationsPref(
      patron.ecommunicationsPref,
      patronCodes
    );

    // Add agency fixedField
    fixedFields = this.agencyField(patron.agency, fixedFields);
    fixedFields = this.notificationField(
      patron.ecommunicationsPref,
      fixedFields
    );

    const patronName = this.formatPatronName(patron.name);

    const fields = {
      names: [patronName],
      addresses,
      pin: patron.password,
      patronType: patron.ptype,
      patronCodes,
      expirationDate: patron.expirationDate.toISOString().slice(0, 10),
      varFields,
      fixedFields,
      homeLibraryCode: patron.homeLibraryCode,
    };

    if (patron.barcode) {
      fields.barcodes = [patron.barcode];
    }
    if (patron.email && patron.email.length) {
      fields.emails = [patron.email.toUpperCase()];
    }
    if (patron.birthdate) {
      fields.birthDate = patron.birthdate.toISOString().slice(0, 10);
    }

    return fields;
  }

  /**
   * createPatron
   * First checks if the patron has met all the requirements before calling the
   * ILS API. If the patron is valid, format the data as the ILS expects it.
   * Returns the response from the ILS or an error.
   * Note: the newly created patron's id is in the response object in
   *  `response.data.link`.
   * @param {Card object} patron
   */
  async createPatron(patron) {
    const ilsPatron = IlsClient.formatPatronData(patron);

    return (
      axios
        .post(this.createUrl, ilsPatron, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.ilsToken}`,
          },
        })
        // Example correct response:
        // {
        //   status: 200,
        //   data: {
        //     link: "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/{patron-id}"
        //   }
        // }
        .then((axiosResponse) => axiosResponse)
        .catch((error) => {
          const response = error.response;
          const message =
            response.data && (response.data.description || response.data.name);
          logger.error(
            "constants.createPatron - error calling ILS URL:",
            this.createUrl
          );
          logger.error(
            "constants.createPatron - error calling ILS error:",
            error
          );
          logger.error(
            "createPatron - error calling ILS error message:",
            message
          );

          // If the request to the ILS is missing a value or a key is of
          // and incorrect type, i.e. the barcode is sent as an integer
          // instead of a string.
          if (response.status === 400) {
            throw new InvalidRequest(`Invalid request to ILS: ${message}`);
          }

          if (!(response.status >= 500)) {
            return response;
          }
          throw new ILSIntegrationError(
            "The ILS could not be requested when attempting to create a patron."
          );
        })
    );
  }

  /**
   * updatePatron
   * First checks if the patron has met all the requirements before calling the
   * ILS API. If the patron is valid, format the data as the ILS expects it.
   * Returns the response from the ILS or an error.
   * Note: the newly created patron's id is in the response object in
   *  `response.data.link`.
   * @param {Card object} patron
   * @param {object} updatedFields
   */
  async updatePatron(patronId, updatedFields) {
    const putUrl = `${this.createUrl}${patronId}`;

    return axios
      .put(putUrl, updatedFields, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.ilsToken}`,
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
        }
        throw new ILSIntegrationError(
          "The ILS could not be requested when attempting to update a patron."
        );
      });
  }

  /**
   * getPatronFromBarcodeOrUsername
   * Hits the /find endpoint in the ILS and returns a patron data object
   * or an error.
   *
   * The barcode field tag is denoted as 'b' and the username field tag is
   * denoted as 'u'.
   * @param {string} barcodeOrUsername
   * @param {boolean} isBarcode
   */
  async getPatronFromBarcodeOrUsername(barcodeOrUsername, isBarcode = true) {
    const fieldTag = isBarcode
      ? constants.BARCODE_FIELD_TAG
      : constants.USERNAME_FIELD_TAG;
    // These two query parameters are required to make a valid GET request.
    const varFieldParams = `varFieldTag=${fieldTag}&varFieldContent=${barcodeOrUsername}`;
    const params = `?${varFieldParams}${constants.ILS_RESPONSE_FIELDS}`;
    return this.sierraClient
      .get(`${this.findUrl}${params}`)
      .then((data) => data)
      .catch((error) => {
        const data = error.response && error.response.data;
        const message = data.description || data.name || "Unknown Error";
        logger.error(
          `ILSClient.getPatronFromBarcodeOrUsername - Error calling ILS URL - ${this.findUrl}${params}`
        );
        logger.error(
          `ILSClient.getPatronFromBarcodeOrUsername - Error calling ILS - ${message}`
        );
        return error.response;
      });
  }

  /**
   * available
   * Makes a call to the ILS to get a patron data object through the
   * `getPatronFromBarcodeOrUsername` function. A 200 response means that the
   * username or barcode was found and is therefore not available. A 404
   * response means that the username or barcode was not found and is
   * therefore available. A 409 response means that the ILS found a duplicate
   * and so the username or barcode is unavailable. These are the responses
   * from the ILS at the moment.
   * @param {string} barcodeOrUsername
   * @param {boolean} isBarcode
   */
  async available(barcodeOrUsername, isBarcode = true) {
    const fieldType = isBarcode ? "barcode" : "username";
    let isAvailable = false;
    const response = await this.getPatronFromBarcodeOrUsername(
      barcodeOrUsername,
      isBarcode
    );

    // Is the response okay? If so, the username or barcode isn't available
    // since a patron was found.
    const status = response.status;
    const data = response.data;
    if (status === 200 && data.id) {
      isAvailable = false;
    }

    // The ILS returns a 404 with the record not found... so it's available!
    if (status === 404 && data.name === "Record not found") {
      isAvailable = true;
    } else if (
      // But if it returns 409, then a duplicate entry was found
      // and the field is not available.
      response.status === 409 &&
      response.data.name === "Internal server error" &&
      response.data.description ===
        "Duplicate patrons found for the specified varFieldTag[b]."
    ) {
      isAvailable = false;
    } else if (response.status >= 500) {
      throw new ILSIntegrationError(
        `The ILS could not be requested when validating the ${fieldType}.`
      );
    }

    return isAvailable;
  }

  /**
   * generateIlsToken
   * Get a token from the ILS using the ILS client key and secret.
   */
  async generateIlsToken() {
    if (!this.ilsClientKey || !this.ilsClientSecret) {
      throw new NoILSCredentials();
    }

    const basicAuth = `Basic ${encode(
      `${this.ilsClientKey}:${this.ilsClientSecret}`
    )}`;

    return axios
      .post(
        this.tokenUrl,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: basicAuth,
          },
        }
      )
      .then((response) => {
        // Set the global variables.
        this.ilsToken = response.data.access_token;
        this.ilsTokenTimestamp = new Date();
      })
      .catch((error) => {
        throw new ILSIntegrationError(
          `Problem calling the ILS token url, ${error.response.data.name}`
        );
      });
  }
}

module.exports = IlsClient;
