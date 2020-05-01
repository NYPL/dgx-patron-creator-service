/* eslint-disable */
import UsernameValidationAPI from "./UsernameValidationAPI";
import AddressValidationAPI from "./AddressValidationAPI";

/**
 * The callback for the route "/patrons".
 * TODO: Just boilderplate for now.
 */

function createPatron(req, res) {
  // Check for right fields
  // if (!req.body) {}
  /**
   * Validate username, all example usage
   */
  // const { responses, validate } = UsernameValidationAPI();
  // let validUsername = validate(req.body.username);
  // A valid username can be available or unavailable.
  // if (validUsername === responses.available ||
  //   validUsername === responses.unavailable
  // ) {
  //   // Do an extra check to make sure the valid username is available
  //   let usernameModel = modelResponse.username(validUsername, 200);
  // } else {
  //   // Throw an error
  // }
  /**
   * Validate address
   */
  // Might be better to use the addressValidator
  // const address = new Address(req.body.address);
  // let validAddress = address.validation_response(isWorkAddress = false);
  // if (validAddress) {
  //   let addressModel = modelResponse.username(validAddress, 200);
  // } else {
  //   // Throw an error
  // }
  /**
   * Then create patron
   */
  // If validUsername && validAddress
  // use usernameModel and addressModel together to create the patron
}

export default createPatron;
