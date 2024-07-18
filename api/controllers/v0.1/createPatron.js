/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
const axios = require("axios");
const isEmpty = require("underscore").isEmpty;
const awsDecrypt = require("./../../../config/awsDecrypt.js");
const modelRequestBody = require("./../../models/v0.1/modelRequestBody.js");
const modelResponse = require("./../../models/v0.1/modelResponse.js");
const modelDebug = require("./../../models/v0.1/modelDebug.js");
const modelStreamPatron = require("./../../models/v0.1/modelStreamPatron.js")
  .modelStreamPatron;
const streamPublish = require("./../../helpers/streamPublish");
const logger = require("../../helpers/Logger");

const ROUTE_TAG = "CREATE_PATRON_0.1";

let cardCreatorUsername;
let cardCreatorPassword;

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
  logger.error(
    `status_code: ${status}, ` +
      `type: ${type}, ` +
      `message: ${message}, ` +
      `response: ${debugMessage}`,
    { routeTag: ROUTE_TAG } // eslint-disable-line comma-dangle
  );

  return {
    status: status || null,
    type: type || "",
    message: message || "",
    title: title || "",
    debug_message: debugMessage || "",
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
  res.status(status).header("Content-Type", "application/json").json(message);
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
    { name: "name", value: simplePatron.name },
    { name: "birthdate", value: simplePatron.birthdate },
    { name: "address", value: simplePatron.address },
    { name: "username", value: simplePatron.username },
    { name: "pin", value: simplePatron.pin },
  ];

  if (!simplePatron || isEmpty(simplePatron)) {
    res
      .status(400)
      .header("Content-Type", "application/json")
      .json(
        modelResponse.errorResponseData(
          collectErrorResponseData(
            null,
            "invalid-request",
            "Missing required patron information.",
            null,
            { form: ['Can not find the object "simplePatron".'] } // eslint-disable-line comma-dangle
          ) // eslint-disable-line comma-dangle
        )
      );

    return;
  }

  // Check if we get all the required information from the client
  const missingFields = modelDebug.checkMissingRequiredField(requiredFields);

  if (missingFields.length) {
    const debugMessage = modelDebug.renderMissingFieldDebugMessage(
      missingFields
    );

    res
      .status(400)
      .header("Content-Type", "application/json")
      .json(
        modelResponse.errorResponseData(
          collectErrorResponseData(
            null,
            "invalid-request",
            "Missing required patron information.",
            null,
            debugMessage // eslint-disable-line comma-dangle
          ) // eslint-disable-line comma-dangle
        )
      );

    return;
  }

  cardCreatorUsername =
    cardCreatorUsername ||
    awsDecrypt.decryptKMS(process.env.CARD_CREATOR_USERNAME);
  cardCreatorPassword =
    cardCreatorPassword ||
    awsDecrypt.decryptKMS(process.env.CARD_CREATOR_PASSWORD);

  Promise.all([cardCreatorUsername, cardCreatorPassword]).then((values) => {
    [cardCreatorUsername, cardCreatorPassword] = values;

    axios({
      method: "post",
      url: process.env.CARD_CREATOR_BASE_URL + process.env.CARD_CREATOR_PATH,
      data: simplePatron,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
      auth: { username: cardCreatorUsername, password: cardCreatorPassword },
    })
      .then((response) => {
        const modeledResponse = modelResponse.patronCreator(
          response.data,
          response.status
        );
        modelStreamPatron
          .transformSimplePatronRequest(
            req.body,
            modeledResponse // eslint-disable-line comma-dangle
          )
          .then((streamPatron) => {
            // eslint-disable-line arrow-body-style
            // `return` is necessary below, to wait for streamPublish to complete
            return streamPublish.streamPublish(
              process.env.PATRON_SCHEMA_NAME_V01,
              process.env.PATRON_STREAM_NAME_V01,
              streamPatron // eslint-disable-line comma-dangle
            );
          })
          .then(() => {
            renderResponse(req, res, 201, modeledResponse);
            logger.debug("Published to stream successfully!", {
              routeTag: ROUTE_TAG,
            });
          })
          .catch((error) => {
            renderResponse(req, res, 201, modeledResponse);
            logger.error(
              `Error publishing to stream.\n modeledResponse: ${JSON.stringify(
                modeledResponse
              )}\n ${JSON.stringify(error)}\n`,
              { routeTag: ROUTE_TAG } // eslint-disable-line comma-dangle
            );
          });
      })
      .catch((response) => {
        // eslint-disable-next-line no-console
        console.error(
          `status_code: ${response.response.status}, ` +
            'type: "invalid-request", ' +
            `message: "${response.message} from NYPL Simplified Card Creator.", ` +
            `response: ${JSON.stringify(response.response.data)}` // eslint-disable-line comma-dangle
        );

        if (response.response && response.response.data) {
          const responseObject = collectErrorResponseData(
            response.response.status,
            response.response.data.type,
            response.response.data.detail,
            response.response.data.title,
            response.response.data.debug_message // eslint-disable-line comma-dangle
          );

          renderResponse(
            req,
            res,
            responseObject.status || 500,
            modelResponse.errorResponseData(responseObject) // eslint-disable-line comma-dangle
          );
        } else {
          renderResponse(
            req,
            res,
            response.response.status,
            modelResponse.errorResponseData(
              collectErrorResponseData(
                response.response.status,
                "",
                "",
                "",
                `${response.message} from NYPL Simplified Card Creator.`
              ) // eslint-disable-line comma-dangle
            )
          );
        }
      });
  });
}

module.exports = {
  createPatron,
};
