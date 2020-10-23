const IlsClient = require("../../controllers/v0.3/IlsClient");

/**
 * Creates a policy object to find out what type of card is allowed for a
 * given card and their location.
 *
 * @param {object} args - Object consisting of the policy type. The `policyType`
 *  is expected to be either "simplye", "webApplicant", "simplyeJuvenile".
 */
const Policy = (args) => {
  const DEFAULT_POLICY_TYPE = "webApplicant";
  const policyType =
    args && args.policyType ? args.policyType : DEFAULT_POLICY_TYPE;
  const getExpirationPoliciesForPtype = (ptype) => {
    let expTime;
    switch (ptype) {
      case IlsClient.WEB_DIGITAL_TEMPORARY:
        expTime = IlsClient.WEB_APPLICANT_EXPIRATION_TIME;
        break;
      case IlsClient.WEB_DIGITAL_NON_METRO:
        expTime = IlsClient.ONE_YEAR_STANDARD_EXPIRATION_TIME;
        break;
      case IlsClient.WEB_DIGITAL_METRO:
        expTime = IlsClient.STANDARD_EXPIRATION_TIME;
        break;
      case IlsClient.WEB_APPLICANT_PTYPE:
        expTime = IlsClient.WEB_APPLICANT_EXPIRATION_TIME;
        break;
      case IlsClient.SIMPLYE_JUVENILE:
        expTime = IlsClient.STANDARD_EXPIRATION_TIME;
        break;
      case IlsClient.SIMPLYE_METRO_PTYPE:
      case IlsClient.SIMPLYE_NON_METRO_PTYPE:
      default:
        expTime = IlsClient.STANDARD_EXPIRATION_TIME;
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
  const policy = ilsPolicies[policyType] || ilsPolicies[DEFAULT_POLICY_TYPE];
  const isWebApplicant = policyType === "webApplicant";
  const isSimplyEApplicant = policyType === "simplye";
  const isJuvenileApplicant = policyType === "simplyeJuvenile";

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
   * determinePtype(card)
   * Determines the ptype for a card account based on the policy type and the
   * card's location and address.
   *
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

    // TODO: Verify this - a card is denied if the user doesn't have an address
    // in the US or their geolocation is empty.
    if (!card.livesInUS || card.location === "") {
      return;
    }

    // We now assume the policy is "webApplicant".

    // Location is the value from a user's IP address after passing through a
    // geolocation API. If the IP address check failed, the default will be the
    // value of "us" and that defaults to a temporary card.

    // The user's location is in NYS (including NYC) and has a home address
    // in NYC. Also, there were no errors validating against Service Objects.
    if (
      (card.location === "nyc" || card.location === "nys") &&
      card.livesInNYCity() &&
      card.addressIsResidential() &&
      card.addressHasBeenValidated()
    ) {
      return ptype.digitalMetro.id;
    }

    // The user is in NYS and has a home address in NYS but not in NYC. They
    // also don't have a work address in NYC. Also, there were no errors
    // validating against Service Objects.
    if (
      card.location === "nys" &&
      !card.livesInNYCity() &&
      card.livesInNYState() &&
      !card.worksInNYCity() &&
      card.addressIsResidential() &&
      card.addressHasBeenValidated()
    ) {
      return ptype.digitalNonMetro.id;
    }

    // The user is in the United States but not in NYS. They have an address
    // in the US or they have a work address in the US. Or, if the address was
    // not validated.
    if (
      (card.location === "us" && (card.livesInUS || card.worksInUS())) ||
      !card.addressHasBeenValidated()
    ) {
      return ptype.digitalTemporary.id;
    }

    // If nothing matches, don't assign a ptype.
    return;
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
