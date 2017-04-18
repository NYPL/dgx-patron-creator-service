const axios = require('axios');
const ccConfig = require('./../../config/ccConfig.js');
const ccAPIConfig = require('./../../config/ccAPIConfig.js');
const modelResponse = require('./../model/modelResponse.js');

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
      console.log(response.response.data);

      const responseMessage = {
        status: response.response.data.status,
        type: response.response.data.type,
        message: response.response.data.detail,
        title: response.response.data.title,
        debug_message: response.response.data.debug_message,
      };

      renderResponse(req, res, modelResponse.errorResponse(responseMessage));
    });
}

module.exports = {
  createPatron,
};
