// These are default values to publish to the stream
const defaultData = {
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
  varFields: null,
  fixedFields: null,
  homeLibraryCode: null,
};

const modelStreamPatron = {
  /**
   * Transform the request into the StreamPatron data model
   * @param {object} modeledResponse
   * @return {Promise}
   */
  transformPatronRequest(modeledResponse) {
    return new Promise((resolve) => {
      // Create a new object from the default for every request.
      const data = { ...defaultData };
      Object.keys(modeledResponse).forEach((key) => {
        // Then merge the values in if they exist.
        data[key] = modeledResponse[key];
      });
      resolve(data);
    });
  },
};

module.exports = modelStreamPatron;
