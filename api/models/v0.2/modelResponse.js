const url = require('url');
const logger = require('../../helpers/Logger');

const ROUTE_TAG = 'CREATE_PATRON_0.2';

/**
 * modelPatronCreatorResponse(data, status)
 * Model the response from creating a new patron.
 *
 * @param {object} data
 * @param {number} status
 * @return {object}
 */
function modelPatronCreatorResponse(responseData, status, requestData) {
  let idFromResponse;
  try {
    idFromResponse = parseInt(responseData.link.split('/').pop(), 10);
  } catch (error) {
    idFromResponse = null;
    const message = 'The ILS response is missing an ID.';
    logger.error(
      "status_code: '', " +
      'type: ils_error, ' +
      `message: ${message}, ` +
      `response: ${responseData.link}`,
      { routeTag: ROUTE_TAG } // eslint-disable-line comma-dangle
    );
  }
  return {
    id: idFromResponse,
    names: requestData.names || [],
    barcodes: requestData.barcodes || [],
    expirationDate: requestData.expirationDate || '',
    birthDate: requestData.birthDate || '',
    emails: requestData.emails || [],
    pin: requestData.pin || '',
    patronType: requestData.patronType || '',
    patronCodes: requestData.patronCodes || {
      pcode1: null,
      pcode2: null,
      pcode3: null,
      pcode4: null,
    },
    blockInfo: requestData.blockInfo || null,
    addresses: requestData.addresses || [],
    phones: requestData.phones || [],
  };
}

/**
 * parseJSON(str)
 * The "debug_message" of an error response could be a JSON type string.
 * This function is to parse the string back to its original JSON format.
 *
 * @param {string} str
 * @return {object}
 */
function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

/**
 * parseTypeURL(str)
 * The "type" of an error response could be a URL with the error type slug.
 * This function is to extract the slug out of the URL.
 *
 * @param {string} str
 * @return {string}
 */
function parseTypeURL(str) {
  try {
    const typeURL = url.parse(str);

    return typeURL.pathname.split('/').pop();
  } catch (e) {
    return str;
  }
}

/**
 * modelErrorResponse(obj)
 * Model the error response from creating a new patron.
 *
 * @param {object} obj
 * @return {object}
 */
function modelErrorResponseData(obj) {
  return {
    status_code_from_ils: obj.status || null,
    type: (obj && obj.type) ? parseTypeURL(obj.type) : '',
    message: obj.message,
    detail: {
      title: obj.title || '',
      debug: (obj.debug_message) ? parseJSON(obj.debug_message) : {},
    }
  };
}

module.exports = {
  patronCreator: modelPatronCreatorResponse,
  errorResponseData: modelErrorResponseData,
};
