const _isEmpty = require('underscore').isEmpty;

/**
 * checkMissingRequiredField(array)
 * Checks if any required field is empty, and returns a list.
 *
 * @param {array} array
 * @return array
 */
function checkMissingRequiredField(array) {
  const missingFields = [];

  array.forEach(element => {
    if (!element.value || _isEmpty(element.value)) {
      missingFields.push({ name: element.name, value: `Missing ${element.name}.` });
    }
  });

  return missingFields;
}

/**
 * renderDebugMessage(missingFields)
 * Renders the debug message object based on the missing required fields.
 *
 * @param {missingFields} array
 * @return object
 */
function renderDebugMessage(missingFields) {
  const debugMessage = {};

  if (missingFields && missingFields.length > 0) {
    missingFields.forEach(element => {
      debugMessage[element.name] = [];
      debugMessage[element.name].push(element.value);
    });
  }

  return debugMessage;
}

module.exports = {
  checkMissingRequiredField,
  renderDebugMessage,
};
