const express = require('express');
const bodyParser = require('body-parser');

// Import controllers
const createPatronV0_1 = require('./api/controllers/v0.1/createPatron.js'); // eslint-disable-line camelcase
const validations = require('./api/controllers/v0.1/validations.js');
const createPatronV0_2 = require('./api/controllers/v0.2/createPatron.js'); // eslint-disable-line camelcase
const apiDoc = require('./api/controllers/apiDoc.js');
const createPatronV0_3 = require('./api/controllers/v0.3/endpoints.js'); // eslint-disable-line camelcase

const app = express();
const pathName = `${process.cwd()}/config/deploy_${app.get('env')}.env`;
require('dotenv').config({ path: pathName });

const BarcodeDb = require('./db');

// Initialize the connection to the database.
// This is done here so we can have one instance and one connection to the
// database for however many times the lambda is used for.
const db = BarcodeDb({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
// Once we get the database class instance, initialize it by creating the
// table and inserting the seed data if it's not in the database already.
db.init();

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
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  );

  next();
}

// Support CORS
app.use(allowCrossDomain);
// The parser for interpret JSON in req.body
app.use(bodyParser.json());
// The parser for interpret URL parameters
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

// Below are the middlewares for response body

/**
 * v1Error(err, req)
 * Format the response for errors on v0.1 routes
 *
 * @param {error object} err
 * @param {HTTP request} req
 */
// eslint-disable-next-line no-unused-vars
function v1Error(err, req) {
  return {
    data: {
      status_code_from_card_creator: null,
      status: err.status,
      type: 'invalid-request',
      message: `Request body: ${err.body}`,
      detail: 'The patron creator did not forward the request to Card Creator.',
    },
    count: 0,
  };
}

/**
 * v2Error(err, req)
 * Format the response for errors on v0.2 routes
 *
 * @param {error object} err
 * @param {HTTP request} req
 */
// eslint-disable-next-line no-unused-vars
function v2Error(err, req) {
  return {
    status_code_from_card_ils: null,
    status: err.status,
    type: 'invalid-request',
    message: `Request body: ${err.body}`,
    detail: 'The patron creator did not forward the request to the ILS.',
  };
}

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
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(
    `status_code: ${err.status}, `
      + 'type: "invalid-request", '
      + `message: "Request body: ${err.body}"` // eslint-disable-line comma-dangle
  );
  let jsonError;

  if (req.url.includes('v0.1')) {
    if (req.url.includes('validations')) {
      jsonError = validations.renderResponseData(
        null,
        false,
        'invalid-request',
        null,
        `Error request with request body ${err.body}`,
        {},
      );
    } else {
      jsonError = v1Error(err, req);
    }
  } else if (req.url.includes('v0.2')) {
    jsonError = v2Error(err, req);
  }

  res.status(err.status).json(jsonError);
}

// Error handling
app.use(errorHandler);

// Below are the routes
const router = express.Router();

// This route will make a request for swaggerDoc.json
app.get('/docs/patrons-validations', apiDoc.renderApiDoc);

app.use('/api', router);

router.route('/v0.1/patrons/').post(createPatronV0_1.createPatron);
// Still supporting older v0.1 validation endpoints
router.route('/v0.1/validations/username').post(validations.checkUserName);
router.route('/v0.1/validations/address').post(validations.checkAddress);

// New validation will be part of the `patrons` endpoint.
router.route('/v0.2/patrons/').post(createPatronV0_2.createPatron);

// Still supporting older v0.1 validation endpoints
router.route('/v0.3/validations/username').post(createPatronV0_3.checkUsername);
// router.route('/v0.3/validations/address').post(createPatronV0_3.checkAddress);
router
  .route('/v0.3/patrons/dependent-eligibility')
  .get(createPatronV0_3.checkDependentEligibility);
router.route('/v0.3/patrons/').post(createPatronV0_3.createPatron);

// Do not listen to connections in Lambda environment
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.info(`Server started on port ${port}`); // eslint-disable-line no-console
  });
}

module.exports = app;
