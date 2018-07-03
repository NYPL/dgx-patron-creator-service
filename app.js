const SwaggerExpress = require('swagger-express-mw');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const pathName = process.cwd() + '/config/deploy_' + app.get('env') + '.env';
require('dotenv').config({ path: pathName });

// The module for generating the swagger document
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
// Import controllers
const createPatron = require('./api/controllers/createPatron.js');
const apiDoc = require('./api/controllers/apiDoc.js');

// Below are the middlewares for response headers

/**
 * allowCrossDomain(req, res, next)
 * Set up the middleware to support CORS. It will be used in every response.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {next}
 */
function allowCrossDomain(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  next();
}

// Support CORS
app.use(allowCrossDomain);
// The parser for interpret JSON in req.body
app.use(bodyParser.json());
// The parser for interpret URL parameters
app.use(bodyParser.urlencoded({
  extended: true,
}));

// Below are the middlewares for response body

/**
 * errorHandler(err, req, res, next)
 * Rendering the error response if the request to this service fails.
 * We need "next" here as the forth argument following the Express's convention
 *
 * @param {error object} err
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {next}
 */
function errorHandler(err, req, res, next) {
  console.error(
    `status_code: ${err.status}, ` +
    `type: "invalid-request", ` +
    `message: "error request with ${err.body}"`
  );

  res
    .status(err.status)
    .json({
      data: {
        simplePatron: {
          status_code_from_card_creator: null,
          type: 'invalid-request',
          message: `Error request with request body ${err.body}`,
          detail: {},
        },
        patron: null,
      },
      count: 0,
    });
}

// Error handling
app.use(errorHandler);

// This route will make a request for swaggerDoc.json
// If you don't have it yet, check README.md for how to generate one based on swagger.yaml
app.get('/docs/patron-creator', apiDoc.renderApiDoc);

// Below are routes
const router = express.Router();

app.use('/api/v0.1/patrons', router);

router.route('/')
  .post(createPatron.createPatron);

// required config
const config = {
  appRoot: __dirname,
};

SwaggerExpress.create(config, (err, swaggerExpress) => {
  if (err) { throw err; }

  // To generate a swagger doc page
  // After running the server, go to http://localhost:3001/docs
  app.use(SwaggerUi(swaggerExpress.runner.swagger));

  // install middleware
  swaggerExpress.register(app);
});

// Do not listen to connections in Lambda environment
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const port = process.env.PORT || 3001;

  app.listen(port);
}

module.exports = app;
