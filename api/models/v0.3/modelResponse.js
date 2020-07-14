const url = require('url');

/**
 * patronResponse(data)
 * Model the patron data object into an object with default empty values if
 * the needed values are not available. This is because the Kinesis stream only
 * accepts a specific Avro schema and will fail if the values are not there,
 * or are of the wrong type.
 *
 * @param {object} data
 */
function patronResponse(data) {
  return {
    id: data.patronId,
    names: data.names || [],
    barcodes: data.barcodes || [],
    expirationDate: data.expirationDate || '',
    birthDate: data.birthDate || '',
    emails: data.emails || [],
    pin: data.pin || '',
    patronType: data.patronType || '',
    patronCodes: data.patronCodes || {
      pcode1: null,
      pcode2: null,
      pcode3: null,
      pcode4: null,
    },
    addresses: data.addresses || [],
    phones: data.phones || [],
    blockInfo: data.blockInfo || null,
    varFields: data.varFields || [],
    fixedFields: data.fixedFields || [],
    homeLibraryCode: data.homeLibraryCode || '',
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
 * errorResponseData(obj)
 * Model the error response from creating a new patron.
 *
 * @param {object} obj
 * @return {object}
 */
function errorResponseData(obj) {
  return {
    status: obj.status || null,
    type: obj && obj.type ? parseTypeURL(obj.type) : '',
    message: obj.message,
    detail: obj.debugMessage ? parseJSON(obj.debugMessage) : {},
  };
}

module.exports = {
  patronResponse,
  errorResponseData,
};
