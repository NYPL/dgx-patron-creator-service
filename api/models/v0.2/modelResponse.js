const url = require('url');

/**
 * modelPatronCreatorResponse(data, status)
 * Model the response from creating a new patron.
 *
 * @param {object} data
 * @param {number} status
 * @return {object}
 */
function modelPatronCreatorResponse(responseData, status, requestData) {
  return {
    data: [
      {
        id: parseInt(responseData.link.split('/').pop(), 10),
        names: requestData.names,
        barcodes: requestData.barcodes,
        expirationDate: '',
        birthDate: requestData.birthDate,
        emails: requestData.emails,
        pin: requestData.pin,
        patronType: parseInt(requestData.patronType, 10),
        patronCodes: requestData.patronCodes,
        blockInfo: requestData.blockInfo,
        addresses: requestData.addresses,
        phones: requestData.phones,
      },
    ],
    count: 1,
    totalCount: 0,
    statusCode: status,
    debugInfo: [],
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
    data: {
      status_code_from_ils: obj.status || null,
      type: (obj && obj.type) ? parseTypeURL(obj.type) : '',
      message: obj.message,
      detail: {
        title: obj.title || '',
        debug: (obj.debug_message) ? parseJSON(obj.debug_message) : {},
      },
    }
  };
}

module.exports = {
  patronCreator: modelPatronCreatorResponse,
  errorResponseData: modelErrorResponseData,
};
