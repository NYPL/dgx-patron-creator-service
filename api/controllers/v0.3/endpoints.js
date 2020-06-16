/* eslint-disable */
const modelResponse = require("../../models/v0.3/modelResponse");
const UsernameValidationAPI = require("./UsernameValidationAPI");
const AddressValidationAPI = require("./AddressValidationAPI");
const axios = require("axios");
const awsDecrypt = require("./../../../config/awsDecrypt.js");
const IlsClient = require("./IlsClient");
const modelStreamPatron = require("./../../models/v0.2/modelStreamPatron.js")
  .modelStreamPatron;
const streamPublish = require("./../../helpers/streamPublish");
const logger = require("../../helpers/Logger");
const encode = require("../../helpers/encode");
const Address = require("../../models/v0.3/modelAddress");
const { Card } = require("../../models/v0.3/modelCard");
const Policy = require("../../models/v0.3/modelPolicy");
const { checkEnvVariables } = require("../../helpers/validateEnvironment");
const {
  renderResponse,
  errorResponseDataWithTag,
} = require("../../helpers/responses");
const DependentAccountAPI = require("./DependentAccountAPI");

const ROUTE_TAG = "CREATE_PATRON_0.3";
// This returns a function that generates the error response object.
const collectErrorResponseData = errorResponseDataWithTag(ROUTE_TAG);
// The following are global variables that work as caching for the values.
// Once the ILS key and secret are decrypted, they are stored so that the
// next request doesn't have to deal with decrypting those values. The ILS
// token is declared when the API returns that value, and the timestamp is
// then generated. Once all those values are obtained, the ilsClient is created
// only once and stored. This way, there is one instance of the client to make
// calls to the ILS for either the validation or create endpoints.
let ilsClientKey;
let ilsClientSecret;
let ilsToken;
let ilsTokenTimestamp;
let ilsClient;
let soLicenseKey;
const envVariableNames = [
  "ILS_CLIENT_KEY",
  "ILS_CLIENT_SECRET",
  "SCHEMA_API_BASE_URL",
  "ILS_CREATE_PATRON_URL",
  "ILS_CREATE_TOKEN_URL",
  "ILS_FIND_VALUE_URL",
  "PATRON_STREAM_NAME_V03",
  "PATRON_SCHEMA_NAME_V03",
  "SO_LICENSE_KEY",
];

/**
 * getIlsToken(req, res, key, secret) {
 * Get a token from the ILS using the ILS client key and secret.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 * @param {string} key
 * @param {string} secret
 */
function getIlsToken(req, res, key, secret) {
  const basicAuth = `Basic ${encode(`${key}:${secret}`)}`;

  return axios
    .post(
      process.env.ILS_CREATE_TOKEN_URL,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: basicAuth,
        },
      }
    )
    .then((response) => {
      ilsToken = response.data.access_token;
      ilsTokenTimestamp = new Date();
    })
    .catch((ilsError) => {
      const errorResponseData = modelResponse.errorResponseData(
        collectErrorResponseData(
          503,
          "ils-integration-error",
          `The ILS is not currently available. ${ilsError}`,
          "",
          ""
        ) // eslint-disable-line comma-dangle
      );
      renderResponse(req, res, 503, errorResponseData);
    });
}

