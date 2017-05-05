const axios = require('axios');
const Promise = require('promise');
const avsc = require('avsc')
const crypto = require('crypto');

var AWS = require('aws-sdk');
var kinesisClient = new AWS.Kinesis();

function getSchema(schemaName) {
  return new Promise(function(resolve, reject) {
    axios({
      method: 'get',
      url: process.env.SCHEMA_API_BASE_URL + '/' + schemaName
    })
      .then(response => {
        resolve(response.data.data.schemaObject);
      })
      .catch(response => {
        reject('Error retreiving schema: ' + response);
      });
  });
}

function createAvroSchema(schema) {
  return new Promise(function(resolve, reject) {
    var avroSchema = avsc.Type.forSchema(schema);

    if (avroSchema) {
      resolve(avroSchema);
    }

    reject('Unable to parse Avro schema');
  });
}

function getAvroData(avroSchema, data) {
  return new Promise(function(resolve, reject) {
    var avroData = avroSchema.toBuffer(data);

    if (avroData) {
      resolve(avroData);
    }

    reject('Unable to get Avro data');
  });
}

function publishStream(streamName, data) {
  return new Promise(function(resolve, reject) {
    var params = {
      Data: data,
      PartitionKey: crypto.randomBytes(20).toString('hex').toString(),
      StreamName: streamName
    };

    var kinesis = kinesis = new AWS.Kinesis({region: 'us-east-1'});

    kinesis.putRecord(params, function(err, data) {
      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
}

function streamPublish(schemaName, streamName, data, callback) {
  return new Promise(function(resolve, reject) {
    if (!streamName) reject('streamName is missing')
    if (!data) reject('data is missing')

    getSchema(schemaName)
      .then(function (schema) {
        return createAvroSchema(schema);
      })
      .then(function (avroSchema) {
        return getAvroData(avroSchema, data);
      })
      .then(function (avroData) {
        resolve(publishStream(streamName, avroData));
      })
      .catch(response => {
        reject(response);
      });
  })

}

module.exports = {
  streamPublish: streamPublish
};