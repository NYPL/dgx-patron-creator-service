const _filter = require('underscore').filter;
const _isEmpty = require('underscore').isEmpty;

/**
 * checkMissingRequiredField(array)
 * Checks if any required field is empty, and returns a list.
 *
 * @param {array} array
 * @return array
 */
function checkMissingRequiredField(array) {
  return _filter(array, element => (!element.value || _isEmpty(element.value)));
}

/**
 * renderDebugMessage(missingFields)
 * Renders the debug message object based on the missing required fields.
 *
 * @param {missingFields} array
 * @return object
 */
function renderMissingFieldDebugMessage(missingFields) {
  const debugMessage = {};

  if (missingFields && missingFields.length) {
    missingFields.forEach(element => {
      debugMessage[element.name] = [];
      debugMessage[element.name].push(`Missing ${element.name}.`);
    });
  }

  return debugMessage;
}

module.exports = {
  checkMissingRequiredField,
  renderMissingFieldDebugMessage,
};
