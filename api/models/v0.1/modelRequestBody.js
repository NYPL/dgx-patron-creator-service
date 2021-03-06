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
  if (obj && obj.dateOfBirth && typeof obj.dateOfBirth === 'string') {
    obj.birthdate = obj.dateOfBirth; // eslint-disable-line no-param-reassign
  } else {
    obj.birthdate = ''; // eslint-disable-line no-param-reassign
  }

  delete obj.dateOfBirth; // eslint-disable-line no-param-reassign
  return obj;
}

/**
 * addMissingPolicyType(obj)
 * Checks if the policy_type is set. If not, uses the default type "web_applicant".
 *
 * @param {object} obj
 * @return {object}
 */
function addMissingPolicyType(obj) {
  // eslint-disable-next-line no-param-reassign
  obj.policy_type = (obj.policy_type && typeof obj.policy_type === 'string') ?
    obj.policy_type : 'web_applicant';

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
  // eslint-disable-next-line no-param-reassign
  obj.ecommunications_pref =
    (obj.ecommunications_pref && typeof obj.ecommunications_pref === 'boolean') ? 's' : '-';

  return obj;
}

/**
 * addMissingPatronAgency(obj)
 * Checks if the patron_agency is set. If not, uses the default value "198".
 * Currently we have two kinds of patron_agency. "198" is for NYC residents,
 * and "199" is for NYS residents who live outside of the city.
 *
 * @param {object} obj
 * @return {object}
 */
function addMissingPatronAgency(obj) {
  // eslint-disable-next-line no-param-reassign
  obj.patron_agency = (obj.patron_agency && typeof obj.patron_agency === 'string') ?
    obj.patron_agency : '198';

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
    addMissingPatronAgency(
      convertEcommunicationsValue(
        addMissingPolicyType(
          updateDateOfBirthToBirthdate(
            extractSimplePatron(obj) // eslint-disable-line comma-dangle
          ) // eslint-disable-line comma-dangle
        ) // eslint-disable-line comma-dangle
      ) // eslint-disable-line comma-dangle
    );

  return modeledSimplePatron;
}

module.exports = {
  modelSimplePatron,
};
