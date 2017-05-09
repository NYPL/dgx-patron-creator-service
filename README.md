# dgx-patron-creator-service

This is the repository of the New York Public Library's patron creator microservice. The micorservice offers the API endpoint to create a new patron with the information from the "Get a Library Card" form.

The Link to the repository from [here](https://bitbucket.org/NYPL/dgx-patron-creator-service).

The form on NYPL's website will fire a POST request to the service after it has been submitted. The service will then take the information and fire another POST request to NYPL Simplified's Card Creator API. Finally, it will reply the results based on the responses from the Card Creator API.

The Card Creator's documentation can be found [here](https://github.com/NYPL-Simplified/card-creator).

## Version
v0.0.1

## Technologies

  - [AWS Lambda](https://aws.amazon.com/lambda/) - The service will serve as an AWS Lambda instance.
  - [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) - The server is built with ExpressJS with the npm module specifically for AWS Lambda.
  - [Swagger](http://swagger.io/) - The framework for the API documentation and architecture.
  - [node-lambda](https://www.npmjs.com/package/node-lambda) - The npm module helps us deploy this Express application as an AWS Lambda instance.
  - [helmet](https://helmetjs.github.io/docs/) - The npm module to improve security.
  - [yamljs](https://www.npmjs.com/package/yamljs) - The npm module helps convert the YAML swagger documentation to JSON format and vice versa.

## Configuration

To setup the app configuration. copy the `.env.example` file to `.env` and update the necessary configuration parameters.

You need credentials for making a successful API call to NYPL's Simplied Card Creator and AWS credentials to connect to Kinesis.

Please contact [NYPL's Simplied Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials.


## Install and Run

Clone the repo. Open your terminal and in the folder you just downloaded, run 
```sh
$ npm install
```

And then we need to install swagger globally, please run

```sh
$ npm install swagger -g
```

### Start the service
To execute the service locally, run 
```sh
$ npm start
```
The server will be executed on _localhost:3001_. As the help from swagger, you don't need to restart the server to see the changes you made to the code.

### Call the APIs

You need credentials for making a successful API call to NYPL's Simplied Card Creator. You should set this credentials
in the `.env` file and, for deployments, in the `deploy_environment.env` files.

```javascript
CARD_CREATOR_USERNAME=username
CARD_CREATOR_PASSWORD=password
```

Please contact [NYPL's Simplied Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials.

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
    "work_or_school_address": {
      "line_1": "123 Fake Street",
      "line_2": "",
      "city": "New York",
      "state": "NY",
      "zip": 10018
    },
    "ecommunications_pref": true,
    "policy_type": "web_applicant"
  }
}
```
*Notice: `ecommunications_pref` takes a boolean type of value from "Get a Library Card" form, but it will output a string as `s` or `-` based on `true` or `false`. The reason is that the Card Creator API takes `s` or `-`.*

A successful JSON response example will be as below,

```javascript
{
  "data": {
    "status_code_from_card_creator": 200,
    patron: {},
    simplePatron: {
      "type": "card-granted",
      "username": "mikeolson54321",
      "temporary": true
    },
    "message": "Your library card is temporary because your address could not be verified. Visit your local NYPL branch within 30 days to upgrade to a standard card.",
    "detail": {},
    "count": 1
  }
}
```

Three kinds of error messages could be returned from the Card Creator API.

| type   | status   | title   | detail   | debug_message   |
|--------|:--------:|---------|----------|-----------------|
|'remote-integration-failure'|502|'Third-party service failed.'|'The library could not complete your request because a third-party service has failed.'|-|
|'invalid-request'|400|'Invalid request.'|'Valid request parameters are required.'|Varies|
| 'no-available-barcodes'|422|'No available barcodes.'|'There are no barcodes currently available.'|-|

#### 2. JSON Documentation

Visit _http://localhost:3001/docs/patron_creator_ for the JSON version of the service swagger documentation.

### Visit and Edit the Swagger Documentation

Visit _http://localhost:3001/docs_ to see your API service's documentation if executing the service locally(Be sure you have swagger installed globally already).

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

## Deployment

To deploy the service as an AWS Lambda instance, we need the npm module [node-lambda](https://www.npmjs.com/package/node-lambda). Please go to the URL and install it globally by running

```sh
$ npm install -g node-lambda
```

Also, if you haven't installed [yamljs](https://www.npmjs.com/package/yamljs), you need to install it now. Run

```sh
$ npm install -g yamljs
```

Third, copy the `deploy_env.env.example` in the root of the folder, to the appropriate environment.
For example to deploy to the QA environment, copy the file to `deploy_qa.env`.

After setting up the "deploy_qa.env" and "deploy_production.env" files, run
```sh
$ npm deploy-package-qa
```
or
```sh
$ npm deploy-package-production
```

*To get your AWS Lambda service credentials, please visit [AWS Lambda's website](https://aws.amazon.com/lambda/).*

It will deploy your server as a Lambda instance to your AWS account.

## Development Change Log

### v0.0.1
#### Update
  - update the swagger documentation.
  - update the data structures of the responses.
  - update the route for JSON swaggger documentation.
  - update the parameters for preparing to connect to Card Creator v2.
#### Add
  - add the data field of "ecommunications_pref" for the patron's newsletter subscription.
