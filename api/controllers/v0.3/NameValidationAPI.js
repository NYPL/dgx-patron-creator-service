/**
 * A class that uses Service Objects to validate names.
 * TODO: Finish the implementation.
 */

const NameValidationApi = () => {
  // TODO: temporary
  const validate = () => true;

  return {
    validate,
  };
};

NameValidationApi.VALID_NAME_TYPE = 'valid-name';
NameValidationApi.UNRECOGNIZED_NAME_TYPE = 'unrecognized-name';

export default NameValidationApi;