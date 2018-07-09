const url = require('url');

/**
 * modelPatronCreatorResponse(data, status)
 * Model the response from creating a new patron.
 *
 * @param {object} data
 * @param {number} status
 * @return {object}
 */
function modelPatronCreatorResponse(data, status) {
  console.log('************* modelPatronCreatorResponse ***************');
  console.log(status);
  console.log(data);
  const detail = (data && data.debug_info) ? JSON.parse(data.debug_info) : {};

  return {
    data: {
      simplePatron: {
        status_code_from_ils: status || null,
        type: data.type || null,
        username: data.username || '',
        temporary: data.temporary || false,
        patron_id: data.patron_id || '',
        barcode: data.barcode || '',
        message: data.message || '',
        detail,
      },
      patron: {},
    },
    count: 1,
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
      simplePatron: {
        status_code_from_ils: obj.status || null,
        type: (obj && obj.type) ? parseTypeURL(obj.type) : '',
        message: obj.message,
        detail: {
          title: obj.title || '',
          debug: (obj.debug_message) ? parseJSON(obj.debug_message) : {},
        },
      },
      patron: null,
    },
    count: 0,
  };
}

module.exports = {
  patronCreator: modelPatronCreatorResponse,
  errorResponseData: modelErrorResponseData,
};
