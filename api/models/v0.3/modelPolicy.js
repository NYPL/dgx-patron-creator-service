const IlsClient = require("../../controllers/v0.3/IlsClient");

const lowerCase = (arr) => arr.map((item) => item.toLowerCase());

/**
 * Creates a policy object to find out what type of card is allowed for a
 * given patron and their location.
 *
 * @param {object} args - Object consisting of the policy type. The `policyType`
 *  is expected to be either "simplye", "webApplicant", "simplyeJuvenile".
 */
const Policy = (args) => {
  const DEFAULT_POLICY_TYPE = "simplye";
  const policyType =
    args && args.policyType ? args.policyType : DEFAULT_POLICY_TYPE;
  const ALLOWED_STATES = lowerCase(["NY", "New York"]);
  const ALLOWED_COUNTIES = lowerCase([
    "Richmond",
    "Queens",
    "New York",
    "Kings",
    "Bronx",
  ]);
  const ALLOWED_CITIES = lowerCase(["New York", "New York City", "NYC"]);
  const getExpirationPoliciesForPtype = (ptype) => {
    let expTime;
    switch (ptype) {
      case IlsClient.WEB_APPLICANT_PTYPE:
        expTime = {
          standard: IlsClient.STANDARD_EXPIRATION_TIME,
          temporary: IlsClient.WEB_APPLICANT_EXPIRATION_TIME,
        };
        break;
      case IlsClient.SIMPLYE_JUVENILE:
        expTime = {
          standard: IlsClient.STANDARD_EXPIRATION_TIME,
          temporary: IlsClient.STANDARD_EXPIRATION_TIME,
        };
        break;
      case IlsClient.SIMPLYE_METRO_PTYPE:
      case IlsClient.SIMPLYE_NON_METRO_PTYPE:
      default:
        expTime = {
          standard: IlsClient.STANDARD_EXPIRATION_TIME,
          temporary: IlsClient.TEMPORARY_EXPIRATION_TIME,
        };
        break;
    }
    return expTime;
  };
  const ilsPolicies = {
    simplye: {
      agency: IlsClient.DEFAULT_PATRON_AGENCY,
      ptype: {
        metro: {
          id: IlsClient.SIMPLYE_METRO_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.SIMPLYE_METRO_PTYPE,
        },
        default: {
          id: IlsClient.SIMPLYE_NON_METRO_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.SIMPLYE_NON_METRO_PTYPE,
        },
      },
      requiredFields: ["email", "barcode", "ageGate"],
      minimumAge: 13,
      serviceArea: {
        city: ALLOWED_CITIES,
        county: ALLOWED_COUNTIES,
        state: ALLOWED_STATES,
      },
    },
    webApplicant: {
      agency: IlsClient.WEB_APPLICANT_AGENCY,
      ptype: {
        default: {
          id: IlsClient.WEB_APPLICANT_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_APPLICANT_PTYPE,
        },
      },
      requiredFields: ["email", "barcode", "birthdate"],
      minimumAge: 13,
      serviceArea: {
        city: ALLOWED_CITIES,
        county: ALLOWED_COUNTIES,
        state: ALLOWED_STATES,
      },
    },
    simplyeJuvenile: {
      agency: IlsClient.DEFAULT_PATRON_AGENCY,
      ptype: {
        default: {
          id: IlsClient.SIMPLYE_JUVENILE,
          desc: IlsClient.PTYPE_TO_TEXT.SIMPLYE_JUVENILE,
        },
      },
      requiredFields: ["email", "barcode"],
      serviceArea: {
        city: ALLOWED_CITIES,
        county: ALLOWED_COUNTIES,
        state: ALLOWED_STATES,
      },
    },
  };
  const policy = ilsPolicies[policyType] || ilsPolicies[DEFAULT_POLICY_TYPE];
  // Return an array of named, approved patron policy types.
  const validTypes = Object.keys(ilsPolicies);

  /**
   * policyField(field)
   * Returns the field in the current policy object.
   *
   * @param {string} field
   */
  const policyField = (field) => policy[field];

  /**
   * isRequiredField(field)
   * Checks if the field is part of the requiredFields for the current policy.
   *
   * @param {string} field
   */
  const isRequiredField = (field) =>
    policyField("requiredFields").includes(field);

  /**
   * determinePtype(patron)
   * Determines the ptype for a patron based on the policy type and the
   * patron's address.
   *
   * @param {Patron object} patron
   */
  const determinePtype = (patron = undefined) => {
    const ptype = policyField("ptype");
    const hasServiceArea =
      policyField("serviceArea") &&
      Object.keys(policyField("serviceArea")).length;
    const hasMetroKey = Object.keys(ptype).includes("metro");
    if (hasServiceArea && hasMetroKey) {
      if (patron.livesOrWorksInCity()) {
        return ptype.metro.id;
      }
      if (patron.livesInState()) {
        return ptype.default.id;
      }
    }
    return ptype.default.id;
  };

  return {
    // object
    ilsPolicies,
    // variables
    policyType,
    policy,
    validTypes,
    // functions
    getExpirationPoliciesForPtype,
    policyField,
    isRequiredField,
    determinePtype,
  };
};

module.exports = Policy;