/**
 * setupEndpoint(endpointFn, req, res)
 * The setup function for every endpoint that checks for environment variables,
 * decrypts the ILS client key and secret and stores it in the local cache,
 * creates a token to call the ILS API and stores it in the local cache, and
 * it creates one instance of the IlsClient with the token to call the ILS.
 *
 * It then proceeds to call the endpoint function that was passed and
 * return the response or error to the client.
 *
 * @param {function} endpointFn
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function setupEndpoint(endpointFn, req, res) {
  const hasValidEnvVariables = await checkEnvVariables(
    req,
    res,
    ROUTE_TAG,
    envVariableNames
  );

  if (!hasValidEnvVariables) {
    // `checkEnvVariables` already sent the error response so return the
    // function so it doesn't continue to process the current request.
    return;
  }

  // Let's use KMS to decrypt the environment variable if they haven't already
  // been decrypted.
  try {
    ilsClientKey =
      ilsClientKey || (await awsDecrypt.decryptKMS(process.env.ILS_CLIENT_KEY));
    ilsClientSecret =
      ilsClientSecret ||
      (await awsDecrypt.decryptKMS(process.env.ILS_CLIENT_SECRET));
    soLicenseKey =
      soLicenseKey || (await awsDecrypt.decryptKMS(process.env.SO_LICENSE_KEY));
  } catch (error) {
    const localErrorMessage =
      "The ILS client key and/or secret, or the Service Objects license key were not decrypted";

    const errorResponseData = modelResponse.errorResponseData(
      collectErrorResponseData(
        500,
        "configuration-error",
        localErrorMessage,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
    renderResponse(req, res, 500, errorResponseData);
  }

  // Now, let's generate a token that will be used to make authenticated
  // calls to the ILS API.
  const timeNow = new Date();
  // 3540000 = 59 minutes; tokens are for 60 minutes
  const ilsTokenExpired =
    ilsTokenTimestamp && timeNow - ilsTokenTimestamp > 3540000;
  if (!ilsToken || ilsTokenExpired) {
    getIlsToken(req, res, ilsClientKey, ilsClientSecret).then(() => {
      setupEndpoint(endpointFn, req, res);
    });
    return;
  }

  // Only one instance of the IlsClient class is needed, so create it if
  // it doesn't already exist.
  ilsClient =
    ilsClient ||
    IlsClient({
      createUrl: process.env.ILS_CREATE_PATRON_URL,
      findUrl: process.env.ILS_FIND_VALUE_URL,
      tokenUrl: process.env.ILS_CREATE_TOKEN_URL,
      ilsToken,
    });

  // Finally, call the specific function needed for the route that was called.
  // Check the bottom of the file for the specific route to function mapping.
  endpointFn(req, res);
}

/**
 * setupCheckUsername(req, res)
 * The callback function for the "/api/v0.3/validations/username" route.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function setupCheckUsername(req, res) {
  return setupEndpoint(checkUsername, req, res);
}

/**
 * setupCheckAddress(req, res)
 * The callback function for the "/api/v0.3/validations/address" route.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function setupCheckAddress(req, res) {
  return setupEndpoint(checkAddress, req, res);
}

/**
 * setupCreatePatron(req, res)
 * The callback function for the "/api/v0.3/patrons" route.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function setupCreatePatron(req, res) {
  return setupEndpoint(createPatron, req, res);
}

/**
 * setupDependentEligibility(req, res)
 * The callback function for the "/api/v0.3/validations/username" route.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function setupDependentEligibility(req, res) {
  return setupEndpoint(checkDependentEligibility, req, res);
}

/**
 * setupCreateDependent(req, res)
 * The callback function for the "/api/v0.3/patrons/dependents" route.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function setupCreateDependent(req, res) {
  return setupEndpoint(createDependent, req, res);
}

/**
 * checkUsername(req, res)
 * 1. Basic username validation is checked.
 * 2. If the username is valid, make a POST request to the ILS to check on
 *   its availability.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function checkUsername(req, res) {
  const { validate } = UsernameValidationAPI({ ilsClient });
  let usernameResponse;
  let status;
  try {
    usernameResponse = await validate(req.body.username);
    status = 200;
  } catch (error) {
    usernameResponse = modelResponse.errorResponseData(
      collectErrorResponseData(
        error.status,
        error.type || "",
        error.message,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
    status = usernameResponse.status;
  }

  renderResponse(req, res, status, usernameResponse);
}

/**
 * checkAddress(req, res)
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function checkAddress(req, res) {
  const { validate } = AddressValidationAPI({ soLicenseKey });
  let addressResponse;
  let status;
  try {
    addressResponse = await validate(req.body.address, req.body.policyType);
    status = addressResponse.status || 200;
  } catch (error) {
    addressResponse = modelResponse.errorResponseData(
      collectErrorResponseData(
        error.status,
        error.type || "",
        error.message,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
    status = addressResponse.status;
  }

  renderResponse(req, res, status, addressResponse);
}

/**
 * createPatron(req, res)
 * 1. An Address, Policy, and Card objects are created from the request.
 * 2. TODO: The Address object is validated to make sure there are no errors
 *   and the address is valid.
 * 3. The Card is validated to make sure there are no errors. This includes
 *   checking to see if the username is valid and available in the ILS.
 * 4. If all the data is valid, then create a barcode and associated with
 *   the Card.
 * 5. If all the data is valid, attempt to make a request to the ILS to
 *   create a patron.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function createPatron(req, res) {
  let address = new Address(req.body.address);
  const policy = Policy({ policyType: req.body.policyType || "simplye" });
  const card = new Card({
    name: req.body.name, // from req
    address: address, // created above
    username: req.body.username, // from req
    pin: req.body.pin, // from req
    email: req.body.email, // from req
    birthdate: req.body.birthdate, // from req
    ecommunicationsPref: req.body.ecommunicationsPref, // from req
    policy, //created above
    ilsClient, // created above
    // SimplyE will always set the home library to the `eb` code. Eventually,
    // the web app will pass a `homeLibraryCode` parameter with a patron's
    // home library. For now, `eb` is hardcoded.
    homeLibraryCode: req.body.homeLibraryCode || "eb",
  });

  let response = {};
  let validCard;
  let errors;

  try {
    const cardValidation = await card.validate();
    validCard = cardValidation.valid;
    errors = cardValidation.errors;
  } catch (error) {
    // If there was a problem hitting the ILS or Service Objects while
    // attempting to validate the username or address, catch that error here
    // and return it.
    response = modelResponse.errorResponseData(
      collectErrorResponseData(
        error.status || 400,
        error.type || "",
        error.message,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
  }

  // If there are any errors with the request, such as missing pin, birthdate,
  // etc., or if the username is unavailable, render that error.
  if (errors && Object.keys(errors).length !== 0) {
    response = modelResponse.errorResponseData(
      collectErrorResponseData(400, "invalid-request", errors, "", "") // eslint-disable-line comma-dangle
    );
  } else {
    // If the card is valid, attempt to create a patron in the ILS!
    if (validCard) {
      try {
        const resp = await card.createIlsPatron();
        // Success! resp.data.link has the ID of the newly created patron
        // in the form of:
        // "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/{patron-id}"
        response = {
          status: resp.status,
          data: {
            ...resp.data,
            barcode: card.barcode,
          },
        };
      } catch (error) {
        // There was an error hitting the ILS to create the patron. Catch
        // and return the error.
        response = modelResponse.errorResponseData(
          collectErrorResponseData(
            error.status || 400,
            error.type || "",
            error.message,
            "",
            ""
          ) // eslint-disable-line comma-dangle
        );
      }
    }
  }

  renderResponse(req, res, response.status, response);
}

/**
 * checkDependentEligibility(req, res)
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function checkDependentEligibility(req, res) {
  const { isPatronEligible } = DependentAccountAPI({ ilsClient });
  let response;
  const options = {
    barcode: req.query.barcode,
    username: req.query.username,
  };

  try {
    response = await isPatronEligible(options);
    status = 200;
  } catch (error) {
    response = modelResponse.errorResponseData(
      collectErrorResponseData(
        error.status || 400,
        error.type || "",
        error.message,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
    status = response.status;
  }

  renderResponse(req, res, status, { status, ...response });
}

/**
 * createDependent(req, res)
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function createDependent(req, res) {
  const {
    isPatronEligible,
    getAlreadyFetchedParentPatron,
    updateParentWithDependent,
    formatAddressForILS,
  } = DependentAccountAPI({
    ilsClient,
  });
  let isEligible;
  let parentPatron;
  let response;
  const options = {
    barcode: req.body.barcode,
    username: req.body.parentUsername,
  };

  // Check that the patron is eligible to create dependent accounts.
  try {
    isEligible = await isPatronEligible(options);
  } catch (error) {
    response = modelResponse.errorResponseData(
      collectErrorResponseData(
        error.status || 500,
        error.type || "",
        error.message,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
    // There was an error so just return the error and don't continue.
    return renderResponse(req, res, response.status, response);
  }

  if (isEligible.eligible) {
    // The patron is eligible. Let's get the data. The parent account was
    // stored after calling `isPatronEligible`.
    parentPatron = getAlreadyFetchedParentPatron();
  }

  // Reformat the address for a new Address object.
  const formattedAddress = formatAddressForILS(parentPatron.addresses[0]);
  // This varField is needed for the dependent account to associate it with
  // its parent account.
  const varField = {
    fieldTag: "x",
    content: `DEPENDENT OF ${req.body.barcode}`,
  };
  let address = new Address(formattedAddress);
  // This new patron has a new ptype.
  const policy = Policy({ policyType: "simplyeJuvenile" });
  const card = new Card({
    name: req.body.name, // from req
    username: req.body.username, // from req
    pin: req.body.pin, // from req
    birthdate: req.body.birthdate, // from req
    address, // from parent
    // If no email was sent in the request, use the parent's email.
    email: req.body.email || parentPatron.emails[0],
    policy, //created above
    ilsClient, // created above,
    varFields: [varField],
    // SimplyE will always set the home library to the `eb` code. Eventually,
    // the web app will pass a `homeLibraryCode` parameter with a patron's
    // home library. For now, `eb` is hardcoded.
    homeLibraryCode: req.body.homeLibraryCode || "eb",
  });

  let validCard;
  let errors;

  try {
    // The setup is complete, now validate the card to make sure all the
    // values are in place.
    const cardValidation = await card.validate();
    validCard = cardValidation.valid;
    errors = cardValidation.errors;
  } catch (error) {
    // If there was a problem hitting the ILS or Service Objects while
    // attempting to validate the username or address, catch that error here
    // and return it.
    response = modelResponse.errorResponseData(
      collectErrorResponseData(
        error.status || 400,
        error.type || "",
        error.message,
        "",
        ""
      ) // eslint-disable-line comma-dangle
    );
  }

  // If there are any errors with the request, such as missing pin, birthdate,
  // etc., or if the username is unavailable, render that error.
  if (errors && Object.keys(errors).length !== 0) {
    response = modelResponse.errorResponseData(
      collectErrorResponseData(400, "", errors, "", "") // eslint-disable-line comma-dangle
    );
  } else {
    // If the card is valid, attempt to create the dependent patron in the ILS!
    if (validCard) {
      try {
        const newResponse = await card.createIlsPatron();
        // Success! resp.data.link has the ID of the newly created patron
        // in the form of:
        // "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/{patron-id}"

        // The dependent card was created. Great! But now we need to associate
        // this new account to the parent's account. So update the parent's
        // account varFields property to include the barcode of this new
        // dependent account. This value is actually used. If an error is
        // thrown, it will be caught, but if there are no errors, then assume
        // that the request went through since the ILS only returns a 204.
        const updateResponse = await updateParentWithDependent(
          parentPatron,
          card.barcode
        );
        const { link } = newResponse.data;

        response = {
          status: 200,
          data: {
            // This is data from the newly created dependent juvenile account.
            // The `id` is from the ILS response in its `link` property, but
            // we need to parse it and get the last value from the link which
            // looks like
            // "https://nypl-sierra-test.nypl.org/iii/sierra-api/v6/patrons/{patron-id}"
            dependent: {
              id: parseInt(link.split("/").pop(), 10),
              username: card.username,
              name: card.name,
              barcode: card.barcode,
              pin: card.pin,
            },
            // Updating a patron in the ILS simply returns a 204 with no
            // response in the body.
            // Return the parent's barcode and a list of its dependents.
            parent: {
              updated: true,
              barcode: req.body.barcode,
              dependents: `${parentPatron.dependents},${card.barcode}`,
            },
          },
        };
      } catch (error) {
        // There was an error hitting the ILS to create the patron or to update
        // the parent's account. Catch either error and return it.
        response = modelResponse.errorResponseData(
          collectErrorResponseData(
            error.status || 502,
            error.type || "",
            error.message,
            "",
            ""
          ) // eslint-disable-line comma-dangle
        );
      }
    }
  }

  renderResponse(req, res, response.status, response);
}

// Note: we are returning a function that calls the setup function with the
// specific function for the given route. This is because we cannot directly
// call the setup function or else express will immediately call it.
// Example, `createPatron: setupCreatePatron` is called because
// `createPatron: setupEndpoint(createPatron, req, res)` throws an error.
module.exports = {
  createPatron: setupCreatePatron,
  createDependent: setupCreateDependent,
  checkUsername: setupCheckUsername,
  checkDependentEligibility: setupDependentEligibility,
  checkAddress: setupCheckAddress,
};
