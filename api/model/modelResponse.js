const url = require("url");

/**
 * modelPatronCreatorResponse(data, status)
 * Model the response from creating a new patron.
 *
 * @param {data} object
 * @param {status} number
 * @return object
 */
function modelPatronCreatorResponse(data, status) {
  const detail = (data && data.debug_info) ? JSON.parse(data.debug_info) : {};

  return {
    data: {
      status_code_from_card_creator: status || null,
      patron: {},
      simplePatron: {
        type: data.type || null,
        username: data.username || '',
        temporary: data.temporary || false,
      },
      message: data.message || '',
      detail,
      count: 1,
    },
  };
}

/**
 * parseJSON(str)
 * The "debug_message" of an error response could be a JSON type string.
 * This function is to parse the string back to its original JSON format.
 *
 * @param {str} string
 * @return object
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
 * @param {str} string
 * @return string
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
 * @param {obj} object
 * @return object
 */
function modelErrorResponse(obj) {
  return {
    data: {
      status_code_from_card_creator: obj.status || null,
      type: (obj && obj.type) ? parseTypeURL(obj.type) : '',
      patron: null,
      simplePatron: null,
      message: obj.message,
      detail: {
        title: obj.title || '',
        debug: (obj.debug_message) ? parseJSON(obj.debug_message) : {},
      },
      count: 0,
    },
  };
}

module.exports = {
  patronCreator: modelPatronCreatorResponse,
  errorResponse: modelErrorResponse,
};
