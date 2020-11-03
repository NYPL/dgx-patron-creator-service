"use strict";

const awsServerlessExpress = require("aws-serverless-express");
const app = require("./app");
const server = awsServerlessExpress.createServer(app);

/**
 * This handler function is the main function that will be used as the AWS
 * Lambda function. Internally, we are using `aws-serverless-express` to turn
 * our Express app into a serverless-compatible function that can be used
 * as an AWS Lambda.
 */
exports.handler = (event, context) =>
  awsServerlessExpress.proxy(server, event, context);
