/**
 * strToBool
 * Helper function to convert a string with boolean values into actual
 * boolean values - values that may come from separate APIs.
 * @param {string} str
 */
const strToBool = (str) => {
  if (str === null || str === undefined || typeof str === "object") {
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
 * Normalize the format of the patron's full name to be "lastName, firstName".
 * This can be either from the `name` or the `firstName` and `lastName` request
 * inputs. If it's a single first name, just return.
 * This makes the assumption for full names that include three or
 * more names that the second name is the middle name, and anything names after
 * the second (middle) name are all last names. This is for names passed from
 * the `fullName` parameter. For names passed in the `firstName` and `lastName`
 * parameters, multiple middle names and multiple last names will be combined
 * appropriately.
 * The preferred arguments are the `firstName` and `lastName` parameters.
 *
 * For a name such as `fullName = "Albert Bart Joe Doe", the output will be
 * "Joe Doe, Albert Bart".
 * For a name such as `firstName` = "Albert Bart Claude" and
 * `lastName` = "Doe Ellis Frank", the output will be
 * "Doe Ellis Frank, Albert Bart Claude".
 * @param {string} fullName
 * @param {string} firstName
 * @param {string} lastName
 */
const normalizeName = (fullName = "", firstName = "", lastName = "") => {
  // If the request has the name in separate fields, then just combine them
  // and return them. If the client only sends a `firstName`, that's okay since
  // it'll get trimmed here.
  if (!fullName) {
    if (!lastName) {
      return firstName.trim();
    }
    return `${lastName}, ${firstName}`.trim();
  }

  // Some clients send the `fullName` in the "lastName, firstName" format and
  // we leave those alone.
  let updatedName = fullName;
  // If clients send the `fullName` in the "firstName lastName" format, then
  // we reformat the name. This also updates the name to include any middle
  // name or multiple last names. This only works if there is *one* middle name.
  if (fullName.indexOf(", ") === -1) {
    const names = fullName.split(" ");
    let first;
    let middle;
    let last;

    if (names.length >= 3) {
      // Destructure any multiple last names into one variable and join them
      // together. This catches the case where there can be multiple last names
      // assuming that the first two names are first and middle names.
      [first, middle, ...last] = names;
      updatedName = `${last.join(" ")}, ${first} ${middle}`;
    } else if (names.length === 2) {
      [first, last] = names;
      updatedName = `${last}, ${first}`;
    }
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

const nyCities = [
  "New York",
  "New York City",
  "NYC",
  "Bronx",
  "Queens",
  "Brooklyn",
  "Staten Island",
];
const nyCounties = ["Richmond", "Queens", "New York", "Kings", "Bronx"];
const nyStates = ["NY"];
const listOfStates = [
  "al",
  "ak",
  "az",
  "ar",
  "ca",
  "co",
  "ct",
  "de",
  "fl",
  "ga",
  "hi",
  "id",
  "il",
  "in",
  "ia",
  "ks",
  "ky",
  "la",
  "me",
  "md",
  "ma",
  "mi",
  "mn",
  "ms",
  "mo",
  "mt",
  "ne",
  "nv",
  "nh",
  "nj",
  "nm",
  "ny",
  "nc",
  "nd",
  "oh",
  "ok",
  "or",
  "pa",
  "ri",
  "sc",
  "sd",
  "tn",
  "tx",
  "ut",
  "vt",
  "va",
  "wa",
  "wv",
  "wi",
  "wy",
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

/**
 * Temporary update as of Jan 22, 2026.
 *
 * We will be changing the default library code for digital cards from "eb" to "vr".
 * Once the front-end is updated to send "vr" as the homeLibraryCode, we can
 * remove this mapping function.
 */
const mapEbToVr = (code) => {
  if (code === "eb") {
    return "vr";
  }
  return code;
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
  mapEbToVr,
};
