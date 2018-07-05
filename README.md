[![Build Status](https://travis-ci.org/NYPL/dgx-patron-creator-service.svg?branch=development)](https://travis-ci.org/NYPL/dgx-patron-creator-service)

# dgx-patron-creator-service

This is the repository of the New York Public Library's patron creator microservice. The microservice offers the API endpoint to create a new patron with the information from the "Get a Library Card" form.

The Link to the repository from [here](https://github.com/NYPL/dgx-patron-creator-service).

The form on NYPL's website will fire a POST request to the service after it has been submitted. The service will then take the information and fire another POST request to NYPL Simplified's Card Creator API. Finally, it will reply the results based on the responses from the Card Creator API.

The Card Creator's documentation can be found [here](https://github.com/NYPL-Simplified/card-creator).

## Version
v0.1.1

## Technologies

  - [AWS Lambda](https://aws.amazon.com/lambda/) - The service will serve as an AWS Lambda instance.
  - [Amazon Kinesis](https://aws.amazon.com/kinesis/) - The service for streaming data after successfully creating a patron.
  - [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) - The server is built with ExpressJS with the npm module specifically for AWS Lambda.
  - [Swagger](http://swagger.io/) - The framework for the API documentation and architecture.
  - [node-lambda](https://www.npmjs.com/package/node-lambda) - The npm module helps us deploy this Express application as an AWS Lambda instance.
  - [yamljs](https://www.npmjs.com/package/yamljs) - The npm module helps convert the YAML swagger documentation to JSON format and vice versa.
  - [AWS](https://aws.amazon.com/sdk-for-node-js/) - The SDK helps take the complexity out of coding by providing JavaScript objects for AWS services. We use it here for streaming the data to [Amazon Kinesis](https://aws.amazon.com/kinesis/).


## Install and Run

Clone the repo. Open your terminal and in the folder you just downloaded, run
```sh
$ npm install
```

### Configuration

To setup the app configuration. copy the `.env.example` file to `.env` and update the necessary configuration parameters.

You need credentials for making a successful API call to NYPL's Simplified Card Creator and AWS credentials to connect to Kinesis.

*Please contact [NYPL's Simplified Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials.*
*To get your AWS Kinesis service credentials, please visit [AWS Kinesis's website](https://aws.amazon.com/kinesis/).*


### Start the service
To execute the service locally, run
```sh
$ npm start
```
The server will be executed on _localhost:3001_. As the help from swagger, you don't need to restart the server to see the changes you made to the code.

### Call the APIs

You need credentials for making a successful API call to NYPL's Simplified Card Creator. You should set this credentials in the `.env` file. For example,

```javascript
CARD_CREATOR_USERNAME=username
CARD_CREATOR_PASSWORD=password
```

*Please contact [NYPL's Simplified Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials.*

### API Routes
#### 1. Create a Patron

With a valid credential, now you can make a POST request to _localhost:3001/api/v0.1/patrons_ to create a new patron.

The request data format should be in JSON with at least "name", "dateOfBirth", "address", "username", and "pin". For instance,

```javascript
{
  "simplePatron": {
    "name": "Mikey Olson, Jr.",
    "dateOfBirth": "11/11/1987",
    "email": "mjolson@example.com",
    "address": {
      "line_1": "123 Fake Street",
      "line_2": "",
      "city": "New York",
      "state": "NY",
      "zip": 10018
    },
    "username": "mjolson54321",
    "pin": "1234",
    "ecommunications_pref": true,
    "policy_type": "web_applicant",
    "patron_agency": "198"
  }
}
```
*Notice: `ecommunications_pref` takes a boolean type of value from "Get a Library Card" form, but it will output a string as `s` or `-` based on `true` or `false`. The reason is that the Card Creator API takes `s` or `-`.*

*Notice: `patron_agency` is for telling the Card Creator which patron type is going to be created. While `198` is default and for NYC residents, `199` is for NYS residents but not live in NYC.*

A successful JSON response example will be as below,

```javascript
{
  "data": {
    simplePatron: {
      "status_code_from_card_creator": 200,
      "type": "card-granted",
      "username": "mikeolson54321",
      "temporary": true,
      "patron_id": "6367028",
      "barcode": "6367028",
      "message": "Your library card is temporary because your address could not be verified. Visit your local NYPL branch within 30 days to upgrade to a standard card.",
      "detail": {},
    },
    patron: {}
  },
  "count": 1
}
```

Three kinds of error messages could be returned from the Card Creator API.

| type   | status   | title   | detail   | debug_message   |
|--------|:--------:|---------|----------|-----------------|
|'remote-integration-failure'|502|'Third-party service failed.'|'The library could not complete your request because a third-party service has failed.'|-|
|'invalid-request'|400|'Invalid request.'|'Valid request parameters are required.'|Varies|
| 'no-available-barcodes'|422|'No available barcodes.'|'There are no barcodes currently available.'|-|

#### 2. JSON Documentation

Visit _http://localhost:3001/docs/patron-creator_ for the JSON version of the service swagger documentation.

### Visit and Edit the Swagger Documentation

Visit _http://localhost:3001/docs_ to see your API service's documentation if executing the service locally.

To edit the documentation with interactive UI, run this command below in your terminal.

```sh
$ npm run swagger-edit
```

It will automatically open the web page for you to edit.

After finishing the update, we need the npm module [yamljs](https://www.npmjs.com/package/yamljs) to convert our YAML swagger documentation to JSON format or vice versa. The JSON file is for NYPL's API Gateway documentation. Run

```sh
$ npm install -g yamljs
```

After it, you can run

```sh
$ npm run build-swagger-doc
```

This script will generate _swaggerDoc.json_ based on the YAML documentation.

## Testing
Use `npm start` to run the app in one window.  This is required to get the integration test to pass. The integration tests uses a local server the QA instance of Card Creator and the Patron Kinesis stream in the Sandbox environment.

Use `INTEGRATION_TESTS=true npm test` in a second window to run all the tests or just `npm test` to run the unit tests.  Check the server to ensure that you see the message "Published to stream successfully!" to verify that the integration test exercised the Kinesis stream.

## Deployment

Sensitive environment variables for AWS Lambda are encrypted in source control, and decrypted by AWS as part of deployment.  To deploy to QA, run the following command:
```sh
$ npm run deploy-package-qa
```
To deploy to Production, run the following command:
```sh
$ npm run deploy-package-production
```

You can also run
```sh
$ npm run build-doc-deploy-package-qa
```
or
```sh
$ npm build-doc-deploy-package-production
```
It will convert the swagger YAML documentation to JSON documentation before deployment thus to make sure the instance has the latest documentation.

*To get your AWS Lambda service credentials, please visit [AWS Lambda's website](https://aws.amazon.com/lambda/).*

## Development Change Log
### v0.2.0
#### Add
  - add unit tests for models and an integration test for createPatron

### v0.1.1
#### Add
  - add the parameter field of "patron_agency" to streaming patron data model.

### v0.1.0
#### Add
  - add the parameter field of "patron_agency" to determine which patron type the Card Creator is going to create. Currently, the value of "patron_agency" will be "198" for NYC residents and also as the default, while "patron_agency" will be "199" for NYS residents but live outside of the city.

### v0.0.2
#### Update
  - update the swagger and JSON documentations to remove "work_or_school_address" from the parameters, as we are using production Card Creator v2. This version currently does not support "work_or_school_address".

### v0.0.1
#### Update
  - update the swagger documentation.
  - update the data structures of the responses.
  - update the route for JSON swaggger documentation.
  - update the parameters for preparing to connect to Card Creator v2.
  - update the credentials to .env files.
#### Add
  - add the data field of "ecommunications_pref" for the patron's newsletter subscription.
  - add the data streaming after creating a patron with AWS Kinesis.
  - add the data fields of "patron_id" and "barcode" in the response.
