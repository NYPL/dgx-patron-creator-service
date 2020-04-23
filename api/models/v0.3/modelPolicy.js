/* eslint-disable no-console */
import IlsHelper from '../../controllers/v0.3/ILSHelper';

/**
 * Creates a policy object to find out what type of card is allowed.
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
      agency: IlsHelper.DEFAULT_PATRON_AGENCY,
      ptype: {
        metro: {
          id: IlsHelper.NO_PRINT_ADULT_METRO_PTYPE,
          desc: IlsHelper.PTYPE_TO_TEXT.NO_PRINT_ADULT_METRO_PTYPE,
        },
        default: {
          id: IlsHelper.NO_PRINT_ADULT_NYS_PTYPE,
          desc: IlsHelper.PTYPE_TO_TEXT.NO_PRINT_ADULT_NYS_PTYPE,
        },
      },
      cardType: {
        standard: IlsHelper.STANDARD_EXPIRATION_TIME,
        temporary: IlsHelper.TEMPORARY_EXPIRATION_TIME,
      },
      requiredFields: ['email', 'barcode'],
      serviceArea: {
        city: ALLOWED_CITIES,
        county: ALLOWED_COUNTIES,
        state: ALLOWED_STATES,
      },
    },
    webApplicant: {
      agency: IlsHelper.WEB_APPLICANT_AGENCY,
      ptype: {
        default: {
          id: IlsHelper.WEB_APPLICANT_PTYPE,
          desc: IlsHelper.PTYPE_TO_TEXT.WEB_APPLICANT_PTYPE,
        },
      },
      cardType: {
        standard: IlsHelper.WEB_APPLICANT_EXPIRATION_TIME,
        temporary: IlsHelper.WEB_APPLICANT_EXPIRATION_TIME,
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

  const policyField = (field) => policy[field];
  const isRequiredField = (field) => policyField('requiredFields').includes(field);
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
  const determineAgency = (patronParams = {}) => {
    if (isWebApplicant) {
      if (
        patronParams
        && patronParams.patronAgency
        && parseInt(patronParams.patronAgency, 10) === 199
      ) {
        policy.agency = IlsHelper.WEB_APPLICANT_NYS_AGENCY;
      } else {
        policy.agency = IlsHelper.WEB_APPLICANT_AGENCY;
      }
    } else {
      policy.agency = IlsHelper.DEFAULT_PATRON_AGENCY;
    }

    return policy.agency;
  };

  // Validations
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

export default Policy;