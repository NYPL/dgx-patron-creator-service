'use strict';

var SwaggerExpress = require('swagger-express-mw');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
// The module for generating the swagger doc
var SwaggerUi = require('swagger-tools/middleware/swagger-ui');
// Import controllers
var createPatron = require('./api/controllers/createPatron.js');
var hello = require('./api/controllers/hello.js');

// The parser for interpret JSON in req.body
app.use(bodyParser.json());
module.exports = app;

app.route('/')
  .get(hello.renderHello);

app.route('/v0.1/patrons')
  .post(createPatron.createPatron);

// required config
var config = {
  appRoot: __dirname
};

SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  // To generate a swagger doc page
  // After running the server, go to http://localhost:3001/docs
  app.use(SwaggerUi(swaggerExpress.runner.swagger));

  // install middleware
  swaggerExpress.register(app);

  var port = process.env.PORT || 3001;
  app.listen(port);
});
