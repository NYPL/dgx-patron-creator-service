/**
 * extractSimplePatron(obj)
 * Gets the item "simplePatron" out of the original request body from the client.
 *
 * @param {object} obj
 * @return {object}
 */
function extractSimplePatron(obj) {
  if (obj && obj.simplePatron) {
    return obj.simplePatron;
  }

  return {};
}

/**
 * updateDateOfBirthToBirthdate(obj)
 * Replaces the item "dateOfBirth" by creating a new item "birthdate" and deleting "dateOfBirth".
 *
 * @param {object} obj
 * @return {object}
 */
function updateDateOfBirthToBirthdate(obj) {
  // Assignes a new object here to prevent the airbnb eslint rule:
  // Reassignment of Function Parameters (no-param-reassign)
  const newObj = obj;

  if (newObj && newObj.dateOfBirth) {
    newObj.birthdate = newObj.dateOfBirth;
  }

  delete newObj.dateOfBirth;
  return newObj;
}

/**
 * addMissingPolicyType(obj)
 * Checks if the policy_type is set. If not, use the default type "web_applicant".
 *
 * @param {object} obj
 * @return {object}
 */
function addMissingPolicyType(obj) {
  // Assignes a new object here to prevent the airbnb eslint rule:
  // Reassignment of Function Parameters (no-param-reassign)
  const newObj = obj;

  newObj.policy_type = (newObj.policy_type) ? newObj.policy_type : 'web_applicant';

  return newObj;
}

/**
 * modelSimplePatron(obj)
 * Takes the original request.body from the client and models it for the Card Creartor.
 *
 * @param {object} obj
 * @return {object}
 */
function modelSimplePatron(obj) {
  const modeledSimplePatron =
    addMissingPolicyType(
      updateDateOfBirthToBirthdate(
        extractSimplePatron(obj)
      )
    );

  return modeledSimplePatron;
}

module.exports = {
  modelSimplePatron,
};
