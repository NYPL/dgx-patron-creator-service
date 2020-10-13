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
    expirationDate: data.expirationDate || "",
    birthDate: data.birthDate || "",
    emails: data.emails || [],
    pin: data.pin || "",
    patronType: data.patronType || "",
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
    homeLibraryCode: data.homeLibraryCode || "",
  };
}

module.exports = {
  patronResponse,
};
