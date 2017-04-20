/**
 * extractSimplePatron(obj)
 * Gets the item "simplePatron" out of the original request body from the client.
 *
 * @param {obj} object
 * @return object
 */
function extractSimplePatron(obj) {
  if (obj && obj.simplePatron) {
    return obj.simplePatron;
  }

  return {};
  // here should return error response
}

/**
 * updateDateOfBirthToBirthdate(obj)
 * Replaces the item "dateOfBirth" by creating a new item "birthdate" and deleting "dateOfBirth".
 *
 * @param {obj} object
 * @return object
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
 * modelSimplePatron(obj)
 * Takes the original request.body from the client and models it for the Card Creartor.
 *
 * @param {obj} object
 * @return object
 */
function modelSimplePatron(obj) {
  return updateDateOfBirthToBirthdate(extractSimplePatron(obj));
}

module.exports = {
  modelSimplePatron,
};
