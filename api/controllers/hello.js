/**
 * renderHello(req, res, next)
 *
 * @param {req} HTTP request
 * @param {res} HTTP response
 * @param {next}
 */
function renderHello(req, res, next) {
  res.status(200)
    .send(
      "<h1>Hello! Welcome to NYPL Patron Creator Service. " +
      "For the API doc, visit <a href=\"/docs\">" +
      "http://localhost:3001/docs</a></h1>"
    );
}

module.exports = {
  renderHello: renderHello,
};
