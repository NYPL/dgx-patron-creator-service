const axios = require('axios');
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
 * createPatron(req, res)
 * The callback for the route "/patrons".
 * It will fire a POST request to Card Creator API for creating a new patron.
 *
 * @param {req} HTTP request
 * @param {res} HTTP response
 */
function createPatron(req, res) {
  // Check if the user name field has valid input
  if (!req.body.username) {
    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json({
        status_code: 400,
        type: 'error_type',
        message: 'No username',
        error: {},
        debug_info: {},
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
};
