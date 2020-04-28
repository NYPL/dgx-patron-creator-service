/* eslint-disable no-console */
const IlsClient = require('../../controllers/v0.3/IlsClient');

/**
 * Creates a policy object to find out what type of card is allowed for a
 * given patron and their location.
 *
 * @param {object} args - Object consisting of the policy type.
 */
const Policy = (args) => {
  const lowerCase = (arr) => arr.map((item) => item.toLowerCase());
  const DEFAULT_POLICY_TYPE = 'simplye';
  const ALLOWED_STATES = lowerCase(['NY', 'New York']);
  const ALLOWED_COUNTIES = lowerCase([
    'Richmond',
    'Queens',
    'New York',
    'Kings',
    'Bronx',
  ]);
  const ALLOWED_CITIES = lowerCase(['New York', 'New York City', 'NYC']);
  const ilsPolicy = {
    simplye: {
      agency: IlsClient.DEFAULT_PATRON_AGENCY,
      ptype: {
        metro: {
          id: IlsClient.NO_PRINT_ADULT_METRO_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.NO_PRINT_ADULT_METRO_PTYPE,
        },
        default: {
          id: IlsClient.NO_PRINT_ADULT_NYS_PTYPE,
          desc: IlsClient.PTYPE_TO_TEXT.NO_PRINT_ADULT_NYS_PTYPE,
        },
      },
      cardType: {
        standard: IlsClient.STANDARD_EXPIRATION_TIME,
        temporary: IlsClient.TEMPORARY_EXPIRATION_TIME,
      },
      requiredFields: ['email', 'barcode'],
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
      cardType: {
        standard: IlsClient.WEB_APPLICANT_EXPIRATION_TIME,
        temporary: IlsClient.WEB_APPLICANT_EXPIRATION_TIME,
      },
      requiredFields: ['birthdate'],
      minimumAge: 13,
    },
  };
  const policyType = args && args.policyType ? args.policyType : DEFAULT_POLICY_TYPE;
  const policy = ilsPolicy[policyType];

  // Return an array of named, approved patron policy schemes
  const validTypes = Object.keys(ilsPolicy);
  const isDefault = policyType === DEFAULT_POLICY_TYPE;
  const isWebApplicant = policyType === 'webApplicant';

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
  const isRequiredField = (field) => policyField('requiredFields').includes(field);

  /**
   * determinePtype(patron)
   * Determins the ptype for a patron based on the policy type and the
   * patron's address.
   *
   * @param {Patron object} patron
   */
  const determinePtype = (patron = undefined) => {
    const ptype = policyField('ptype');
    const hasServiceArea = policyField('serviceArea')
      && Object.keys(policyField('serviceArea')).length;
    const hasMetroKey = Object.keys(ptype).includes('metro');
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

  /**
   * determineAgency(patronParams)
   * Determines the agency of a patron based on the current policy.
   *
   * @param {object} patronParams
   */
  const determineAgency = (patronParams = {}) => {
    if (isWebApplicant) {
      if (
        patronParams
        && patronParams.patronAgency
        && parseInt(patronParams.patronAgency, 10) === 199
      ) {
        policy.agency = IlsClient.WEB_APPLICANT_NYS_AGENCY;
      } else {
        policy.agency = IlsClient.WEB_APPLICANT_AGENCY;
      }
    } else {
      policy.agency = IlsClient.DEFAULT_PATRON_AGENCY;
    }

    return policy.agency;
  };

  /**
   * usesAnApprovedPolicy()
   * Checks if the passed policy type as the argument is a valid ILS policy.
   *
   */
  const usesAnApprovedPolicy = () => {
    const keys = Object.keys(ilsPolicy);
    if (!keys.includes(policyType)) {
      console.log(
        `${policyType} policy type is invalid, must be of type ${keys.join(
          ', ',
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
    determineAgency,
    usesAnApprovedPolicy,
  };
};

module.exports = Policy;
