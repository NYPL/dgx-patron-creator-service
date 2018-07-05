const modelStreamPatron = {
  data: {
    generalPatron: {
      patron_id: '',
      barcode: '',
      name: '',
      email: '',
      birthdate: '',
      address: {
        line_1: '',
        line_2: '',
        city: '',
        state: '',
        zip: '',
      },
      username: '',
      pin: '',
      policy_type: '',
      ecommunications_pref: '',
      patron_agency: '',
    },
  },

  /**
   * Transform the request into the StreamPatron data model
   * @param {object} data
   * @param {object} modeledResponse
   * @return {Promise}
   */
  transformGeneralPatronRequest(data, modeledResponse) {
    return new Promise((resolve, reject) => {
      if (!data.generalPatron) {
        reject(new Error('generalPatron object was not found'));
      }

      if (!modeledResponse.data.generalPatron) {
        reject(new Error('modeledResponse generalPatron object was not found'));
      }

      const generalPatron = Object.assign(
        {}, data.generalPatron, modeledResponse.data.generalPatron);

      for (const key in generalPatron) {
        if (modelStreamPatron.data.generalPatron.hasOwnProperty(key)) {
          modelStreamPatron.data.generalPatron[key] = generalPatron[key];
        }
      }

      resolve(modelStreamPatron.data);
    });
  },
};

module.exports = {
  modelStreamPatron,
};
