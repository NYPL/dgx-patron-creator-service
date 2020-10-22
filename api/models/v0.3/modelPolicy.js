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
      case IlsClient.WEB_DIGITAL_TEMPORARY:
        expTime = {
          standard: IlsClient.WEB_APPLICANT_EXPIRATION_TIME,
          temporary: IlsClient.WEB_APPLICANT_EXPIRATION_TIME,
        };
        break;
      case IlsClient.WEB_DIGITAL_NON_METRO:
        expTime = {
          standard: IlsClient.ONE_YEAR_STANDARD_EXPIRATION_TIME,
          temporary: IlsClient.ONE_YEAR_STANDARD_EXPIRATION_TIME,
        };
        break;
      case IlsClient.WEB_DIGITAL_METRO:
        expTime = {
          standard: IlsClient.STANDARD_EXPIRATION_TIME,
          temporary: IlsClient.STANDARD_EXPIRATION_TIME,
        };
        break;
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
        default: {
          id: IlsClient.SIMPLYE_NON_METRO_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.SIMPLYE_NON_METRO_PTYPE,
        },
        metro: {
          id: IlsClient.SIMPLYE_METRO_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.SIMPLYE_METRO_PTYPE,
        },
        digitalTemporary: {
          id: IlsClient.WEB_DIGITAL_TEMPORARY,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_DIGITAL_TEMPORARY,
        },
        digitalNonMetro: {
          id: IlsClient.WEB_DIGITAL_NON_METRO,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_DIGITAL_NON_METRO,
        },
        digitalMetro: {
          id: IlsClient.WEB_DIGITAL_METRO,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_DIGITAL_METRO,
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
  const isWebApplicant = policyType === "webApplicant";
  const isSimplyEApplicant = policyType === "simplye";

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
    // TODO: This is okay for now but this actually isn't used. For phase 1,
    // only the web applicant and simplye juvenile policy types will be used.
    if (isSimplyEApplicant) {
      if (patron.livesOrWorksInCity()) {
        return ptype.metro.id;
      }
      if (patron.livesInState()) {
        return ptype.default.id;
      }
    }

    if (isWebApplicant) {
      // Location is the value users select or is preselected by the client
      // application (if the user's IP address was geolocated).

      // The user is in NYS and has a home address in NYC.
      if (patron.location === "nys" && patron.livesInCity()) {
        return ptype.digitalMetro.id;
      }
      // The user is in NYS and has a home address in NYS but not in NYC. They
      // also don't have a work address in NYC.
      if (
        patron.location === "nys" &&
        !patron.livesInCity() &&
        patron.livesInState() &&
        !patron.worksInCity()
      ) {
        return ptype.digitalNonMetro.id;
      }
      // The user is in the United States but not in NYS. They have an address
      // in the US or they have a work address in the US.
      if (
        patron.location === "us" &&
        (!patron.livesInState() || patron.worksInCity())
      ) {
        return ptype.digTemp.id;
      }

      // TODO: This shouldn't happen so... how do we get the default?
      return ptype.default.id;
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
