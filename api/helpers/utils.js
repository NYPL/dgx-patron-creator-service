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
 * updateJuvenileName
 * Update the juvenile's name in case no last named was passed with the
 * parent's last name. The ILS returns names in an array called `names`.
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
  // a different last name than their parents' last name.
  if (name.indexOf(" ") === -1) {
    const parentsLastName = parentsName.split(" ")[1];
    updatedName = `${name} ${parentsLastName}`;
  }

  return updatedName;
};

module.exports = {
  strToBool,
  updateJuvenileName,
};
