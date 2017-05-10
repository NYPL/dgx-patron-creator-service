const axios = require('axios');
const _isEmpty = require('underscore').isEmpty;
const config = require('./../../config/config.js');
const ccConfig = require('./../../config/ccConfig.js');
const modelRequestBody = require('./../model/modelRequestBody.js');
const modelResponse = require('./../model/modelResponse.js');
const modelDebug = require('./../model/modelDebug.js');
const modelStreamPatron = require('./../model/modelStreamPatron.js').modelStreamPatron;
const streamPublish = require('./../helpers/streamPublish');

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
 * Render the response from Card Creator API.
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
 * It will fire a POST request to Card Creator API for creating a new patron.
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

  if (!simplePatron || _isEmpty(simplePatron)) {
    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json(modelResponse.errorResponseData(
        collectErrorResponseData(
          null,
          'invalid-request',
          'Missing required patron information.',
          null,
          { form: ['Can not find the object "simplePatron".'] }
        )
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
          debugMessage
        )
      ));

    return;
  }

  axios({
    method: 'post',
    url: config.ccBase + config.ccCreatePatron,
    data: simplePatron,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
    auth: ccConfig,
  })
    .then(response => {
      var modeledResponse = modelResponse.patronCreator(response.data, response.status);

      modelStreamPatron.transformSimplePatronRequest(req.body, modeledResponse)
        .then(function (streamPatron) {
          return streamPublish.streamPublish(
            config.patronSchemaName,
            process.env.PATRON_STREAM_NAME,
            streamPatron
          )
        })
        .then(function () {
          console.log('Published to stream successfully!');
        })
        .catch(error => {
          console.error('Error publishing to stream: ' + error);
        });

      renderResponse(req, res, 201, modeledResponse);
    })
    .catch(response => {
      console.error(
        `status_code: ${response.response.status}, ` +
        `type: "invalid-request", ` +
        `message: "${response.message} from NYPL Simplified Card Creator.", ` +
        `response: ${JSON.stringify(response.response.data)}`
      );

      if (response.response && response.response.data) {
        const responseObject = collectErrorResponseData(
          response.response.status,
          response.response.data.type,
          response.response.data.detail,
          response.response.data.title,
          response.response.data.debug_message
        );

        const statusCode = (responseObject.status) ? responseObject.status : 500;

        renderResponse(
          req,
          res,
          statusCode,
          modelResponse.errorResponseData(responseObject)
        );
      } else {
        renderResponse(req, res, 500, modelResponse.errorResponseData(
          collectErrorResponseData(null, '', '', '', '')
        ));
      }
    });
}

module.exports = {
  createPatron,
};
