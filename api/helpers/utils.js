/**
 * strToBool
 * Helper function to convert a string with boolean values into actual
 * boolean values - values that may come from separate APIs.
 * @param {string} str
 */
const strToBool = (str) => {
  if (!str) {
    return false;
  }

  // If the value is already a boolean, just return it.
  if (typeof str === "boolean") {
    return str;
  }

  const vals = ["true", "false"];
  const valsHash = { true: true, false: false };
  let found = "";
  // First check if the boolean string is in the passed in string.
  vals.forEach((val) => {
    if (str.toLowerCase().includes(val)) {
      found = val;
    }
  });
  // Otherwise, just use the passed in string.
  return valsHash[found || str.toLowerCase()];
};

/**
 * normalizeName
 * Normalize the format of the patron's full name to be "firstName lastName".
 * This can be either from the `name` or the `firstName` and `lastName` request
 * input.
 * @param {string} fullName
 * @param {string} firstName
 * @param {string} lastName
 */
const normalizeName = (fullName = "", firstName = "", lastName = "") => {
  // If the request has the name in separate fields, then just combine them
  // and return them. If the client only sends a `firstName`, that's okay since
  // it'll get trimmed here.
  if (!fullName) {
    return `${firstName} ${lastName}`.trim();
  }

  // If clients send the `fullName` in the "firstName lastName" format, then
  // we're done because it's the format we want. Some clients may send only
  // the first name in `fullName`.
  let updatedName = fullName;
  // But some clients send the `fullName` in the "lastName, firstName" format.
  // This covers that case by normalizing the string to be "firstName lastName".
  if (fullName.indexOf(", ") !== -1) {
    const [last, first] = fullName.split(", ");
    updatedName = `${first} ${last}`;
  }

  return updatedName;
};

/**
 * updateJuvenileName
 * Update the juvenile's name in case no last name was passed with the
 * parent's ILS last name. The ILS returns names in an array called `names`.
 * @param {string} name
 * @param {array} parentArrayName
 */
const updateJuvenileName = (name, parentArrayName = []) => {
  const parentsName = parentArrayName[0];
  // If there's no parent name, then just return the name for the child.
  if (!parentsName) {
    return name;
  }

  let updatedName = name;
  // If there's no last name, then use the parent's last name. This is a very
  // basic check that is done by checking if there is a space in the complete
  // name. There is no separation of first or last name so this is the best
  // way to do it for now. There's no check to see if the parent's last name
  // is already in the child's name because it's possible for children to have
  // a different last name than their parents' last name. The ILS stores names
  // as "LASTNAME, FIRSTNAME" so we need the first value when we split the
  // string.
  if (updatedName.indexOf(" ") === -1) {
    const parentsLastName = parentsName.split(", ")[0];
    updatedName = `${name} ${parentsLastName}`;
  }

  return updatedName;
};

const nyCities = ["New York", "New York City", "NYC"];
const nyCounties = ["Richmond", "Queens", "New York", "Kings", "Bronx"];
const nyStates = ["NY", "New York"];
const listOfStates = [
  "Alabama",
  "Alaska",
  "American Samoa",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Federated States of Micronesia",
  "Florida",
  "Georgia",
  "Guam",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Marshall Islands",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Northern Mariana Islands",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Palau",
  "Pennsylvania",
  "Puerto Rico",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virgin Island",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

/**
 * lowerCaseArray
 * Make all values in a string array lowercase.
 */
const lowerCaseArray = (arr) => arr.map((item) => item.toLowerCase());

/**
 * normalizedBirthdate(birthdate)
 * Convert a MM/DD/YYYY date string to a Date object.
 */
const normalizedBirthdate = (birthdate) => {
  if (birthdate) {
    return new Date(birthdate);
  }
  return;
};

module.exports = {
  strToBool,
  normalizeName,
  updateJuvenileName,
  lowerCaseArray,
  allowedCities: lowerCaseArray(nyCities),
  allowedCounties: lowerCaseArray(nyCounties),
  allowedStates: lowerCaseArray(nyStates),
  allStates: lowerCaseArray(listOfStates),
  normalizedBirthdate,
};
