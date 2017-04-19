const axios = require('axios');
const _isEmpty = require('underscore').isEmpty;
const ccConfig = require('./../../config/ccConfig.js');
const ccAPIConfig = require('./../../config/ccAPIConfig.js');
const modelResponse = require('./../model/modelResponse.js');

/**
 * collectErrorResponseData(status, type, message, title, debugMessage)
 * Model the response from a failed request.
 *
 * @param {status} number
 * @param {type} string
 * @param {message} string
 * @param {title} string
 * @param {debugMessage} string
 * @return object
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
 * renderResponse(req, res, message)
 * Render the response from Card Creator API.
 *
 * @param {req} HTTP request
 * @param {res} HTTP response
 * @param {message} object
 */
function renderResponse(req, res, message) {
  res
    .status(200)
    .header('Content-Type', 'application/json')
    .json(message);
}

/**
 * checkRequiredMissing(array)
 * Checks if any required field is empty, and returns a list.
 *
 * @param {array} array
 * @return array
 */
function checkRequiredMissing(array) {
  const missingFields = [];

  array.forEach(element => {
    if (!element.value || _isEmpty(element.value)) {
      missingFields.push({ name: element.name, value: `Missing ${element.name}.`, });
    }
  });

  return missingFields;
}

/**
 * createPatron(req, res)
 * The callback for the route "/patrons".
 * It will fire a POST request to Card Creator API for creating a new patron.
 *
 * @param {req} HTTP request
 * @param {res} HTTP response
 */
function createPatron(req, res) {
  const requiredFields = [
    { name: "name", value: req.body.name, },
    { name: "address", value: req.body.address, },
    { name: "username", value: req.body.username, },
    { name: "pin", value: req.body.pin, },
  ];

  // Check if we get all the required information from the client
  if (checkRequiredMissing(requiredFields).length > 0) {
    const debugMessageSet = {
      name: [],
      address: [],
      username: [],
      pin: [],
    };

    checkRequiredMissing(requiredFields).forEach(element => {
      if (element.value) {
        debugMessageSet[element.name].push(element.value);
      }
    });

    const debugMessage = {
      name: (debugMessageSet.name.length > 0) ? debugMessageSete.name : undefined,
      address: (debugMessageSet.address.length > 0) ? debugMessageSet.address : undefined,
      username: (debugMessageSet.username.length > 0) ? debugMessageSet.username : undefined,
      pin: (debugMessageSet.pin.length > 0) ? debugMessageSet.pin : undefined,
    };

    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json({
        data: {
          status_code_from_card_creator: null,
          type: 'invalid-request',
          patron: null,
          simplePatron: null,
          message: 'Missing required patron information.',
          detail: {
            debug: debugMessage,
          },
          count: 0,
        },
      });

    return;
  }

  axios({
    method: 'post',
    url: ccAPIConfig.base + ccAPIConfig.createPatron,
    data: req.body,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
    auth: ccConfig,
  })
    .then(response => {
      renderResponse(req, res, modelResponse.patronCreator(response.data, response.status));
    })
    .catch(response => {
      if (response.response && response.response.data) {
        const responseObject = collectErrorResponseData(
          response.response.data.status,
          response.response.data.type,
          response.response.data.detail,
          response.response.data.title,
          response.response.data.debug_message
        );

        renderResponse(req, res, modelResponse.errorResponse(responseObject));
      } else {
        renderResponse(req, res, modelResponse.errorResponse(
          collectErrorResponseData(null, '', '', '', '')
        ));
      }
    });
}

module.exports = {
  createPatron,
  renderResponse,
};
