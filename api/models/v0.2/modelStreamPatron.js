const modelStreamPatron = {
  data: {
    simplePatron: {
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
  transformSimplePatronRequest(data, modeledResponse) {
    return new Promise((resolve, reject) => {
      if (!data.simplePatron) {
        reject(new Error('simplePatron object was not found'));
      }

      if (!modeledResponse.data.simplePatron) {
        reject(new Error('modeledResponse simplePatron object was not found'));
      }

      const simplePatron = Object.assign(
        {}, data.simplePatron, modeledResponse.data.simplePatron);

      for (const key in simplePatron) {
        if (modelStreamPatron.data.simplePatron.hasOwnProperty(key)) {
          modelStreamPatron.data.simplePatron[key] = simplePatron[key];
        }
      }

      resolve(modelStreamPatron.data);
    });
  },
};

module.exports = {
  modelStreamPatron,
};
