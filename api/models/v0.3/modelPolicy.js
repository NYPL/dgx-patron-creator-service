/* eslint-disable */
import IlsHelper from "../../controllers/v0.3/ILSHelper";

const lowerCase = (arr) => arr.map((item) => item.toLowerCase());

/**
 * Creates a policy object to find out what type of card is allowed.
 */
class Policy {
  constructor(args = {}) {
    this.policy_type = args.policy_type || Policy.DEFAULT_POLICY_TYPE;
    this.policy = Policy.ils_policy[this.policy_type];
  }

  // attr_accessor :agency, :ptype, :card_type, :required_fields

  // Return an array of named, approved patron policy schemes
  valid_types() {
    return Object.keys(Policy.ils_policy);
  }

  // Return the agency string associated with the given patron policy
  agency() {
    return this.policy["agency"];
  }
  // Return the ptype hash associated with the given patron policy
  ptype() {
    return this.policy["ptype"];
  }
  // Return the card expiration hash associated with the given patron policy
  card_type() {
    return this.policy["card_type"];
  }
  required_fields() {
    return this.policy["required_fields"];
  }
  minimum_age() {
    return this.policy["minimum_age"];
  }
  service_area() {
    return this.policy["service_area"];
  }
  return_policy_field(field) {
    return this.policy[field];
  }
  is_default() {
    return this.policy_type === DEFAULT_POLICY_TYPE;
  }
  is_required(field) {
    return this.required_fields().includes(field);
  }
  determine_ptype(patron) {
    if (this.service_area() && this.ptype.has_key("metro")) {
      if (patron.lives_or_works_in_city) {
        return this.ptype["metro"]["id"];
      } else if (patron.lives_in_state) {
        return this.ptype["default"]["id"];
      }
    }
    return this.ptype["default"]["id"];
  }
  is_web_applicant() {
    return this.policy_type === "web_applicant";
  }
  determine_agency(patron_params) {
    if (is_web_applicant) {
      if (
        patron_params["patron_agency"] &&
        parseInt(patron_params["patron_agency"], 10) === 199
      ) {
        this.policy["agency"] = IlsHelper.WEB_APPLICANT_NYS_AGENCY;
      } else {
        this.policy["agency"] = IlsHelper.WEB_APPLICANT_AGENCY;
      }
    } else {
      this.policy["agency"] = IlsHelper.DEFAULT_PATRON_AGENCY;
    }
  }

  // Validations
  uses_an_approved_policy() {
    const keys = Object.keys(Policy.ils_policy);
    if (!keys.include(this.policy_type)) {
      this.errors.push(`${policy_type} is invalid, must be ${keys.join(", ")}`);
    }
  }
}

Policy.DEFAULT_POLICY_TYPE = "simplye";
Policy.ALLOWED_STATES = lowerCase(["NY", "New York"]);
Policy.ALLOWED_COUNTIES = lowerCase([
  "Richmond",
  "Queens",
  "New York",
  "Kings",
  "Bronx",
]);
Policy.ALLOWED_CITIES = lowerCase(["New York"]);
Policy.ils_policy = {
  simplye: {
    agency: IlsHelper.DEFAULT_PATRON_AGENCY,
    ptype: {
      metro: {
        id: IlsHelper.NO_PRINT_ADULT_METRO_PTYPE,
        desc: IlsHelper.PTYPE_TO_TEXT["NO_PRINT_ADULT_METRO_PTYPE"],
      },
      default: {
        id: IlsHelper.NO_PRINT_ADULT_NYS_PTYPE,
        desc: IlsHelper.PTYPE_TO_TEXT["NO_PRINT_ADULT_NYS_PTYPE"],
      },
    },
    card_type: {
      standard: IlsHelper.STANDARD_EXPIRATION_TIME,
      temporary: IlsHelper.TEMPORARY_EXPIRATION_TIME,
    },
    required_fields: ["email", "barcode"],
    service_area: {
      city: Policy.ALLOWED_CITIES,
      county: Policy.ALLOWED_COUNTIES,
      state: Policy.ALLOWED_STATES,
    },
  },
  web_applicant: {
    agency: IlsHelper.WEB_APPLICANT_AGENCY,
    ptype: {
      default: {
        id: IlsHelper.WEB_APPLICANT_PTYPE,
        desc: IlsHelper.PTYPE_TO_TEXT["WEB_APPLICANT_PTYPE"],
      },
    },
    card_type: {
      standard: IlsHelper.WEB_APPLICANT_EXPIRATION_TIME,
      temporary: IlsHelper.WEB_APPLICANT_EXPIRATION_TIME,
    },
    required_fields: ["birthdate"],
    minimum_age: 13,
  },
};

export default Policy;
