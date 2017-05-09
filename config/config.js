// The endpoints for NYPL's Simplified Card Creator API
module.exports = {
  ccBase: process.env.CARD_CREATOR_BASE_URL,
  ccUsername: process.env.CARD_CREATOR_USERNAME,
  ccPassword: process.env.CARD_CREATOR_PASSWORD,
  ccCreatePatron: 'create_patron',
  patronSchemaName: 'Patron',
};
