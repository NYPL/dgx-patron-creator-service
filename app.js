const express = require("express");
const bodyParser = require("body-parser");
const awsDecrypt = require("./config/awsDecrypt");

// Import controllers
const apiDoc = require("./api/controllers/apiDoc.js");
const createPatronV0_2 = require("./api/controllers/v0.2/createPatron.js");
const createPatronV0_3 = require("./api/controllers/v0.3/endpoints.js");

const BarcodeDb = require("./db");

const app = express();
const pathName = `${process.cwd()}/config/${app.get("env")}.env`;
require("dotenv").config({ path: pathName });

// Decrypt any database credentials if on QA or production for the NYPL AWS
// environment. Then create the single database instance in the app.
async function initDatabase() {
  let dbUser;
  let dbHost;
  let dbPassword;
  if (process.env.NODE_ENV === "development") {
    dbUser = process.env.DB_USER;
    dbHost = process.env.DB_HOST;
    dbPassword = process.env.DB_PASSWORD;
  } else {
    dbUser = await awsDecrypt.decryptKMS(process.env.DB_USER);
    dbHost = await awsDecrypt.decryptKMS(process.env.DB_HOST);
    dbPassword = await awsDecrypt.decryptKMS(process.env.DB_PASSWORD);
  }

  // Initialize the connection to the database.
  // This is done here so we can have one instance and one connection to the
  // database for however many times the lambda is used for.
  const db = BarcodeDb({
    user: dbUser,
    host: dbHost,
    password: dbPassword,
    // These are constant and don't need to be encrypted or decrypted.
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
  });
  // Once we get the database class instance, initialize it by creating the
  // table and inserting the seed data if it's not in the database already.
  db.init();
}

initDatabase();

/**
 * allowCrossDomain
 * Set up the middleware to support CORS. It will be used in every response.
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {next}
 */
function allowCrossDomain(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
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
  })
);

/**
 * deprecatedEndpoint
 * For deprecated endpoints, send a note to use the v0.3 endpoints.
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function deprecatedEndpoint(req, res) {
  return res.status(400).header("Content-Type", "application/json").json({
    status: 400,
    type: "deprecated-endpoint",
    title: "Deprecated Endpoint",
    detail:
      "This endpoint is deprecated. Use the v0.3 endpoints and find more information on https://github.com/NYPL/dgx-patron-creator-service/wiki",
  });
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
    type: "invalid-request",
    message: `Request body: ${err.body}`,
    detail: "The patron creator did not forward the request to the ILS.",
  };
}

/**
 * errorHandler
 * Rendering the error response if the request to this service fails.
 * We need "next" here as the forth argument following the Express's convention
 * @param {error object} err
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function errorHandler(err, req, res, next) {
  console.error(
    `status_code: ${err.status}, ` +
      // eslint-disable-next-line quotes
      'type: "invalid-request", ' +
      // eslint-disable-next-line prettier/prettier
      +`message: "Request body: ${err.body}"`
  );
  let jsonError;

  if (req.url.includes("v0.2")) {
    jsonError = v2Error(err, req);
  }

  res.status(err.status).json(jsonError);

  next();
}

// Error handling
app.use(errorHandler);

const router = express.Router();

// This route will make a request for swaggerDoc.json
app.get("/docs/patrons-validations", apiDoc.renderApiDoc);

// The base of the endpoints.
app.use("/api", router);

// These endpoints are now deprecated. Send a note
router.route("/v0.1/patrons/").post(deprecatedEndpoint);
router.route("/v0.1/validations/username").post(deprecatedEndpoint);
router.route("/v0.1/validations/address").post(deprecatedEndpoint);
// New validation will be part of the `patrons` endpoint.
router.route("/v0.2/patrons/").post(createPatronV0_2.createPatron);

// The new validation endpoints.
router.route("/v0.3/validations/username").post(createPatronV0_3.checkUsername);
router.route("/v0.3/validations/address").post(createPatronV0_3.checkAddress);
// Check if a patron is eligible to create dependent juvenile accounts.
router
  .route("/v0.3/patrons/dependent-eligibility")
  .get(createPatronV0_3.checkDependentEligibility);
// Endpoints to create ILS accounts.
router.route("/v0.3/patrons/dependents").post(createPatronV0_3.createDependent);
router.route("/v0.3/patrons/").post(createPatronV0_3.createPatron);

// Do not listen to connections in the Lambda environment.
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.info(`Server started on port ${port}`);
  });
}

module.exports = app;
