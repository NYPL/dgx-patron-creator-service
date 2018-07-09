const axios = require('axios');
const Promise = require('promise');
const avsc = require('avsc');
const crypto = require('crypto');
const AWS = require('aws-sdk');

const kinesisClient = new AWS.Kinesis({ region: 'us-east-1' });

/**
 * Retreive the Schema from the Schema API
 * @param {string} schemaName
 * @return {*|Promise}
 */
function getSchema(schemaName) {
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: `${process.env.SCHEMA_API_BASE_URL}/${schemaName}`,
    })
      .then((response) => {
        resolve(response.data.data.schemaObject);
      })
      .catch((response) => {
        reject(new Error(`Error retreiving schema: ${response}`));
      });
  });
}

/**
 * Transform the Schema object into an Avro Schema object
 * @param {object} schema
 * @return {*|Promise}
 */
function createAvroSchemaObject(schema) {
  return new Promise((resolve, reject) => {
    const avroSchema = avsc.Type.forSchema(schema);

    if (avroSchema) {
      resolve(avroSchema);
    }

    reject(new Error('Unable to parse Avro schema'));
  });
}

/**
 * Encode the data into Avro format
 * @param {object} avroSchema
 * @param {object} data
 * @return {*|Promise}
 */
function encodeToAvroData(avroSchema, data) {
  return new Promise((resolve, reject) => {
    const avroData = avroSchema.toBuffer(data);

    if (avroData) {
      resolve(avroData);
    }

    reject(new Error('Unable to get Avro data'));
  });
}

/**
 * Publish the Avro data to a Kinesis Stream
 * @param {string} streamName
 * @param {object} avroData
 * @return {*|Promise}
 */
function publishStream(streamName, avroData) {
  return new Promise((resolve, reject) => {
    const params = {
      Data: avroData,
      PartitionKey: crypto.randomBytes(20).toString('hex').toString(),
      StreamName: streamName,
    };

    kinesisClient.putRecord(params, (err, data) => {
      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
}

/**
 * Publish data to a Kinesis Stream
 * @param {strong} schemaName
 * @param {strong} streamName
 * @param {object} streamData
 * @return {*|Promise}
 */
function streamPublish(schemaName, streamName, streamData) {
  return new Promise((resolve, reject) => {
    if (!streamName) reject(new Error('streamName is missing'));
    if (!streamData) reject(new Error('data is missing'));

    getSchema(schemaName)
      .then(schema => createAvroSchemaObject(schema))
      .then(avroSchema => encodeToAvroData(avroSchema, streamData))
      .then(avroData => resolve(publishStream(streamName, avroData)))
      .catch((response) => {
        console.error(response); // eslint-disable-line no-console
        reject(response);
      });
  });
}

module.exports = {
  streamPublish
};
