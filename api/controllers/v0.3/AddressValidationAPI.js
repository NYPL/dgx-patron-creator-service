/**
 * A class that uses Service Objects to validate addresses.
 * TODO: Finish the implementation.
 */
const AddressValidationApi = () => {
  this.ALTERNATE_ADDRESSES_TYPE = 'alternate-addresses';
  this.UNRECOGNIZED_ADDRESS_TYPE = 'unrecognized-address';
  this.VALID_ADDRESS_TYPE = 'valid-address';

  this.RESPONSES = {
    unrecognized_address: {
      type: this.UNRECOGNIZED_ADDRESS_TYPE,
      message: 'Unrecognized address.',
    },
    alternate_addresses: {
      type: this.ALTERNATE_ADDRESSES_TYPE,
      message: 'Alternate addresses have been identified.',
    },
    valid_address: {
      type: this.VALID_ADDRESS_TYPE,
      message: 'Valid address.',
    },
  };
};

export default AddressValidationApi;
