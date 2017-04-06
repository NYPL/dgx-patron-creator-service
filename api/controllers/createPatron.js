'use strict';

var axios = require('axios');
var ccConfig = require('./../../config/ccConfig.js');

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
        "status_code": 400,
        "type": "error_type",
        "message": "No username",
        "error": {},
        "debug_info": {}
      });

    return;
  }

  axios({
    method: 'post',
    url: 'http://qa.patrons.librarysimplified.org//v1/create_patron',
    data: req.body,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
    auth: ccConfig,
  })
    .then(response => {
      renderResponse(req, res, response.data);
    })
    .catch(response => {
      let responseMessage = {
        "status_code": response.status,
        "type": "error_type",
        "message": response.message,
        "error": {},
        "debug_info": {}
      }
      renderResponse(req, res, responseMessage);
    });
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

module.exports = {
  createPatron: createPatron,
};

