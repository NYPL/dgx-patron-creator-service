const {
  NoILSClient,
  ILSIntegrationError,
  PatronNotFound,
  InvalidRequest,
  NoBarcode,
  ExpiredAccount,
  NotEligibleCard,
} = require("../../helpers/errors");
const IlsClient = require("./IlsClient");
const logger = require("../../helpers/Logger");

// A parent patron is only allowed to create three dependent juvenile accounts.
const DEPENDENT_LIMIT = 3;

/**
 * DependentAccountAPI
 * A class with the main purpose to check a patron's eligibility to create
 * dependent juvenile cards and to update a patron account with the information
 * of the dependent juvenile cards.
 * @param {object} ilsClient IlsClient instance object.
 */
const DependentAccountAPI = (ilsClient) => {
  let parentPatronData;

  /**
   * isPatronEligible
   * The main function of this class. It gets a patron data object from the ILS
   * and it verifies it has the correct p-type. If it does, then it checks if
   * it can create another dependent account. It returns a response stating
   * whether the patron is eligible or not and a description if they are not.
   * @param {object} options
   */
  const isPatronEligible = async (options) => {
    if (!ilsClient) {
      throw new NoILSClient(
        "ILS Client not set in the Dependent Eligibility API."
      );
    }
    if (!options || (!options.barcode && !options.username)) {
      throw new InvalidRequest("No barcode or username passed.");
    }

    const { barcode, username } = options;
    // It's possible for patrons to have barcodes of length 7. Those accounts
    // are older and temporary and we need to return the not eligible error
    // rather than the invalid request error.
    if (barcode && barcode.length === 7) {
      throw new NotEligibleCard(
        "You don’t have the correct card type to make child accounts. Please contact gethelp@nypl.org if you believe this is in error."
      );
    }
    if (barcode && (barcode.length < 14 || barcode.length > 16)) {
      throw new InvalidRequest(
        "The barcode passed is not a 14-digit or 16-digit number."
      );
    }
    const opts = {};
    if (barcode) {
      opts.value = barcode;
      opts.type = "barcode";
    } else {
      opts.value = username;
      opts.type = "username";
    }

    let response = {};
    const patron = await getPatronFromILS(opts);
    // Set the fetched patron data object into the global variable so
    // it can be accessed by `getPatron`. This is specifically set here and not
    // in `getPatronFromILS` because we want to make sure that the eligibility
    // check was run in order to retrieve a patron.
    parentPatronData = patron;

    // First check if the account isn't expired.
    const hasExpiredAccount = checkAccountExpiration(patron.expirationDate);

    if (hasExpiredAccount) {
      throw new ExpiredAccount();
    }

    // Now, check that they have an eligible ptype that allows them to
    // create dependent accounts.
    const hasEligiblePtype = checkPType(patron.patronType);

    if (hasEligiblePtype) {
      // Great, they have an eligible ptype. Now check that they have not
      // reached the dependent account limit.
      const canCreateDependentsValue = canCreateDependents(patron.varFields);

      if (!canCreateDependentsValue) {
        throw new NotEligibleCard(
          "You have reached the limit of dependent cards you can receive via online application."
        );
      } else {
        response["eligible"] = true;
        response["description"] = "This patron can create dependent accounts.";
      }
    } else {
      throw new NotEligibleCard(
        "You don’t have the correct card type to make child accounts. Please contact gethelp@nypl.org if you believe this is in error."
      );
    }

    return response;
  };

  /**
   * checkAccountExpiration
   * Returns true if the account is expired or false otherwise.
   * @param {string} expirationDate
   * @param {Date} now
   */
  const checkAccountExpiration = (expirationDate, now = new Date()) => {
    const expDate = new Date(expirationDate);
    return now > expDate;
  };

  /**
   * getPatronFromILS
   * This calls the ILS to get a patron data object from a barcode or username.
   * Returns an error if the patron couldn't be found or there was an error
   * with the ILS.
   * @param {object} options - Object containing a type and value to get a
   *  patron from the ILS. Examples:
   *  { type: "barcode", value: "123456789123456" }
   *  { type: "username", value: "someUserName12" }
   */
  const getPatronFromILS = async (options) => {
    if (!ilsClient) {
      throw new NoILSClient(
        "ILS Client not set in the Dependent Eligibility API."
      );
    }
    const { value, type } = options;
    const isBarcode = !!(type === "barcode");

    try {
      const response = await ilsClient.getPatronFromBarcodeOrUsername(
        value,
        isBarcode
      );

      if (response.status !== 200) {
        // The record wasn't found.
        logger.error(`Patron was not found - ${response}`);
        throw new PatronNotFound();
      }

      // Return the patron object.
      return response.data;
    } catch (error) {
      if (error.type !== "patron-not-found") {
        throw new ILSIntegrationError(error.message);
      }
      throw error;
    }
  };

  /**
   * checkPType
   * Checks if the input p-type is an eligible p-type that can create
   * dependent accounts in the ILS.
   * @param {number} patronType
   */
  const checkPType = (patronType) =>
    IlsClient.CAN_CREATE_DEPENDENTS.includes(patronType);

  /**
   * canCreateDependents
   * This function assumes that the patron has an eligible p-type and can
   * therefore create dependent accounts. Dependent accounts are found in the
   * `varFields` array of a patron data object, in an object with a
   * `fieldTag` of "x". A varField object has the following form:
   *   { fieldtag: "", content: "" }
   * This checks specifically if `content` has "DEPENDENTS" in the string. If
   * it does, it then checks to see how many barcodes are in the string based
   * on how many commas there are to separate the barcodes. If the limit of
   * barcodes is found (DEPENDENT_LIMIT), then the patron can no longer create
   * dependent accounts. Otherwise, they have one or two dependents and can
   * create another. If the object with the fieldTag of "x" isn't found, or
   * if it is found but it has other content, then we assume they don't have
   * any dependents. The patron already has an eligible p-type so they can
   * create dependents.
   * @param {array} varFields
   */
  const canCreateDependents = (varFields) => {
    const varField = getDependentVarField(varFields);

    // No varField object was found, so we can assume the patron doesn't
    // have any dependent accounts yet.
    if (!varField) {
      return true;
    }

    // There is a varField with "DEPENDENTS". Now find how many dependents are
    // in the `content` string. The content will be in the form of
    // "DEPENDENTS x,x,x" so split the string by a space to get the accounts.
    const dependentAccounts = varField.content.split(" ")[1];
    // Now split that string by the commas to get a count of how many
    // accounts there are.
    const totalAccounts = dependentAccounts.split(",").length;

    // If the patron hasn't reached the limit, return true because they can
    // create more accounts. Otherwise, they reached the limit so return false
    // because they can't create more dependent accounts.
    return totalAccounts !== DEPENDENT_LIMIT;
  };

  /**
   * getAlreadyFetchedParentPatron
   * Gets a patron after it was fetched from the ILS when running the
   * `isPatronEligible` function. This is to reduce calls to the ILS since
   * the parent patron data is already stored in memory but will be
   * overidden the next time a new parent patron's data is requested.
   */
  const getAlreadyFetchedParentPatron = () => {
    if (!parentPatronData) {
      return;
    }

    // The following is to display in the API response the dependent accounts
    // the parent patron has.
    const varFields = parentPatronData.varFields || [];
    const varField = getDependentVarField(varFields);
    let dependents;

    // No varFields were found, so we can assume the patron doesn't
    // have any dependent accounts yet. Return `"DEPENDENTS "` with the space to
    // add the first dependent account barcode later on.
    // Else, there are already barcodes so just return it, and the next barcode
    // will be added later on.
    dependents = !varField ? "DEPENDENTS " : varField.content;

    return {
      ...parentPatronData,
      dependents,
    };
  };

  /**
   * getVarField
   * Returns all the varField objects in the varFields array with a specific
   * `fieldTag` value. Currently, the default `fieldTag` value is `"x"` since
   * that's the note field we will most often use.
   * @param {array} varFields
   * @param {string} fieldTag
   */
  const getVarField = (varFields = [], fieldTag = "x") => {
    if (!varFields) {
      return;
    }

    return varFields.filter((obj) => obj.fieldTag === fieldTag);
  };

  /**
   * getDependentVarField
   * Get the varFields object that has a `fieldTag` value of "x" and a `content`
   * value that includes the string "DEPENDENTS ..."". The `content` property
   * can include up to three dependent barcodes. If no object is found, or if
   * there is an object with a `fieldTag` value of "x", but "DEPENDENTS" is not
   * in the `content` property, then return undefined. Otherwise, return the
   * object which can look like:
   * { fieldTag: "x", content: "DEPENDENTS y,y,y" }
   * @param {array} varFields
   */
  const getDependentVarField = (varFields = []) => {
    if (!varFields || !varFields.length) {
      return;
    }

    const fieldTag = "x";
    // Get all varField objects that have a `fieldTag` value of "x".
    const xVarFieldTags = getVarField(varFields, fieldTag);
    // No varFields were found, return.
    if (xVarFieldTags.length === 0) {
      return;
    } else {
      // Check for a varField that "DEPENDENTS" in the `content` property.
      const dependentsVarField = xVarFieldTags.find(
        (obj) => obj.content.indexOf("DEPENDENTS") !== -1
      );

      // There are varFields with a `fieldTag` of "x" but none with a `content`
      // value that includes "DEPENDENTS". This will result in undefined.
      // Otherwise, the found object will be returned.
      return dependentsVarField;
    }
  };

  /**
   * updateParentWithDependent
   * This updates the field object in the varFields array for a patron. It
   * specifically will add an object with a `fieldTag` of 'x' and a `content`
   * of a list of dependent's barcodes. It does the logic to update any
   * existing string to add a barcode if any exist already. The response
   * doesn't return anything so if the status is `204`, then it was successful.
   * @param {object} parent
   * @param {string} dependentBarcode
   */
  const updateParentWithDependent = async (parent, dependentBarcode) => {
    if (!ilsClient) {
      throw new NoILSClient(
        "ILS Client not set in the Dependent Eligibility API."
      );
    }

    if (!dependentBarcode) {
      throw new NoBarcode(
        "The dependent account has no barcode. Cannot update parent account."
      );
    }

    const varFields = parent.varFields || [];
    let varField = getDependentVarField(varFields);
    let updatedVarField;
    // No varField object was found, so we can assume the patron doesn't
    // have any dependent accounts yet.
    if (!varField) {
      // This is the parent patron's first dependent.
      updatedVarField = {
        fieldTag: "x",
        content: `DEPENDENTS ${dependentBarcode}`,
      };
    } else {
      // The value is already there. So now append the new barcode.
      updatedVarField = {
        ...varField,
        content: `${varField.content},${dependentBarcode}`,
      };
    }

    // This field is hardcoded but we only expect to update a patron's account
    // if they have a dependent to add.
    const updatedFields = {
      varFields: [updatedVarField],
    };

    const response = await ilsClient.updatePatron(parent.id, updatedFields);

    if (response.status !== 204) {
      // The record wasn't found and couldn't be updated.
      throw new ILSIntegrationError("The parent patron couldn't be updated.");
    }

    return response;
  };

  /**
   * formatAddressForILS
   * A dependent account has the same address as its parent account. The address
   * just needs to be converted into an object for the purposes of creating
   * a new Address object to run validations for the new dependent. Since
   * the address is from the parent, it has already been validated and that's
   * added to this new object.
   * @param {object} address
   */
  const formatAddressForILS = (address) => {
    if (!address.lines) {
      return {};
    } else if (address.lines.length !== 2) {
      return {};
    }

    const line1 = address.lines[0];
    const commaIndex = address.lines[1].indexOf(",");
    const city = address.lines[1].slice(0, commaIndex);
    const stateZip = address.lines[1].slice(commaIndex + 2);
    const [state, zip] = stateZip.split(" ");
    return {
      line1,
      city,
      state,
      zip,
      // We are assuming that the parent has a validated address.
      hasBeenValidated: true,
    };
  };

  return {
    isPatronEligible,
    getAlreadyFetchedParentPatron,
    updateParentWithDependent,
    formatAddressForILS,
    // For testing,
    getPatronFromILS,
    checkPType,
    canCreateDependents,
    checkAccountExpiration,
    getVarField,
    getDependentVarField,
  };
};

module.exports = DependentAccountAPI;
