/* eslint-disable */
const { NoILSClient, ILSIntegrationError } = require("../../helpers/errors");
const IlsClient = require("./IlsClient");

/**
 *
 */
const DependentEligibilityAPI = (args) => {
  const ilsClient = args["ilsClient"];

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

  return {
    isPatronEligible,
    // For testing,
    getPatronFromILS,
    checkPType,
    checkDependentLimit,
  };
};

module.exports = DependentEligibilityAPI;
