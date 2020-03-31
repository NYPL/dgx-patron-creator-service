[![Build Status](https://travis-ci.org/NYPL/dgx-patron-creator-service.svg?branch=development)](https://travis-ci.org/NYPL/dgx-patron-creator-service)

# dgx-patron-creator-service

This is the repository of the New York Public Library's Patron Creator microservice. The microservice offers the API endpoint to create a new patron with the information from the "Get a Library Card" form.

[Github link to the repository](https://github.com/NYPL/dgx-patron-creator-service).

The Library Card app form on NYPL's website will fire a POST request to the service after it has been submitted. The service will then take the information and fire another POST request to NYPL Simplified's Card Creator API. Finally, it will return the results based on the response from the Card Creator API.

The Card Creator's documentation can be found [here](https://github.com/NYPL-Simplified/card-creator).

This app serves the following endpoints:

- `POST /api/v0.1/patrons`
- `POST /api/v0.2/patrons`
- `GET /docs/patron-creator`

See also [PatronService](https://github.com/NYPL-discovery/patron-service), [PatronEligibilityService](https://github.com/NYPL-discovery/patron-eligibility-service), [BarcodeService](https://github.com/NYPL/barcode-service) for other patron endpoints.

## Version

v0.3.1

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

_Please contact [NYPL's Simplified Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials._
_Please contact an NYPL engineer to get AWS credentials for NYPL's accounts._

### Start the service

To execute the service locally, run

```sh
$ npm start
```

The server will run on _localhost:3001_.

### Credentials

You need credentials for making a successful API call to NYPL's Simplified Card Creator. You should set the credentials in the `.env` file. For example,

```javascript
CARD_CREATOR_USERNAME = username;
CARD_CREATOR_PASSWORD = password;
```

_Please contact [NYPL's Simplified Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials._

### API Routes

#### 1. Create a Patron

With valid credentials, now you can make a POST request to _localhost:3001/api/v0.1/patrons_ to create a new patron.

The request data format should be in JSON with required fields of "name", "dateOfBirth", "address", "username", and "pin". The username must be unique. Example data for API v0.1:

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

_Notice: `ecommunications_pref` takes a boolean type of value from "Get a Library Card" form, but it will output a string as `s` or `-` based on `true` or `false`. The reason is that the Card Creator API takes `s` or `-`._

_Notice: `patron_agency` is for telling the Card Creator which patron type is going to be created. While `198` is default and for NYC residents, `199` is for NYS residents who do not live in NYC. Other patron types are also available. See your ILS for details._

Example of a successful JSON response from API v0.1:

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

| type                         | status | title                         | detail                                                                                  | debug_message |
| ---------------------------- | :----: | ----------------------------- | --------------------------------------------------------------------------------------- | ------------- |
| 'remote-integration-failure' |  502   | 'Third-party service failed.' | 'The library could not complete your request because a third-party service has failed.' | -             |
| 'invalid-request'            |  400   | 'Invalid request.'            | 'Valid request parameters are required.'                                                | Varies        |
| 'no-available-barcodes'      |  422   | 'No available barcodes.'      | 'There are no barcodes currently available.'                                            | -             |

### JSON Documentation

Visit _http://localhost:3001/docs/patron-creator_ for the JSON version of the service swagger documentation.

## Testing

### Unit tests

Run `npm test` to run the unit tests.

### Integration tests

Use `npm start` to run the app in one window. This is required to run the integration tests. The integration tests uses a local server the QA instance of Card Creator and the Patron Kinesis stream in the NYPL AWS Sandbox environment.

Use `INTEGRATION_TESTS=true npm test` in a second window to run all the tests. Check the server to ensure that you see the message "Published to stream successfully!" to verify that the integration test exercised the Kinesis stream.

## Deployment

Travis CI/CD is used to deploy the Lambda to AWS. Sensitive environment variables for AWS Lambda are encrypted in source control and decrypted by AWS as part of deployment.

The Travis configuration sets up automatic deployment to NYPl's development and production AWS accounts on the `development`, `qa`, and `master` branches. When new code is merged into each branch, and the tests pass, Travis will deploy to the appropriate environment.

If any endpoints were added or updated, make sure to make the corresponding update in the AWS API Gateway.

## Contributing

There are currently three branches that correspond to the environment they deploy to on NYPL AWS's account. The `development` branch deploys to the AWS Sandbox development account. Both the `qa` and `master` branches deploy to the AWS nypl-digital-dev account.

Because of the different environments, the following git branch workflow is used:

- Branch off `development` for your feature branch.
- Create a PR pointing to `development`.
- Once `development` is updated, merge `development` into `qa`.
- Finally, after testing the QA server and endpoints, merge `qa` into `master`.
