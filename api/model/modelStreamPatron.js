var modelStreamPatron = {
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
        zip: ''
      },
      username: '',
      pin: '',
      policy_type: '',
      ecommunications_pref: ''
    }
  },

  /**
   * Transform the request into the StreamPatron data model
   * @param {object} data
   * @param {object} modeledResponse
   * @return {Promise}
   */
  transformSimplePatronRequest: function(data, modeledResponse) {
    return new Promise(function(resolve, reject) {
      if (!data.simplePatron) {
        reject('simplePatron object was not found');
      }

      if (!modeledResponse.data.simplePatron) {
        reject('modeledResponse simplePatron object was not found');
      }

      var simplePatron = Object.assign({}, data.simplePatron, modeledResponse.data.simplePatron);

      for (var key in simplePatron) {
        if (modelStreamPatron.data.simplePatron.hasOwnProperty(key)) {
          modelStreamPatron.data.simplePatron[key] = simplePatron[key];
        }
      }

      resolve(modelStreamPatron.data);
    });
  }
};

module.exports = {
  modelStreamPatron
};
