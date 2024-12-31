const constants = {};

// We need the `id`, `patronType`, `varFields`, `addresses`, `emails`, and
// `expirationDate` fields from the patron object (`id` is returned by
// default), so those fields are added at the end of the endpoint request.
constants.ILS_RESPONSE_FIELDS =
  "&fields=patronType,varFields,names,addresses,emails,expirationDate";

constants.MINOR_AGE = 13;
// Field tags to access patron information in ILS
constants.BIRTHDATE_FIELD_TAG = "51";
// Barcode AND username are indexed on this tag.
constants.BARCODE_FIELD_TAG = "b";
constants.PIN_FIELD_TAG = "=";
constants.PTYPE_FIELD_TAG = "47";
constants.ADDRESS_FIELD_TAG = "a";
constants.WORK_ADDRESS_FIELD_TAG = "h";
constants.NAME_FIELD_TAG = "n";
constants.EMAIL_FIELD_TAG = "z";
constants.PATRONID_FIELD_TAG = ".";
constants.EXPIRATION_FIELD_TAG = "43";
constants.USERNAME_FIELD_TAG = "u";
constants.HOME_LIB_FIELD_TAG = "53";
constants.PATRON_AGENCY_FIELD_TAG = "158";
// ILS notifications ('p' = phone or 'z' = email)
constants.NOTICE_PREF_FIELD_TAG = "268";
constants.NOTE_FIELD_TAG = "x";
// Standard and temporary expiration times
constants.STANDARD_EXPIRATION_TIME = 1095; // days, 3 years
constants.ONE_YEAR_STANDARD_EXPIRATION_TIME = 365; // days, 1 year
constants.TEMPORARY_EXPIRATION_TIME = 30; // days
constants.WEB_APPLICANT_EXPIRATION_TIME = 90; // days
// Ptypes for various library card offerings
constants.WEB_APPLICANT_PTYPE = 1;
constants.SIMPLYE_METRO_PTYPE = 2;
constants.SIMPLYE_NON_METRO_PTYPE = 3;
constants.ADULT_METRO_PTYPE = 10;
constants.ADULT_NYS_PTYPE = 11;
constants.SENIOR_METRO_PTYPE = 20;
constants.SENIOR_NYS_PTYPE = 21;
constants.SIMPLYE_JUVENILE = 4;
constants.SIMPLYE_JUVENILE_ONLY = 5;
constants.SIMPLYE_YOUNG_ADULT = 6;
constants.WEB_DIGITAL_TEMPORARY = 7;
constants.WEB_DIGITAL_NON_METRO = 8;
constants.WEB_DIGITAL_METRO = 9;
// The following two p-types don't have a code yet.
// Using 101 for now but MUST be updated.
constants.DISABLED_METRO_NY_PTYPE = 101;
constants.HOMEBOUND_NYC_PTYPE = 101;
constants.TEEN_METRO_PTYPE = 50;
constants.TEEN_NYS_PTYPE = 51;
constants.MARLI_PTYPE = 81;
constants.REJECTED_PTYPE = 101;
constants.ILS_ERROR = "-1";
constants.PTYPE_TO_TEXT = {
  WEB_APPLICANT_PTYPE: "Web applicant (No Borrowing)",
  ADULT_METRO_PTYPE: "Adult 18-64 Metro (3 Year)",
  ADULT_NYS_PTYPE: "Adult 18-64 NY State (3 Year)",
  SENIOR_METRO_PTYPE: "Senior, 65+, Metro (3 Year)",
  SENIOR_NYS_PTYPE: "Senior, 65+, NY State (3 Year)",
  DISABLED_METRO_NY_PTYPE: "Disabled Metro NY (3 Year)",
  HOMEBOUND_NYC_PTYPE: "Homebound NYC (3 Year)",
  SIMPLYE_METRO_PTYPE: "SimplyE Metro",
  SIMPLYE_NON_METRO_PTYPE: "SimplyE Non-Metro",
  SIMPLYE_JUVENILE: "SimplyE Juvenile",
  SIMPLYE_JUVENILE_ONLY: "SimplyE Juvenile Only",
  SIMPLYE_YOUNG_ADULT: "SimplyE Young Adult",
  WEB_DIGITAL_TEMPORARY: "Web Digital Temporary",
  WEB_DIGITAL_NON_METRO: "Web Digital Non-Metro",
  WEB_DIGITAL_METRO: "Web Digital Metro",
  TEEN_METRO_PTYPE: "Teen Metro (3 Year)",
  TEEN_NYS_PTYPE: "Teen NY State (3 Year)",
  MARLI_PTYPE: "Marli",
  REJECTED_PTYPE: "Rejected",
  ILS_ERROR: "Unable to create in ILS",
};
constants.CAN_CREATE_DEPENDENTS = [
  constants.ADULT_METRO_PTYPE,
  constants.ADULT_NYS_PTYPE,
  constants.WEB_DIGITAL_NON_METRO,
  constants.WEB_DIGITAL_METRO,
  constants.SENIOR_METRO_PTYPE,
  constants.SENIOR_NYS_PTYPE,
  constants.DISABLED_METRO_NY_PTYPE,
  constants.HOMEBOUND_NYC_PTYPE,
  constants.SIMPLYE_METRO_PTYPE,
  constants.SIMPLYE_NON_METRO_PTYPE,
  constants.TEEN_METRO_PTYPE,
  constants.TEEN_NYS_PTYPE,
  constants.MARLI_PTYPE,
];
// Default values for certain fields
constants.DEFAULT_HOME_LIB = "";
constants.DEFAULT_PATRON_AGENCY = "202";
constants.DEFAULT_NOTE = `Patron's work/school address is ADDRESS2[ph].
Out-of-state home address is ADDRESS1[pa].`;
// Opt-in/out of Marketing's email subscription service:
// 's' = subscribed; '-' = not subscribed
// This needs to be sent in the patronCodes object in the pcode1 field
// { pcode1: 's' } or { pcode1: '-' }
constants.SUBSCRIBED_ECOMMUNICATIONS_PREF = "s";
constants.NOT_SUBSCRIBED_ECOMMUNICATIONS_PREF = "-";
constants.EMAIL_NOTICE_PREF = "z";
constants.PHONE_NOTICE_PREF = "p";
constants.NO_NOTICE_PREF = "-";
constants.WEB_APPLICANT_AGENCY = "198";
constants.WEB_APPLICANT_NYS_AGENCY = "199";
// Error codes
constants.NOT_FOUND = "9001";
constants.MULTIPLE_MATCHES = "9002";
// String-type marc tag
constants.STRING_MARCTAG = { "@xsi:type": "xsd:string" };
// fields that require marc tag to be set
constants.WITH_MARCTAG = ["expiration", "ptype"];

module.exports = constants;
