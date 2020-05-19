/**
 * A class that uses Service Objects to validate addresses.
 * TODO: Finish the implementation.
 */
const AddressValidationApi = () => {
  const RESPONSES = {
    unrecognized_address: {
      type: AddressValidationApi.UNRECOGNIZED_ADDRESS_TYPE,
      message: 'Unrecognized address.',
    },
    alternate_addresses: {
      type: AddressValidationApi.ALTERNATE_ADDRESSES_TYPE,
      message: 'Alternate addresses have been identified.',
    },
    valid_address: {
      type: AddressValidationApi.VALID_ADDRESS_TYPE,
      message: 'Valid address.',
    },
  };

  return {
    responses: RESPONSES,
  };
};

AddressValidationApi.ALTERNATE_ADDRESSES_TYPE = 'alternate-addresses';
AddressValidationApi.UNRECOGNIZED_ADDRESS_TYPE = 'unrecognized-address';
AddressValidationApi.VALID_ADDRESS_TYPE = 'valid-address';

module.exports = AddressValidationApi;
