const IlsClient = require("../../controllers/v0.3/IlsClient");
const logger = require("../../helpers/Logger");

/**
 * Creates a policy object to find out what type of card is allowed for a
 * given patron and their location.
 *
 * @param {object} args - Object consisting of the policy type.
 */
const Policy = (args) => {
  const lowerCase = (arr) => arr.map((item) => item.toLowerCase());
  const DEFAULT_POLICY_TYPE = "simplye";
  const ALLOWED_STATES = lowerCase(["NY", "New York"]);
  const ALLOWED_COUNTIES = lowerCase([
    "Richmond",
    "Queens",
    "New York",
    "Kings",
    "Bronx",
  ]);
  const ALLOWED_CITIES = lowerCase(["New York", "New York City", "NYC"]);
  const ilsPolicy = {
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
      cardType: {
        standard: IlsClient.STANDARD_EXPIRATION_TIME,
        temporary: IlsClient.TEMPORARY_EXPIRATION_TIME,
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
        digTemp: {
          id: IlsClient.WEB_DIGITAL_TEMPORARY,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_DIGITAL_TEMPORARY,
        },
        digNonMetro: {
          id: IlsClient.WEB_DIGITAL_NON_METRO,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_DIGITAL_NON_METRO,
        },
        digMetro: {
          id: IlsClient.WEB_DIGITAL_METRO,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_DIGITAL_METRO,
        },
      },
      cardType: {
        standard: IlsClient.STANDARD_EXPIRATION_TIME,
        temporary: IlsClient.WEB_APPLICANT_EXPIRATION_TIME,
      },
      requiredFields: ["email", "barcode", "birthdate", "location"],
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
      cardType: {
        standard: IlsClient.STANDARD_EXPIRATION_TIME,
        temporary: IlsClient.STANDARD_EXPIRATION_TIME,
      },
      requiredFields: ["email", "barcode"],
      serviceArea: {
        city: ALLOWED_CITIES,
        county: ALLOWED_COUNTIES,
        state: ALLOWED_STATES,
      },
    },
  };
  const policyType = args && args.policyType ? args.policyType : DEFAULT_POLICY_TYPE;
  const policy = ilsPolicy[policyType] || ilsPolicy[DEFAULT_POLICY_TYPE];

  // Return an array of named, approved patron policy schemes
  const validTypes = Object.keys(ilsPolicy);
  const isDefault = policyType === DEFAULT_POLICY_TYPE;
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
  const isRequiredField = (field) => policyField("requiredFields").includes(field);

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
        return ptype.digMetro.id;
      }
      // The user is in NYS and has a home address in NYS but not in NYC. They
      // also don't have a work address in NYC.
      if (
        patron.location === "nys"
        && !patron.livesInCity()
        && patron.livesInState()
        && !patron.worksInCity()
      ) {
        return ptype.digNonMetro.id;
      }
      // The user is in the United States but not in NYS. They have an address
      // in the US or they have a work address in the US.
      if (
        patron.location === "us"
        && (!patron.livesInState() || patron.worksInCity())
      ) {
        return ptype.digTemp.id;
      }

      // TODO: This shouldn't happen so... how do we get the default?
      return ptype.default.id;
    }

    return ptype.default.id;
  };

  /**
   * usesAnApprovedPolicy()
   * Checks if the passed policy type as the argument is a valid ILS policy.
   *
   */
  const usesAnApprovedPolicy = () => {
    const keys = Object.keys(ilsPolicy);
    if (!keys.includes(policyType)) {
      logger.error(
        `${policyType} policy type is invalid, must be of type ${keys.join(
          ", ",
        )}`,
      );
      return false;
    }
    return true;
  };

  return {
    // object
    ilsPolicy,
    // variables
    policyType,
    policy,
    validTypes,
    isDefault,
    isWebApplicant,
    // functions
    policyField,
    isRequiredField,
    determinePtype,
    usesAnApprovedPolicy,
  };
};

module.exports = Policy;
