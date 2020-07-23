/**
 * strToBool(str)
 * Helper function to convert a string with boolean values into actual
 * boolean values - values that may come from separate APIs.
 *
 * @param {string} str
 */
const strToBool = (str) => {
  if (!str) {
    return false;
  }

  // If the value is already a boolean, just return it.
  if (typeof str === 'boolean') {
    return str;
  }

  const vals = ['true', 'false'];
  const valsHash = { true: true, false: false };
  let found = '';
  // First check if the boolean string is in the passed in string.
  vals.forEach((val) => {
    if (str.toLowerCase().includes(val)) {
      found = val;
    }
  });
  // Otherwise, just use the passed in string.
  return valsHash[found || str.toLowerCase()];
};

module.exports = {
  strToBool,
};
