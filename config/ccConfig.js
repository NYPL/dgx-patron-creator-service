// The credentials for NYPL's Simplified Card Creator API
require('dotenv').config();

const aws = require('aws-sdk');
let decryptKMS;
let kms;

kms = new aws.KMS({
  region: 'us-east-1',
});

decryptKMS = (key) => {
  const params = {
    CiphertextBlob: new Buffer(key, 'base64'),
  };

  return new Promise((resolve, reject) => {
    kms.decrypt(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Plaintext.toString());
      }
    });
  });
};

module.exports = {
  username: decryptKMS(process.env.CARD_CREATOR_USERNAME),
  password: decryptKMS(process.env.CARD_CREATOR_PASSWORD)
};
