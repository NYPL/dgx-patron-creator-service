/* eslint no-console: "off" */
const axios = require('axios');
const _isEmpty = require('underscore').isEmpty; // eslint-disable-line no-underscore-dangle
const modelResponse = require('../../models/v0.1/modelValidations.js');
const awsDecrypt = require('../../../config/awsDecrypt.js');

const usernameEndpoint = 'validate/username';
const addressEndpoint = 'validate/address';

let cardCreatorUsername;
let cardCreatorPassword;

/**
 * renderResponseData(statusCode, valid, type, cardType, message, detail)
 * Model the generic responses.
 *
 * @param {number} statusCode
 * @param {boolean} valid
 * @param {string} type
 * @param {string} cardType
 * @param {string} message
 * @param {object} detail
 * @return {object}
 */
function renderResponseData(
  statusCode,
  valid,
  type,
  cardType,
  message,
  detail,
) {
  return {
    data: {
      status_code_from_card_creator: statusCode || null,
      valid: valid || false,
      type: type || '',
      // return null here as a fallback to match Card Creator's fallback
      card_type: cardType || null,
      message: message || '',
      detail: detail || {},
    },
  };
}

/**
 * collectErrorResponseData(status, message, title, debugMessage)
 * Model the response from a failed request.
 *
 * @param {number} status
 * @param {string} message
 * @param {string} title
 * @param {string} debugMessage
 * @return {object}
 */
function collectErrorResponseData(status, message, title, debugMessage) {
  return {
    status: status || null,
    message: message || '',
    detail: {
      title: title || '',
      debug: debugMessage || '',
    },
  };
}

/**
 * renderResponse(req, res, message)
 * Render the response from Card Creator API.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {object} message
 */
function renderResponse(req, res, message) {
  res.status(200).header('Content-Type', 'application/json').json(message);
}

/**
 * renderErrorResponse(req, res, status, messageObject)
 * Render the error response from Card Creator API.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {number} status
 * @param {object} messageObject
 */
function renderErrorResponse(req, res, status, messageObject) {
  res
    .status(status)
    .header('Content-Type', 'application/json')
    .json(
      renderResponseData(
        messageObject.status,
        false,
        'internal-server-error',
        null,
        `${messageObject.message} from NYPL's Simplified Card Creator.`,
        messageObject.detail,
      ),
    );
}

/**
 * checkUserName(req, res)
 * The callback for the route "/username".
 * It will fire a POST request to Card Creator API for user name validation.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function checkUserName(req, res) {
  // Check if the user name field has valid input
  if (!req.body.username) {
    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json(
        renderResponseData(
          null,
          false,
          'invalid-request',
          null,
          'No username value.',
          {},
        ),
      );

    return;
  }

  cardCreatorUsername = cardCreatorUsername
    || awsDecrypt.decryptKMS(process.env.CARD_CREATOR_USERNAME);
  cardCreatorPassword = cardCreatorPassword
    || awsDecrypt.decryptKMS(process.env.CARD_CREATOR_PASSWORD);

  Promise.all([cardCreatorUsername, cardCreatorPassword]).then((values) => {
    [cardCreatorUsername, cardCreatorPassword] = values;

    axios({
      method: 'post',
      url: process.env.CARD_CREATOR_BASE_URL + usernameEndpoint,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      auth: { username: cardCreatorUsername, password: cardCreatorPassword },
    })
      .then((response) => {
        renderResponse(
          req,
          res,
          modelResponse.username(response.data, response.status),
        );
      })
      .catch((response) => {
        console.error(
          `status_code: ${response.response.status}, `
            + 'type: "invalid-request", '
            + `message: "${response.message} from NYPL Simplified Card Creator.", `
            + `response: ${JSON.stringify(response.response.data)}`,
        );

        if (response.response && response.response.data) {
          const responseObject = collectErrorResponseData(
            response.response.status,
            response.response.data.detail,
            response.response.data.title,
            response.response.data.debug_message,
          );
          const statusCode = responseObject.status
            ? responseObject.status
            : 500;

          renderErrorResponse(req, res, statusCode, responseObject);
        } else {
          renderErrorResponse(
            req,
            res,
            500,
            collectErrorResponseData(null, '', '', ''),
          );
        }
      });
  });
}

/**
 * checkAddress(req, res)
 * The callback for the route "/address".
 * It will fire a POST request to Card Creator API for address validation.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function checkAddress(req, res) {
  // Check if the address field has valid input
  if (!req.body.address || _isEmpty(req.body.address)) {
    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json(
        renderResponseData(
          null,
          false,
          'invalid-request',
          null,
          'No address value.',
          {},
        ),
      );

    return;
  }

  cardCreatorUsername = cardCreatorUsername
    || awsDecrypt.decryptKMS(process.env.CARD_CREATOR_USERNAME);
  cardCreatorPassword = cardCreatorPassword
    || awsDecrypt.decryptKMS(process.env.CARD_CREATOR_PASSWORD);

  Promise.all([cardCreatorUsername, cardCreatorPassword]).then((values) => {
    [cardCreatorUsername, cardCreatorPassword] = values;

    axios({
      method: 'post',
      url: process.env.CARD_CREATOR_BASE_URL + addressEndpoint,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      auth: { username: cardCreatorUsername, password: cardCreatorPassword },
    })
      .then((response) => {
        renderResponse(
          req,
          res,
          modelResponse.address(response.data, response.status),
        );
      })
      .catch((response) => {
        console.error(
          `status_code: ${response.response.status}, `
            + 'type: "invalid-request", '
            + `message: "${response.message} from NYPL Simplified Card Creator.", `
            + `response: ${JSON.stringify(response.response.data)}`,
        );

        if (response.response && response.response.data) {
          const responseObject = collectErrorResponseData(
            response.response.status,
            response.response.data.detail,
            response.response.data.title,
            response.response.data.debug_message,
          );
          const statusCode = responseObject.status
            ? responseObject.status
            : 500;

          renderErrorResponse(req, res, statusCode, responseObject);
        } else {
          renderErrorResponse(
            req,
            res,
            500,
            collectErrorResponseData(null, '', '', ''),
          );
        }
      });
  });
}

module.exports = {
  checkUserName,
  checkAddress,
  renderResponseData,
};
