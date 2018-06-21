const path = require('path');

/**
 * renderApiDoc(req, res)
 * Render the response and the service's documentation file.
 *
 * @param {HTTP request} req
 * @param {HTTP response} res
 */
function renderApiDoc(req, res) {
  const options = {
    root: path.normalize(`${__dirname}./../../api/swagger/`),
  };

  const errorCallback = (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.log(
        'status_code: 500, message: Can not load the documentation file.',
      );

      res.status(500)
        .header('Content-Type', 'application/json')
        .json({
          data: {
            type: 'internal-server-error',
            message: 'Can not load the documentation file.',
            detail: {
              title: 'File may not exist.',
              debug: '',
            },
          },
        });
    }
  };

  res.sendFile('swaggerDoc.json', options, errorCallback);
}

module.exports = {
  renderApiDoc,
};
