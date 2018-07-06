const axios = require('axios');
const isEmpty = require('underscore').isEmpty;
const awsDecrypt = require('./../../../config/awsDecrypt.js');
const modelRequestBody = require('./../../models/v0.2/modelRequestBody.js');
const modelResponse = require('./../../models/v0.2/modelResponse.js');
const modelDebug = require('./../../models/v0.2/modelDebug.js');
const modelStreamPatron = require('./../../models/v0.2/modelStreamPatron.js').modelStreamPatron;
const streamPublish = require('./../../helpers/streamPublish');

const tempData = {
    names: [
        "USER, TEST"
    ],
    barcodes: [
        "ABCD"
    ],
    expirationDate: "2019-01-01",
    birthDate: "1978-01-01",
    emails: [
        "test@test.com"
    ],
    patronType: 10,
    patronCodes: {
        pcode1: "s",
        pcode2: "f",
        pcode3: 5
    },
    blockInfo: {
        code: "-"
    },
    addresses: [{
        lines: [
            ADDRESS LINE 1,
            ADDRESS LINE 2
        ],
        type: "a"
    }],
    phones: [{
        number: "917-123-4567",
        type: "t"
    }]
}

let clientKey;
let clientPassword;

/**
 * collectErrorResponseData(status, type, message, title, debugMessage)
 * Model the response from a failed request.
 *
 * @param {number} status
 * @param {string} type
 * @param {string} message
 * @param {string} title
 * @param {string} debugMessage
 * @return {object}
 */
function collectErrorResponseData(status, type, message, title, debugMessage) {
  return {
    status: status || null,
    type: type || '',
    message: message || '',
    title: title || '',
    debug_message: debugMessage || '',
  };
}

/**
 * renderResponse(req, res, status, message)
 * Render the response from the ILS API.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {number} status
 * @param {object} message
 */
function renderResponse(req, res, status, message) {
  res
    .status(status)
    .header('Content-Type', 'application/json')
    .json(message);
}

/**
 * createPatron(req, res)
 * The callback for the route "/patrons".
 * It will fire a POST request to the ILS API for creating a new patron.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function createPatron(req, res) {
  const simplePatron = modelRequestBody.modelSimplePatron(req.body);
  const requiredFields = [
    { name: 'name', value: simplePatron.name },
    { name: 'birthdate', value: simplePatron.birthdate },
    { name: 'address', value: simplePatron.address },
    { name: 'username', value: simplePatron.username },
    { name: 'pin', value: simplePatron.pin },
  ];

  if (!simplePatron || isEmpty(simplePatron)) {
    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json(modelResponse.errorResponseData(
        collectErrorResponseData(
          null,
          'invalid-request',
          'Missing required patron information.',
          null,
          { form: ['Can not find the object "simplePatron".'] },
        ),
      ));

    return;
  }

  // Check if we get all the required information from the client
  const missingFields = modelDebug.checkMissingRequiredField(requiredFields);

  if (missingFields.length) {
    const debugMessage = modelDebug.renderMissingFieldDebugMessage(missingFields);

    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json(modelResponse.errorResponseData(
        collectErrorResponseData(
          null,
          'invalid-request',
          'Missing required patron information.',
          null,
          debugMessage,
        ),
      ));

    return;
  }


  clientKey = clientKey ||
    awsDecrypt.decryptKMS(process.env.ILS_CLIENT_KEY);
  clientPassword = clientPassword ||
    awsDecrypt.decryptKMS(process.env.ILS_CLIENT_SECRET);

  Promise.all([clientKey, clientPassword]).then((values) => {
    [clientKey, clientPassword] = values;

    axios({
      method: 'post',
      url: process.env.ILS_CREATE_PATRON_URL,
      data: tempData, //generalPatron,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      auth: { client_key: clientKey, client_secret: clientPassword },
    })
      .then((response) => {
        const modeledResponse = modelResponse.patronCreator(response.data, response.status);
        modelStreamPatron.transformSimplePatronRequest(
          req.body, modeledResponse,
        )
          .then(streamPatron => streamPublish.streamPublish(
            process.env.PATRON_SCHEMA_NAME,
            process.env.PATRON_STREAM_NAME,
            streamPatron,
          ))
          .then(() => {
            renderResponse(req, res, 201, modeledResponse);
            console.log('Published to stream successfully!'); // eslint-disable-line no-console
          })
          .catch((error) => {
            renderResponse(req, res, 201, modeledResponse);
            console.error(`Error publishing to stream: ${error}`); // eslint-disable-line no-console
          });
      })
      .catch((response) => {
        // eslint-disable-next-line no-console
        console.error(
          `status_code: ${response.response.status}, ` +
          'type: "invalid-request", ' +
          `message: "${response.message} from ILS.", ` +
          `response: ${JSON.stringify(response.response.data)}`,
        );

        if (response.response && response.response.data) {
          const responseObject = collectErrorResponseData(
            response.response.status,
            response.response.data.type,
            response.response.data.detail,
            response.response.data.title,
            response.response.data.debug_message,
          );

          const statusCode = (responseObject.status) ? responseObject.status : 500;

          renderResponse(
            req,
            res,
            statusCode,
            modelResponse.errorResponseData(responseObject),
          );
        } else {
          renderResponse(req, res, 500, modelResponse.errorResponseData(
            collectErrorResponseData(null, '', '', '', ''),
          ));
        }
      });
  });
}

module.exports = {
  createPatron,
};
