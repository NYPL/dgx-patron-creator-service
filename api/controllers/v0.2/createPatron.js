const axios = require('axios');
const isEmpty = require('underscore').isEmpty;
const awsDecrypt = require('./../../../config/awsDecrypt.js');
const modelResponse = require('./../../models/v0.2/modelResponse.js');
const modelDebug = require('./../../models/v0.2/modelDebug.js');
const modelStreamPatron = require('./../../models/v0.2/modelStreamPatron.js').modelStreamPatron;
const streamPublish = require('./../../helpers/streamPublish');
const logger = require('../../helpers/Logger')

const ROUTE_TAG = "CREATE_PATRON_20";


function base64(string) {
  return Buffer.from(string).toString('base64');
}

let ilsClientKey;
let ilsClientPassword;

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
  if (!process.env.ILS_CREATE_TOKEN_URL || isEmpty(process.env.ILS_CREATE_TOKEN_URL)) {
    res
      .status(500)
      .header('Content-Type', 'application/json')
      .json(modelResponse.errorResponseData(
        collectErrorResponseData(
          null,
          'invalid-request',
          'The create-patron service is missing the ILS_CREATE_TOKEN_URL.',
          null,
          { form: ['The create-patron service is misconfigured.'] } // eslint-disable-line comma-dangle
        ) // eslint-disable-line comma-dangle
      ));

    return;
  }

  if (!process.env.ILS_CREATE_PATRON_URL || isEmpty(process.env.ILS_CREATE_PATRON_URL)) {
    res
      .status(500)
      .header('Content-Type', 'application/json')
      .json(modelResponse.errorResponseData(
        collectErrorResponseData(
          null,
          'invalid-request',
          'The create-patron service is missing the ILS_CREATE_PATRON_URL.',
          null,
          { form: ['The create-patron service is misconfigured.'] } // eslint-disable-line comma-dangle
        ) // eslint-disable-line comma-dangle
      ));

    return;
  }

  const patronData = req.body;

  // eslint-disable-next-line max-len
  // Delete pcode4 data to prevent an error on Sierra TODO: remove this line once pcode4 is accepted; also remove related line in v0.2 modelStreamPatron.js
  delete patronData.patronCodes.pcode4;

  const requiredFields = [];

  if (!patronData || isEmpty(patronData)) {
    res
      .status(400)
      .header('Content-Type', 'application/json')
      .json(modelResponse.errorResponseData(
        collectErrorResponseData(
          null,
          'invalid-request',
          'Missing required patron information.',
          null,
          { form: ['Patron data appears to be blank.'] } // eslint-disable-line comma-dangle
        ) // eslint-disable-line comma-dangle
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
          debugMessage // eslint-disable-line comma-dangle
        ) // eslint-disable-line comma-dangle
      ));

    return;
  }

  ilsClientKey = ilsClientKey || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_KEY);
  ilsClientPassword = ilsClientPassword || awsDecrypt.decryptKMS(process.env.ILS_CLIENT_SECRET);

  Promise.all([ilsClientKey, ilsClientPassword]).then((values, reject) => {
    [ilsClientKey, ilsClientPassword] = values;

    const username = ilsClientKey;
    const password = ilsClientPassword;
    const basicAuth = `Basic ${base64(`${username}:${password}`)}`;

    axios.post(process.env.ILS_CREATE_TOKEN_URL, {}, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: basicAuth,
      },
    })
      .then((tokenResponse) => {
        if (!tokenResponse.data || !tokenResponse.data.access_token) {
          reject();
        }
        axios.post(process.env.ILS_CREATE_PATRON_URL, patronData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        })
          .then((response) => {
            const modeledResponse =
              modelResponse.patronCreator(response.data, response.status, patronData);
            modelStreamPatron.transformPatronRequest(
              req.body, modeledResponse // eslint-disable-line comma-dangle
            )
              .then((streamPatron) => {
                streamPublish.streamPublish(
                  process.env.PATRON_SCHEMA_NAME_V02,
                  process.env.PATRON_STREAM_NAME_V02,
                  streamPatron // eslint-disable-line comma-dangle
                ).then((streamResponse) => { // eslint-disable-line no-unused-vars
                  renderResponse(req, res, 201, modeledResponse);
                  logger.debug('Published to stream successfully!', {routeTag: ROUTE_TAG});
                }).catch((streamError) => {
                  renderResponse(req, res, 201, streamError);
                  logger.error(`Error publishing to stream: ${streamError}`, {routeTag: ROUTE_TAG});
                });
              })
              .catch((error) => {
                renderResponse(req, res, 201, modeledResponse);
                logger.error(`Error creating patron: ${error}`, {routeTag: ROUTE_TAG});
              });
          })
          .catch((response) => {
            logger.error(
              `status_code: ${response.response.status}, ` +
              'type: "invalid-request", ' +
              `message: "${response.message} from ILS.", ` +
              `response: ${JSON.stringify(response.response.data)}`,
              {routeTag: ROUTE_TAG} // eslint-disable-line comma-dangle
            );

            if (response.response && response.response.data) {
              const responseObject = collectErrorResponseData(
                response.response.status,
                response.response.data.type,
                response.response.data.detail,
                response.response.data.title,
                response.response.data.debug_message // eslint-disable-line comma-dangle
              );

              const statusCode = (responseObject.status) ? responseObject.status : 500;

              renderResponse(
                req,
                res,
                statusCode,
                modelResponse.errorResponseData(responseObject) // eslint-disable-line comma-dangle
              );
            } else {
              renderResponse(req, res, 500, modelResponse.errorResponseData(
                collectErrorResponseData(null, '', '', '', '') // eslint-disable-line comma-dangle
              ));
            }
          });
      });
  });
}

module.exports = {
  createPatron,
};
