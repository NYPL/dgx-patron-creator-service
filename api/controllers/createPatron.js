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

  console.log(req.body);
  res.status(200)
    .json({
      status: 'success',
      message: 'A new patron is created!'
    });
}

module.exports = {
  createPatron: createPatron,
};
