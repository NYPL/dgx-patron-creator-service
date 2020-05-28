const logger = require('./Logger');

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
  res.status(status).header('Content-Type', 'application/json').json(message);
}

/**
 * errorResponseDataWithTag(routeTag)
 * Returns a function with the `routeTag` param set for all subsequent calls.
 * The returned function then generates the response model for a failed request.
 *
 * @param {string} routeTag
 * @return {object}
 */
function errorResponseDataWithTag(routeTag) {
  /**
   * collectErrorResponseData(status, type, message, title, debugMessage)
   * Generates the response model for a failed request. It will already have
   * the routeTag set for all calls to the logger.
   *
   * @param {number} status
   * @param {string} type
   * @param {string} message
   * @param {string} title
   * @param {string} debugMessage
   * @return {object}
   */
  return function collectErrorResponseData(
    status,
    type,
    message,
    title,
    debugMessage,
  ) {
    logger.error(
      `status_code: ${status}, `
        + `type: ${type}, `
        + `message: ${message}, `
        + `response: ${debugMessage}`,
      { routeTag },
    );

    return {
      status: status || null,
      type: type || '',
      message: message || '',
      title: title || '',
      debugMessage: debugMessage || '',
    };
  };
}

module.exports = {
  renderResponse,
  errorResponseDataWithTag,
};
