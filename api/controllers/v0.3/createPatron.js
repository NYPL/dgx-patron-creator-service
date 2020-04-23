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
  // const usernameValidator = new UsernameValidationAPI();
  // let validUsername = usernameValidator.validate(req.body.username);
  // if (validUsername) {
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
