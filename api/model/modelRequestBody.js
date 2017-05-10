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
  if (obj && obj.dateOfBirth) {
    obj.birthdate = obj.dateOfBirth;
  }

  delete obj.dateOfBirth;
  return obj;
}

/**
 * addMissingPolicyType(obj)
 * Checks if the policy_type is set. If not, use the default type "web_applicant".
 *
 * @param {object} obj
 * @return {object}
 */
function addMissingPolicyType(obj) {
  obj.policy_type = (obj.policy_type) ? obj.policy_type : 'web_applicant';

  return obj;
}

/**
 * convertEcommunicationsValue(obj)
 * Converts ecommunications_pref's value from true/false to 's'/'-'.
 *
 * @param {object} obj
 * @return {object}
 */
function convertEcommunicationsValue(obj) {
  obj.ecommunications_pref = (obj.ecommunications_pref) ? 's' : '-';

  return obj;
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
    convertEcommunicationsValue(
      addMissingPolicyType(
        updateDateOfBirthToBirthdate(
          extractSimplePatron(obj)
        )
      )
    );

  return modeledSimplePatron;
}

module.exports = {
  modelSimplePatron,
};
