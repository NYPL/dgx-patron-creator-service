const logger = require("./Logger");

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
  return res
    .status(status)
    .header("Content-Type", "application/json")
    .json(message);
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
   * collectErrorResponseData(status, type, message, title)
   * Generates the response model for a failed request. It will already have
   * the routeTag set for all calls to the logger.
   *
   * @param {number} status
   * @param {string} type
   * @param {string} message
   * @param {string} title
   * @return {object}
   */
  return function collectErrorResponseData({
    status,
    type,
    title,
    message,
    // to support older clients expecting these values:
    name,
    displayMessageToClient,
  }) {
    logger.error(
      `status: ${status}, type: ${type}, title: ${title}, detail: ${message}, routeTag: ${routeTag}`
    );

    const response = {
      status: status || 500,
      type: type || "",
      title: title || "",
      // The internal error `message` gets displayed as `detail`.
      detail: message || "Something went wrong - no message passed.",
    };

    if (name) {
      response.name = name;
    }
    // But if some clients need the `message` attribute, then use that as well.
    if (displayMessageToClient) {
      response.message = message;
    }

    return response;
  };
}

module.exports = {
  renderResponse,
  errorResponseDataWithTag,
};
