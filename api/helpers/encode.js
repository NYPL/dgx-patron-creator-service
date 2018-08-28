/**
 * base64(string)
 * Base64-encode a string
 *
 * @param {string} string
 * @return {string}
 */
function base64(string) {
  return Buffer.from(string).toString('base64');
}

module.exports = base64;
