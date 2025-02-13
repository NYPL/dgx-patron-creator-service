[![Build Status](https://travis-ci.org/NYPL/dgx-patron-creator-service.svg?branch=development)](https://travis-ci.org/NYPL/dgx-patron-creator-service)

# dgx-patron-creator-service

This is the repository of the New York Public Library's Patron Card Creator microservice. The microservice offers the API endpoints necessary to validate ILS usernames, validate addresses through Service Objects, check dependent account creation, and create new patron accounts in NYPL's ILS. Examples of consuming applications are the SimplyE mobile clients and the "Get a Library Card" app.

For more information regarding the business logic surrounding card creation, check the [dgx-patron-creator-service wiki](https://github.com/NYPL/dgx-patron-creator-service/wiki).

This app serves the following endpoints:

- `GET /docs/patron-creator`
- `POST /api/v0.2/patrons`
- `POST /api/v0.3/validations/username`
- `POST /api/v0.3/validations/address`
- `POST /api/v0.3/patrons`
- `GET /api/v0.3/patrons/dependent-eligiblity`
- `POST /api/v0.3/patrons/dependents`

The following endpoints are deprecated:

- `POST /api/v0.1/patrons`
- `POST /api/v0.1/validations/username`
- `POST /api/v0.1/validations/address`

See also [PatronEligibilityService](https://github.com/NYPL-discovery/patron-eligibility-service), [BarcodeService](https://github.com/NYPL/barcode-service) for other patron endpoints.

## Version

v0.8.5

## Technologies

- [AWS Lambda](https://aws.amazon.com/lambda/) - The service will serve as an AWS Lambda instance.
- [Amazon RDS](https://aws.amazon.com/kinesis/) - The database that the Lambda will use for generating barcodes.
- [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) - The server is built with ExpressJS with the npm module specifically for AWS Lambda.
- [Swagger](http://swagger.io/) - The framework for the API documentation and architecture.
- [node-lambda](https://www.npmjs.com/package/node-lambda) - The npm module helps us deploy this Express application as an AWS Lambda instance.
- [AWS Nodejs SDK](https://aws.amazon.com/sdk-for-node-js/) - The SDK helps take the complexity out of coding by providing JavaScript objects for AWS services. We use it here to decrypt credentials using [Amazon KMS](https://aws.amazon.com/kms/).

## Install and Run

Clone the repo. Open your terminal and in the folder you just downloaded, run

```sh
$ npm install
```

### Configuration and Credentials

You need credentials for making successful API calls to NYPL's ILS and Service Objects API.

A local Postgres database named `barcodes` needs to be set up and other environment variables can be set in the configuration files in the `/config` directory.

All the credentials are stored in the configuration files in the `/config` directory but you do need a personal AWS account under NYPL's account in order to be able to decrypt those values locally. Install the `aws cli` tool on your machine and configure it by running `aws configure`. Then add your AWS account Access Key ID and Secret Access Key when asked. If you do not already have these set up, contant someone at NYPL to help you create/access these credentials.

_Please contact an NYPL engineer to get credentials for the services._

### Start the service

To execute the service locally, run

```sh
$ NODE_ENV=development npm start
```

The server will run on _localhost:3001_ using development environment variables. Switch to `qa` or `production` for the other environments which will use the respective configuration files in the `/config` directory.

## v0.2 API Routes

#### 1. Create a Patron `/api/v0.2/patrons` - POST

This endpoint uses the ILS to create a patron. More documentation will be written soon.

## v0.3 API Routes

The five current and stable endpoints are under `/v0.3`. For `/v0.1` endpoints, check the [LEGACY_ENDPOINTS_README](./LEGACY_ENDPOINTS_README.md) file.

#### 1. User Name Validation `/api/v0.3/validations/username` - POST

This endpoint validates a username's format and then its availability in NYPL's ILS. The update for this version is that instead of hitting the NYPL Simplified Card Creator which hits the ILS, this endpoint directly hits the ILS.

For more information about the request, success response, and error response, check the [username endpoint wiki](https://github.com/NYPL/dgx-patron-creator-service/wiki/API-V0.3#username-validation---post-v03validationsusername).

Example request:

```javascript
{ "username": "tomnook42" }
```

Example response:

```javascript
{
  "type": "username-available",
  "message": "This username is available."
}
```

#### 2. Address Validation `/api/v0.3/validations/address` - POST

This endpoint validates the patron's address or work address through Service Objects to see if the address is valid and residential.

For more information about the request, success response, and error response, check the [address endpoint wiki](https://github.com/NYPL/dgx-patron-creator-service/wiki/API-V0.3#address-validation---post-v03validationsaddress).

Example request:

```javascript
{
  "address": {
    "line1": "1111 1st St.",
    "city": "Woodside",
    "state": "NY",
    "zip": "11377",
    "isResidential": true,
  }
}
```

Example response:

```javascript
{
  "status": 200,
  "type": "valid-address",
  "title": "Valid address",
  "address": {
    "address": {
    "line1": "1111 1st St.",
    "line2": "",
    "city": "Woodside",
    "state": "NY",
    "zip": "11377-1234",
    "isResidential": true,
    "hasBeenValidated": true,
  },
  "originalAddress": {
    "address": {
    "line1": "1111 1st St.",
    "city": "Woodside",
    "state": "NY",
    "zip": "11377",
    "isResidential": true,
  },
}
```

#### 3. Create a Patron `/api/v0.3/patrons` - POST

This endpoint is used to create new patron accounts in NYPL's ILS. The username and addresses validations are internally run in this endpoint unless if a flag is passed indicating that the username, address, or work address have already been validated.

Note: For the `simplye` policy type, the `ageGate` field is required. For the `webApplicant` policy type, the `birthdate` field is required. The `acceptTerms` field _must_ be true or the submission won't go through; this is passed from the client.

For more information about the request, success response, and error response, check the [patrons endpoint wiki](https://github.com/NYPL/dgx-patron-creator-service/wiki/API-V0.3#patron-account-creation---post-v03patrons).

Pin/Password update:
In mid-2021, the ILS updated it's policy to increase the length of the pin. The property is now "password" and can be a length of 4-64 alphanumeric characters, including special characters. Even though the ILS API uses "password" and the Card Creator will send the data as "password", for legacy calls this endpoint will still support a "pin" property and will internally update it.

Example request:

```javascript
{
  "usernameHasBeenValidated": false,
  "username": "tomnook42",
  "firstName": "Tom",
  "lastName": "Nook",
  "address": {
    "line1": "1111 1st St.",
    "line2": "",
    "city": "Woodside",
    "state": "NY",
    "zip": "11377"
  },
  "workAddress": {
    "line1": "476 5th Avenue",
    "city": "New York",
    "state": "NY",
    "zip": "10018"
  },
  "password": "MyLib1731@!",
  "ageGate": true,
  "birthdate": "05-30-1988",
  "policyType": "simplye",
  "email": "tomnook@ac.com",
  "homeLibraryCode": "eb",
  "ecommunicationsPref": false,
  "acceptTerms": true,
}
```

Example response:

```javascript
{
  "type": "card-granted",
  "link": "https://link.com/to/ils/1234567",
  "barcode": "111122222222345",
  "username": "tomnook42",
  "password": "MyLib1731@!",
  "temporary": false,
  "message": "The library card will be a standard library card.",
  "patronId": 1234567
}
```

#### 4. Check Patron Dependent Eligibility `/api/v0.3/dependent-eligibility` - GET

This endpoint is used to check whether a patron's account is eligible to create dependent juvenile patron accounts. Either a barcode or a username can be used a query parameter in the request. If the patron is not eligible, they will get an error with the reason. A patron is currently only allowed to create up to three dependent juvenile patron accounts.

For more information about the request, success response, and error response, check the [patron dependent eligibility endpoint wiki](https://github.com/NYPL/dgx-patron-creator-service/wiki/API-V0.3#dependent-juvenile-account-creation-eligibility---get-v03patronsdependent-eligibility).

Examples of requests:

- `api/v0.3/patrons/dependent-eligibility?username=tomnook42`
- `api/v0.3/patrons/dependent-eligibility?barcode=12345678912345`

Example responses:

```javascript
{
  "status": 200,
  "eligible": true,
  "description": "This patron can create dependent accounts."
}
```

Note: although we want to return a `detail` property, some clients expect the `message` property so that message is duplicated for now.

```javascript
{
  "status": 400,
  "type": "not-eligible-card",
  "title": "Not Eligible Card",
  "message": "You have reached the limit of dependent cards you can receive via online application."
  "detail": "You have reached the limit of dependent cards you can receive via online application."
}
```

#### 5. Create a Dependent Juvenile Patron `/api/v0.3/dependents` - POST

This endpoint is used to create dependent juvenile patron accounts. This creates a patron directly in the ILS with a specific p-type as well as a note in the account's data object linking the parent account with the dependent account. The parent account will also include a note that lists up to three of its dependent juvenile patron account barcodes. If the child's name doesn't include a last name, it will be updated to have the parent's last name before sending the request to the ILS.

_Note: a parent patron account must pass its barcode under `barcode` or its username under `parentUsername`._

For more information about the request, success response, and error response, check the [patron dependent eligibility endpoint wiki](https://github.com/NYPL/dgx-patron-creator-service/wiki/API-V0.3#dependent-juvenile-account-creation---post-v03patronsdependents).

Pin/Password update:
In mid-2021, the ILS updated it's policy to increase the length of the pin. The property is now "password" and can be a length of 4-64 alphanumeric characters, including special characters. Even though the ILS API uses "password" and the Card Creator will send the data as "password", for legacy calls this endpoint will still support a "pin" property and will internally update it.

Example of a requests:

```javascript
{
  "barcode": "12222222222222",
  "name": "Isabelle Shizue",
  "firstName": "Isabelle",
  "lastName": "Shizue",
  "username": "isabelle1",
  "password": "MyLib1731@!"
}
```

```javascript
// In this case, the child's last name will be updated to be
// the parent's last name.
{
  "barcode": "12222222222222",
  "name": "Isabelle",
  "username": "isabelle1",
  "password": "MyLib1731@!"
}
```

```javascript
// In this case, the child's last name will be updated to be
// the parent's last name.
{
  "parentUsername": "tomnook42",
  "firstName": "Isabelle",
  "username": "isabelle1",
  "password": "MyLib1731@!"
}
```

Example of responses:

```javascript
{
  "status": 200,
  "data": {
    "dependent": {
      "id": 12345,
      "username": "isabelle1",
      "name": "SHIZUE, ISABELLE",
      "barcode": "15555555555555",
      "password": "MyLib1731@!"
    },
    "parent": {
      "updated": true,
      "barcode": "12222222222222",
      "dependents": "DEPENDENTS 15555555555555"
    }
  }
}
```

## JSON and YAML Swagger Documentation

Visit `/docs/patrons-validations` for the JSON version of this service's swagger documentation.

The JSON and yaml for all the endpoints are found in the `/api/swagger` directory. Visit a service like [Swagger Editor](http://editor.swagger.io/) to run and update the yaml in real time, and download a JSON equivalent file. Or, you can input the JSON and get the equivalent yaml. Both files should be updated whenever changes are made.

Whenever endpoints are updated, the corresponding Swagger documentation MUST be updated. This is important because the `/docs/patrons-validations` endpoint is read by the NYPL `Docs Service` application. This aggregates all the Swagger documentation endpoints from all the microservices on AWS and creates one unified documentation. For example, the production documentation can be found on [Platform docs](https://platformdocs.nypl.org/). For more information, please see NYPL [Library Services Platform's documentation](https://github.com/NYPL/lsp_workflows/blob/master/workflows/update_platformdocs.md) on updating the docs.

## Testing

### Unit Tests

Run `npm test` to run the unit tests.

There are unit tests for the postgres database integration. Create a postgres database called `barcodes_test` and fill out the `DB_*_TEST` fields in `/config/deploy_development.env`:

```
DB_USER_TEST=
DB_HOST_TEST=
DB_DATABASE_TEST=barcodes_test
DB_PASSWORD_TEST=
DB_PORT_TEST=5432
```

Example:

```
DB_USER_TEST=database_user
DB_HOST_TEST=localhost
DB_DATABASE_TEST=barcodes_test
DB_PASSWORD_TEST=database_password
DB_PORT_TEST=5432
```

### Integration Tests

_7/18/24 Note: The following set of tests don't run in the current jest environment. It's recommended to perform manual tests as described in the following section._

Run `NODE_ENV=production npm start` in one window to run the app locally in production mode. This is required to run the integration tests. The integration tests will hit the production ILS server to run against tests.

Run `INTEGRATION_TESTS=true npm test` in a second window to run all the tests including the integration tests. Check the server to ensure that you see the message "Published to stream successfully!" to verify that the integration test exercised the Kinesis stream.

### Manual Testing through Postman

If you're testing manually through Postman to make real API calls, _make sure you are on NYPL's VPN network to make authenticated calls_. Then run the app as `NODE_ENV=qa npm start` or `NODE_ENV=production npm start` to hit the real QA/production ILS server. Now you can make calls to `http://localhost:3001/api/v0.3/validations/username`, for example, and it'll make real requests to the ILS.

If you want to test the real endpoints on the NYPL Platform API through Postman, you need the right credentials by making two calls:

- To the ISSO server to get a token
- To the Platform API

1. ISSO Server
   In Postman, make a POST request to `https://isso.nypl.org/oauth/token` with:

- Authorization: "Basic Auth"
  - username: "isso_username"
  - password: "isso_password"
- Body: "x-www-form-urlencoded"
  - key: "grant_type"
  - value: "client_credentials"

"isso_username" and "isso_password" should get obtained from the ILS team at NYPl. This API call will return a JSON object and the important value is the `access_token` value. You will need this value as the bearer token in the next step.

2. Call the Platform API
   In Postman, make a POST request to `https://platform.nypl.org/api/v0.3/validations/username` (for example) with:

- Authorization: "Bearer Token"
  - Token: "access_token"

Since this is a POST request, you need to change the "body" type to "raw" and "JSON", now you can add the data object. For GET requests, you'd update the "params" instead.

## Deployment

Travis CI/CD is used to deploy the Lambda to AWS. Sensitive environment variables for AWS Lambda are encrypted in source control and decrypted by AWS as part of deployment.

The Travis configuration sets up automatic deployment to NYPl's development and production AWS accounts on the `development`, `qa`, and `master` branches. When new code is merged into each branch, and the tests pass, Travis will deploy to the appropriate environment, using the corresponding npm script found in `package.json`.

If any endpoints were added or updated, make sure to make the corresponding update in the AWS API Gateway. For more information, please see NYPL [Library Services Platform's documentation](https://github.com/NYPL/lsp_workflows/blob/master/workflows/adding-a-platform-api-endpoint.md) on updating the API Gateway with new endpoints.

## Contributing

There are currently three branches that correspond to the environment they deploy to on NYPL AWS's account. The `development` branch deploys to the AWS Sandbox development account. Both the `qa` and `master` branches deploy to the AWS nypl-digital-dev account.

Because of the different environments, the following git branch workflow is used:

- Branch off `development` for your feature branch.
- Create a PR pointing to `development`.
- Once `development` is updated, merge `development` into `qa`.
- Finally, after testing the QA server and endpoints, merge `qa` into `master`.
