const awsDecrypt = require("./../../../config/awsDecrypt.js");
const IlsClient = require("./IlsClient");
const logger = require("../../helpers/Logger");
const Card = require("../../models/v0.3/modelCard");
const Address = require("../../models/v0.3/modelAddress");
const Policy = require("../../models/v0.3/modelPolicy");
const {
  checkEnvironmentVariables,
} = require("../../helpers/validateEnvironment");
const UsernameValidationAPI = require("./UsernameValidationAPI");
const {
  renderResponse,
  errorResponseDataWithTag,
} = require("../../helpers/responses");
const DependentAccountAPI = require("./DependentAccountAPI");
const { normalizeName, updateJuvenileName } = require("../../helpers/utils");
const { KMSDecryption, InvalidRequest } = require("../../helpers/errors");

const ROUTE_TAG = "CREATE_PATRON_0.3";
// This returns a function that generates the error response object.
const collectErrorResponseData = errorResponseDataWithTag(ROUTE_TAG);
// The following are global variables that work as caching for the values.
// Once the ILS key and secret are decrypted, they are stored so that the
// next request doesn't have to deal with decrypting those values. The ilsClient
// is created only once and stored. There will only be one instance of the
// client to make calls to the ILS for either the validation or
// create endpoints.
let ilsClientKey;
let ilsClientSecret;
let ilsClient;
let soLicenseKey;
const envVariableNames = [
  "ILS_CLIENT_KEY",
  "ILS_CLIENT_SECRET",
  "SCHEMA_API_BASE_URL",
  "ILS_CREATE_PATRON_URL",
  "ILS_CREATE_TOKEN_URL",
  "ILS_FIND_VALUE_URL",
  "SO_LICENSE_KEY",
];

/**
 * checkIlsToken
 * check to see if the ILS token is available or if it is expired. If either is
 * true, then request a new one. If there was an issue, return an error. Returns
 * an array [boolean, message] with information if the ILS token generation
 * call was successful or not.
 */
async function checkIlsToken(req, res) {
  // If the ilsClient has no token or the token is expired, then
  // generate a new token.
  if (!ilsClient.hasIlsToken() || ilsClient.isTokenExpired()) {
    try {
      await ilsClient.generateIlsToken();
      return [false, null];
    } catch (ilsError) {
      const errorResponseData = collectErrorResponseData(ilsError);
      return [
        true,
        renderResponse(req, res, errorResponseData.status, errorResponseData),
      ];
    }
  }

  return [false, null];
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
  const hasValidEnvVariables = await checkEnvironmentVariables(
    res,
    ROUTE_TAG,
    envVariableNames
  );

  if (!hasValidEnvVariables) {
    // `checkEnvironmentVariables` already sent the error response so return
    // the function so it doesn't continue to process the current request.
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
    const kmsError = new KMSDecryption(
      "The ILS client key and/or secret, or the Service Objects license key were not decrypted"
    );
    const errorResponseData = collectErrorResponseData(kmsError);
    return renderResponse(
      req,
      res,
      errorResponseData.status,
      errorResponseData
    );
  }

  // Only one instance of the IlsClient class is needed, so create it if
  // it doesn't already exist.
  ilsClient =
    ilsClient ||
    IlsClient({
      createUrl: process.env.ILS_CREATE_PATRON_URL,
      findUrl: process.env.ILS_FIND_VALUE_URL,
      tokenUrl: process.env.ILS_CREATE_TOKEN_URL,
      ilsClientKey,
      ilsClientSecret,
    });

  const [tokenError, tokenErrorMessage] = await checkIlsToken(req, res);
  if (tokenError) {
    return tokenErrorMessage;
  }

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
  // Make sure we have a token. Nothing happens if there is a token.
  const [tokenError, tokenErrorMessage] = await checkIlsToken(req, res);
  if (tokenError) {
    return tokenErrorMessage;
  }

  const { validate } = UsernameValidationAPI(ilsClient);
  let usernameResponse;
  let status;
  try {
    usernameResponse = await validate(req.body.username);
    status = 200;
  } catch (error) {
    usernameResponse = collectErrorResponseData(error);
    status = usernameResponse.status;
  }

  return renderResponse(req, res, status, usernameResponse);
}

