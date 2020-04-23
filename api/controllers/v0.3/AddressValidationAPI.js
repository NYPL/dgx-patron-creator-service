/**
 * A class that uses Service Objects to validate addresses.
 * TODO: Finish the implementation.
 */
const AddressValidationApi = () => {
  const ALTERNATE_ADDRESSES_TYPE = 'alternate-addresses';
  const UNRECOGNIZED_ADDRESS_TYPE = 'unrecognized-address';
  const VALID_ADDRESS_TYPE = 'valid-address';

  const RESPONSES = {
    unrecognized_address: {
      type: UNRECOGNIZED_ADDRESS_TYPE,
      message: 'Unrecognized address.',
    },
    alternate_addresses: {
      type: ALTERNATE_ADDRESSES_TYPE,
      message: 'Alternate addresses have been identified.',
    },
    valid_address: {
      type: VALID_ADDRESS_TYPE,
      message: 'Valid address.',
    },
  };

  return {
    responses: RESPONSES,
  };
};

export default AddressValidationApi;
