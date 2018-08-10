const modelStreamPatron = {
  // These are default values to publish to the stream
  data: {
    id: '',
    names: [],
    barcodes: [],
    expirationDate: '',
    birthDate: '',
    emails: [],
    pin: null,
    patronType: null,
    patronCodes: null,
    blockInfo: null,
    addresses: null,
    phones: null,
  },
  /**
   * Transform the request into the StreamPatron data model
   * @param {object} data
   * @param {object} modeledResponse
   * @return {Promise}
   */
  transformPatronRequest(requestBody, modeledResponse) {
    return new Promise((resolve, reject) => {
      const mergedPatronData = Object.assign({}, requestBody, modeledResponse);
      for (var key in mergedPatronData) {
        if (modelStreamPatron.data.hasOwnProperty(key)) {
          modelStreamPatron.data[key] = mergedPatronData[key];
        }
      }
      modelStreamPatron.data.patronCodes.pcode4 = 0; // TODO: remove once pcode4 is not deleted in v0.2 of createPatron
      resolve(modelStreamPatron.data);
    });
  },
};

module.exports = {
  modelStreamPatron,
};
