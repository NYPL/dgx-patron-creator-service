function extractSimplePatron(data) {
  if(data && data.simplePatron) {
    return data.simplePatron;
  }

  return {};
  // here should return error response
}

function updateDateOfBirthToBirthdate(object) {
  if (object && object.dateOfBirth) {
    object.birthdate = object.dateOfBirth;
  }

  delete object.dateOfBirth;
  return object;
}

function modelSimplePatron(data) {
  return updateDateOfBirthToBirthdate(extractSimplePatron(data));
}

module.exports = {
  modelSimplePatron,
};