/**
 * checkAddress(req, res)
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function checkAddress(req, res) {
  // Make sure we have a token. Nothing happens if there is a token.
  const [tokenError, tokenErrorMessage] = await checkIlsToken(req, res);
  if (tokenError) {
    return tokenErrorMessage;
  }

  let addressResponse;
  try {
    const address = new Address(req.body.address, soLicenseKey);
    let validatedAddress = await address.validate();
    let policyResponse = {};

    // If there's an error, return that error to the user and don't attempt to
    // get a policy response since it's an invalid request.
    if (validatedAddress.error) {
      validatedAddress = {
        ...validatedAddress,
        originalAddress: address.address,
      };
      if (!validatedAddress.type) {
        const invalidError = new InvalidRequest("Address validation error");
        validatedAddress = {
          ...validatedAddress,
          ...collectErrorResponseData(invalidError),
        };
      }
    }

    if (validatedAddress.addresses && validatedAddress.addresses.length !== 0) {
      // More than one address is returned from Service Objects. The card is
      // denied until an unambiguous address is submitted.
      policyResponse = Card.RESPONSES.cardDeniedMultipleAddresses;
    }

    addressResponse = {
      status: validatedAddress.status || 200,
      ...validatedAddress,
      ...policyResponse,
    };
  } catch (error) {
    addressResponse = collectErrorResponseData(error);
  }

  return renderResponse(req, res, addressResponse.status, addressResponse);
}

/**
 * createPatron(req, res)
 * 1. An Address, Policy, and Card objects are created from the request.
 * 2. The Address object is validated and a response is returned with the
 *   type of card the address can create: none, temporary, standard.
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
  // Make sure we have a token. Nothing happens if there is a token.
  const [tokenError, tokenErrorMessage] = await checkIlsToken(req, res);
  if (tokenError) {
    return tokenErrorMessage;
  }

  let address = req.body.address
    ? new Address(req.body.address, soLicenseKey)
    : undefined;
  let workAddress = req.body.workAddress
    ? new Address(req.body.workAddress, soLicenseKey)
    : undefined;

  // The default and only allowed policty type will be "webApplicant" since we
  // are assigning the new "web digital" type p-types. At a later time after
  // 12/20, the "simple" policy type will be passed and more p-types
  // can be assigned.
  const policyType = "webApplicant";
  const updatedName = normalizeName(
    req.body.name,
    req.body.firstName,
    req.body.lastName
  );
  const password = req.body.pin || req.body.password;
  const card = new Card({
    name: updatedName,
    address: address, // created above
    location: req.body.location,
    workAddress: workAddress,
    username: req.body.username, // from req
    usernameHasBeenValidated: req.body.usernameHasBeenValidated,
    password,
    email: req.body.email, // from req
    birthdate: req.body.birthdate, // from req
    ageGate: req.body.ageGate, // from req
    ecommunicationsPref: req.body.ecommunicationsPref, // from req
    policy: Policy({ policyType }),
    ilsClient, // created above
    // SimplyE will always set the home library to the `eb` code. Eventually,
    // the web app will pass a `homeLibraryCode` parameter with a patron's
    // home library. For now, `eb` is hardcoded.
    homeLibraryCode: req.body.homeLibraryCode || "eb",
    acceptTerms: req.body.acceptTerms || false,
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
    response = {
      ...collectErrorResponseData(error),
      cardType: null,
    };
  }

  // If there are any errors with the request, such as missing password, birthdate,
  // etc., or if the username is unavailable, render that error.
  if (errors && Object.keys(errors).length !== 0) {
    response = {
      ...collectErrorResponseData(
        new InvalidRequest("There was an error with the request.")
      ),
      error: errors,
      cardType: null,
    };
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
          ...resp.data,
          ...card.details(),
        };
      } catch (error) {
        console.log(
          "controller createPatron error calling card.createIlsPatron",
          error
        );
        logger.error(
          "controller createPatron error calling card.createIlsPatron",
          error
        );
        // There was an error hitting the ILS to create the patron. Catch
        // and return the error.
        response = collectErrorResponseData(error);
      }
    }
  }

  return renderResponse(req, res, response.status, response);
}

/**
 * checkDependentEligibility(req, res)
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function checkDependentEligibility(req, res) {
  // Make sure we have a token. Nothing happens if there is a token.
  const [tokenError, tokenErrorMessage] = await checkIlsToken(req, res);
  if (tokenError) {
    return tokenErrorMessage;
  }

  const { isPatronEligible } = DependentAccountAPI(ilsClient);
  let response;
  let status;
  const options = {
    barcode: req.query.barcode,
    username: req.query.username,
  };

  try {
    response = await isPatronEligible(options);
    status = 200;
  } catch (error) {
    response = collectErrorResponseData(error);
    status = response.status;
  }

  return renderResponse(req, res, status, { status, ...response });
}

/**
 * createDependent(req, res)
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
async function createDependent(req, res) {
  // Make sure we have a token. Nothing happens if there is a token.
  const [tokenError, tokenErrorMessage] = await checkIlsToken(req, res);
  if (tokenError) {
    return tokenErrorMessage;
  }

  const {
    isPatronEligible,
    getAlreadyFetchedParentPatron,
    updateParentWithDependent,
    formatAddressForILS,
  } = DependentAccountAPI(ilsClient);
  let isEligible;
  let parentPatron;
  let response;
  const options = {
    barcode: req.body.barcode,
    username: req.body.parentUsername,
  };

  if (!req.body.name && !req.body.firstName && !req.body.lastName) {
    const noNameError = collectErrorResponseData(
      new InvalidRequest(
        "No name, firstName, or lastName was passed for the child."
      )
    );
    return renderResponse(req, res, noNameError.status, noNameError);
  }

  // Check that the patron is eligible to create dependent accounts.
  try {
    isEligible = await isPatronEligible(options);
  } catch (error) {
    response = {
      ...collectErrorResponseData(error),
      error: error.message,
    };
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
  // The parent's address is assumed to have already been validated so no
  // need to run it against validation again. No need for the SO license key
  // since it won't be validated.
  let address = new Address({
    ...formattedAddress,
    hasBeenValidated: true,
  });

  // Normalize the child's name. The `Card` object expects name to be in the
  // "firstName lastName" format. If the request is in "lastName, firstName"
  // format, it gets updated here. If the request only has the first name for
  // the child, the parent's last name is added here.
  // The `Card` object itself converts the name string to the ILS-preferred
  // format before making the API call.
  const updatedName = normalizeName(
    req.body.name,
    req.body.firstName,
    req.body.lastName
  );
  // If no last name was in the input, use the parent's last name.
  const childsName = updateJuvenileName(updatedName, parentPatron.names);

  // This new patron has a new ptype.
  const policy = Policy({ policyType: "simplyeJuvenile" });
  const password = req.body.pin || req.body.password;
  const card = new Card({
    name: childsName, // from req
    username: req.body.username, // from req
    password, // from req
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
    // For phase one, this value is not needed from the request. This value is
    // needed for the Card object to be valid so it will be set to true. Once
    // an update has been made to the forms that make requests to this endpoint,
    // this should be updated to req.body.acceptTerms.
    acceptTerms: true,
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
    response = {
      ...collectErrorResponseData(error),
      error: error.message,
    };
  }

  // If there are any errors with the request, such as missing password, birthdate,
  // etc., or if the username is unavailable, render that error.
  if (errors && Object.keys(errors).length !== 0) {
    const badInput = new InvalidRequest("There was an error with the request");
    response = {
      ...collectErrorResponseData(badInput),
      error: errors,
    };
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
        // dependent account. This value is actually not used. If an error is
        // thrown, it will be caught, but if there are no errors, then the
        // request went through since the ILS only returns a 204.
        await updateParentWithDependent(parentPatron, card.barcode);
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
              password: card.password,
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
        response = collectErrorResponseData(error);
      }
    }
  }

  return renderResponse(req, res, response.status, response);
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
