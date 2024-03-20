const IlsClient = require("../../controllers/v0.3/IlsClient");

/**
 * Creates a policy object to find out what type of card is allowed for a
 * given card and their location.
 * @param {object} props - Object consisting of the policy type. The
 *  `policyType` is expected to be either "simplye", "webApplicant",
 *  or "simplyeJuvenile".
 */
const Policy = (props) => {
  const DEFAULT_POLICY_TYPE = "webApplicant";
  const policyType =
    props && props.policyType ? props.policyType : DEFAULT_POLICY_TYPE;
  const getExpirationPoliciesForPtype = (ptype) => {
    let expTime;
    switch (ptype) {
      // One year.
      case IlsClient.WEB_DIGITAL_NON_METRO:
        expTime = IlsClient.ONE_YEAR_STANDARD_EXPIRATION_TIME;
        break;
      // Three years.
      case IlsClient.WEB_DIGITAL_METRO:
      case IlsClient.SIMPLYE_JUVENILE:
      case IlsClient.SIMPLYE_METRO_PTYPE:
      case IlsClient.SIMPLYE_NON_METRO_PTYPE:
        expTime = IlsClient.STANDARD_EXPIRATION_TIME;
        break;
      // 90 days.
      case IlsClient.WEB_APPLICANT_PTYPE:
        expTime = IlsClient.WEB_APPLICANT_EXPIRATION_TIME;
        break;
      // 14 days.
      case IlsClient.WEB_DIGITAL_TEMPORARY:
      default:
        expTime = IlsClient.TEMPORARY_EXPIRATION_TIME;
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
      },
      requiredFields: ["ageGate"],
      minimumAge: 13,
    },
    webApplicant: {
      agency: IlsClient.WEB_APPLICANT_AGENCY,
      ptype: {
        default: {
          id: IlsClient.WEB_APPLICANT_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.WEB_APPLICANT_PTYPE,
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
      requiredFields: ["birthdate"],
      minimumAge: 13,
    },
    simplyeJuvenile: {
      agency: IlsClient.DEFAULT_PATRON_AGENCY,
      ptype: {
        default: {
          id: IlsClient.SIMPLYE_JUVENILE,
          desc: IlsClient.PTYPE_TO_TEXT.SIMPLYE_JUVENILE,
        },
      },
      requiredFields: [],
    },
  };
  const policy = ilsPolicies[policyType];
  const isWebApplicant = policyType === "webApplicant";
  const isSimplyEApplicant = policyType === "simplye";
  const isJuvenileApplicant = policyType === "simplyeJuvenile";

  /**
   * policyField
   * Returns the field in the current policy object.
   * @param {string} field
   */
  const policyField = (field) => policy[field];

  /**
   * isRequiredField
   * Checks if the field is part of the requiredFields for the current policy.
   * @param {string} field
   */
  const isRequiredField = (field) =>
    policyField("requiredFields").includes(field);

  /**
   * determinePtype
   * Determines the ptype for a card account based on the policy type and the
   * card's location and address.
   * @param {Card object} card
   */
  const determinePtype = (card) => {
    const ptype = policyField("ptype");

    // The "simplyeJuvenile" policy only has one ptype. Easy enough, just
    // return that.
    if (isJuvenileApplicant) {
      return ptype.default.id;
    }

    // The "simplye" policy type will be updated at a later time. Right now,
    // we will not assign ptypes of 2 or 3 which are related to the
    // "simplye" policy. Also, if it's not a "webApplicant", just return.
    if (isSimplyEApplicant || !isWebApplicant || !card) {
      return;
    }

    // Currently, patrons get a temporary card if they live outside the US or
    // if their location couldn't be verified.
    if (!card.livesInUS() || card.location === "") {
      return ptype.digitalTemporary.id;
    }

    // We now assume the policy is "webApplicant".

    // Location is the value from a user's IP address after passing through a
    // geolocation API. If the IP address check failed, the default will be the
    // value of "us" and that defaults to a temporary card.

    // The user's location is in NYS (including NYC) and has a home address
    // in NYC. Also, there were no errors validating against Service Objects.
    console.log("Card information");
    console.log("location", card.location);
    console.log("livesInUS", card.livesInUS());
    console.log("livesInNYCity", card.livesInNYCity());
    console.log("livesInNYState", card.livesInNYState());
    console.log("worksInNYCity", card.worksInNYCity());
    console.log("addressIsResidential", card.addressIsResidential());
    console.log("addressHasBeenValidated", card.addressHasBeenValidated());

    if (
      (card.location === "nyc" || card.location === "nys") &&
      card.livesInNYCity() &&
      card.addressIsResidential() &&
      card.addressHasBeenValidated()
    ) {
      return ptype.digitalMetro.id;
    }

    // The user is in NYS and has a home address in NYS. They
    // also don't have a work address in NYC. Also, there were no errors
    // validating against Service Objects.
    if (
      (card.location === "nyc" || card.location === "nys") &&
      !card.livesInNYCity() &&
      card.livesInNYState() &&
      !card.worksInNYCity() &&
      card.addressIsResidential() &&
      card.addressHasBeenValidated()
    ) {
      return ptype.digitalNonMetro.id;
    }

    // The user is in NYS but has a home address outside of NYS. Also, there
    // were no errors validating against Service Objects.
    if (
      (card.location === "nyc" || card.location === "nys") &&
      card.livesInUS() &&
      card.addressIsResidential() &&
      card.addressHasBeenValidated()
    ) {
      return ptype.digitalTemporary.id;
    }

    // The user is in the United States but not in NYS. They have an address
    // in the US or they have a work address in the US. Or, if the address was
    // not validated.
    if (
      (card.location === "us" && (card.livesInUS || card.worksInUS())) ||
      !card.addressHasBeenValidated() ||
      card.worksInUS()
    ) {
      return ptype.digitalTemporary.id;
    }

    // If nothing matches, return a temporary ptype.
    return ptype.digitalTemporary.id;
  };

  return {
    // object
    ilsPolicies,
    // variables
    policyType,
    policy,
    // functions
    getExpirationPoliciesForPtype,
    policyField,
    isRequiredField,
    determinePtype,
  };
};

module.exports = Policy;
