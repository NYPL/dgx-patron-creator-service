// The credentials for NYPL's Simplified Card Creator API
const { KMSClient, DecryptCommand } = require("@aws-sdk/client-kms");

const kms = new KMSClient({
  region: "us-east-1",
});

const decryptKMS = async (key) => {
  const params = {
    CiphertextBlob: Buffer.from(key, "base64"),
  };

  const command = new DecryptCommand(params);
  const response = await kms.send(command);

  const plaintextBytes = response.Plaintext;
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(plaintextBytes);
};

module.exports = {
  decryptKMS,
};
