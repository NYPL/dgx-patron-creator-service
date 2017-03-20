/**
 * createPatron(req, res, next)
 * Post one item to the database.
 * The content type should be JSON.
 *
 * @param {req} HTTP request
 * @param {res} HTTP response
 * @param {next}
 */
function createPatron(req, res, next) {
  var user_name=req.body.user;
  var password=req.body.password;

  res.send(req.body);
  console.log('A new patron is created!');
}

module.exports = {
  createPatron: createPatron,
};
