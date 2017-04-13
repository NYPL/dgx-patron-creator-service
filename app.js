const SwaggerExpress = require('swagger-express-mw');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
// The module for generating the swagger doc
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
// Import controllers
const createPatron = require('./api/controllers/createPatron.js');

// The parser for interpret JSON in req.body
app.use(bodyParser.json());

app.route('/api/v0.1/patrons')
  .post(createPatron.createPatron);

// required config
const config = {
  appRoot: __dirname,
};

SwaggerExpress.create(config, (err, swaggerExpress) => {
  if (err) { throw err; }

  // To generate a swagger doc page
  // After running the server, go to http://localhost:3001/docs
  app.use(SwaggerUi(swaggerExpress.runner.swagger));

  // install middleware
  swaggerExpress.register(app);
});

const port = process.env.PORT || 3001;
app.listen(port);

module.exports = app;
