/* eslint-disable */
const { NoILSClient, ILSIntegrationError } = require("../../helpers/errors");
const IlsClient = require("./IlsClient");

/**
 *
 */
const DependentAccountAPI = (args) => {
  const ilsClient = args["ilsClient"];
  let parentPatronData;

  /**
   * isPatronEligible(barcode)
   * The main function of this class. It gets a patron data object from the ILS
   * and it verifies it has the correct p-type. If it does, then it checks if
   * it can create another dependent account. It returns a response stating
   * whether the patron is eligible or not and a description if they are not.
   *
   * @param {string} barcode
   */
  const isPatronEligible = async (barcode) => {
    if (!ilsClient) {
      throw new NoILSClient(
        "ILS Client not set in the Dependent Eligibility API."
      );
    }

    let response = {};
    const patron = await getPatronFromILS(barcode);
    // Set the fetched patron data object into the global variable so
    // it can be accessed by `getPatron`. This is specifically set here and not
    // in `getPatronFromILS` because we want to make sure that the eligibility
    // check was ran in order to retrieve a patron.
    parentPatronData = patron;
    // First, check that they have a valid ptype to be able to create
    // dependent accounts.
    const hasValidPtype = checkPType(patron.patronType);

    if (hasValidPtype) {
      // Great, they have a valid ptype. Now check that they have not reached
      // the dependent account limit.
      const canCreateDependents = checkDependentLimit(patron.varFields);

      if (!canCreateDependents) {
        response["eligible"] = false;
        response["description"] =
          "This patron has reached the limit to create dependent accounts.";
      } else {
        response["eligible"] = true;
        response["description"] = "This patron can create dependent accounts.";
      }
    } else {
      response["eligible"] = false;
      response["description"] = "This patron does not have an eligible ptype.";
    }

    return response;
  };

  /**
   * getPatronFromILS(barcode)
   * This calls the ILS to get a patron data object from a barcode. Returns an
   * error if the patron couldn't be found or there was an error with the ILS.
   *
   * @param {string} barcode
   */
  const getPatronFromILS = async (barcode) => {
    if (!ilsClient) {
      throw new NoILSClient(
        "ILS Client not set in the Dependent Eligibility API."
      );
    }

    try {
      const response = await ilsClient.getPatronFromBarcodeOrUsername(barcode);

      if (response.status !== 200) {
        // The record wasn't found.
        throw new Error("The patron couldn't be found.");
      }

      // Return the patron object.
      return response.data;
    } catch (error) {
      throw new ILSIntegrationError(error.message);
    }
  };

  /**
   * checkPType(patronType)
   * Checks if the input p-type is a valid p-type that can create
   * dependent accounts in the ILS.
   *
   * @param {number} patronType
   */
  const checkPType = (patronType) =>
    IlsClient.CAN_CREATE_DEPENDENTS.includes(patronType);

  /**
   * checkDependentLimit(varFields)
   * This function assumes that the patron has a valid p-type, and so can
   * create dependent accounts. Dependent accounts will be found in the
   * varField array of a patron data object as an object with a fieldTag of "x".
   * A varField object comes in the form of
   *   { fieldtag: "", content: ""}
   * This checks specificially if `content` has "DEPENDENTS" in the string. If
   * it does, it then checks to see how many barcodes are in the string based
   * on how many commas there are to separate the barcodes. If three barcodes
   * are found, then the patron has reached their limit. Otherwise, they have
   * one or two dependents and can create another. If the object with the
   * fieldTag of "x" isn't found, or if it is found but it has other content,
   * then we assume they don't have any dependents. They already have a
   * valid p-type so let them create dependents.
   *
   * @param {array} varFields
   */
  const checkDependentLimit = (varFields) => {
    // We only want varFields that have a fieldTag of "x".
    const xFieldTags = varFields.filter((obj) => obj.fieldTag === "x");

    // No varFields were found, so we can assume the patron doesn't
    // have any dependent accounts yet.
    if (xFieldTags.length === 0) {
      return true;
    }

    // Check for a varField that has `content` in the form of:
    // "DEPENDENTS x,x,x"
    // where `x` is a barcode. First get the varField that has "DEPENDENTS".
    const dependentsVarField = xFieldTags.find(
      (obj) => obj.content.indexOf("DEPENDENTS") !== -1
    );

    // There are varFields with a fieldTag of "x" but none with "DEPENDENTS".
    // We can assume the patron doesn't have any dependents already and
    // can create dependent accounts.
    if (!dependentsVarField) {
      return true;
    }

    // There is a varField with "DEPENDENTS". Now find how many dependents are
    // in the `content` string. The content will be in the form of
    // "DEPENDENTS x,x,x" so split the string by a space to get the accounts.
    const dependentAccounts = dependentsVarField.content.split(" ")[1];
    // Now split that string by the commas to get a count of how many
    // accounts there are.
    const totalAccounts = dependentAccounts.split(",").length;

    // The limit is 3. If they reached the limit, they can't create anymore.
    if (totalAccounts === 3) {
      return false;
    }
    return true;
  };

  /**
   * getAlreadyFetchedParentPatron
   * Gets a patron after it was fetched from the ILS when running the
   * `isPatronEligible` function. This is to reduce calls to the ILS since
   * the parent patron data is already stored in memory but will be
   * overidden the next time a new parent patron's data is requested.
   */
  const getAlreadyFetchedParentPatron = () => parentPatronData;

  /**
   * updateParentWithDependent(parent, dependentBarcode)
   * This updates the field object in the varFields array for a patron. It
   * specifically will add an object with a `fieldTag` of 'x' and a `content`
   * of a list of dependent's barcodes. It does the logic to update any
   * existing string to add a barcode if any exist already. The response
   * doesn't return anything so if the status is `204`, then it was successful.
   *
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
      throw new Error(
        "The dependent account has no barcode. Cannot update parent account."
      );
    }

    const varFields = parent.varFields || [];
    let varField;
    // parent
    const xFieldTags = varFields.filter((obj) => obj.fieldTag === "x");
    // No varFields were found, so we can assume the patron doesn't
    // have any dependent accounts yet.
    if (xFieldTags.length === 0) {
      varField = { fieldTag: "x", content: `DEPENDENTS ${dependentBarcode}` };
    } else {
      // Check for a varField that has `content` in the form of:
      // "DEPENDENTS x,x,x"
      // where `x` is a barcode. First get the varField that has "DEPENDENTS".
      const dependentsVarField = xFieldTags.find(
        (obj) => obj.content.indexOf("DEPENDENTS") !== -1
      );

      // There are varFields with a fieldTag of "x" but none with "DEPENDENTS".
      // We can assume the patron doesn't have any dependents already.
      if (!dependentsVarField) {
        varField = { fieldTag: "x", content: `DEPENDENTS ${dependentBarcode}` };
      } else {
        // The value is already there. So now append the new barcode.
        dependentsVarField.content += `,${dependentBarcode}`;
        varField = dependentsVarField;
      }
    }

    // This field is hardcoded but we only expect to update a patron's account
    // if they have a dependent to add.
    const updatedFields = {
      varFields: [varField],
    };

    const response = await ilsClient.updatePatron(parent.id, updatedFields);

    if (response.status !== 204) {
      // The record wasn't found and couldn't be updated.
      throw new Error("The parent patron couldn't be updated.");
    }

    return response;
  };

  /**
   * formatDependentAddress(address)
   * A dependent account has the address as its parent account. The address
   * just needs to be converted into an object for the purposes of creating
   * a new Address object to run validations for the new dependent. Since
   * the address is from the parent, it has already been validated and that's
   * added to this new object.
   *
   * @param {object} address
   */
  const formatDependentAddress = (address) => {
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
    getPatronFromILS,
    updateParentWithDependent,
    formatDependentAddress,
    // For testing,
    checkPType,
    checkDependentLimit,
  };
};

module.exports = DependentAccountAPI;
