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
    patronCodes: {
      pcode1: null,
      pcode2: null,
      pcode3: null,
      pcode4: null,
    },
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
      resolve(modelStreamPatron.data);
    });
  },
};

module.exports = {
  modelStreamPatron,
};
