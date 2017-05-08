var modelStreamPatron = {
  data: {
    simplePatron: {
      id: '',
      barcode: '',
      name: '',
      birthdate: '',
      address: {
        line_1: '',
        line_2: '',
        city: '',
        state: '',
        zip: ''
      },
      ecommunications: '',
      username: '',
      pin: '',
      policy_type: '',
      ecommunications_pref: ''
    }
  },

  transformRequest: function(data) {
    return new Promise(function(resolve, reject) {
      if (!data.simplePatron) {
        reject('simplePatron object was not found');
      }

      for (var key in data.simplePatron) {
        if (modelStreamPatron.data.simplePatron.hasOwnProperty(key)) {
          modelStreamPatron.data.simplePatron[key] = data.simplePatron[key];
        }
      }

      resolve(modelStreamPatron.data);
    });
  }
};

module.exports = {
  modelStreamPatron
};
