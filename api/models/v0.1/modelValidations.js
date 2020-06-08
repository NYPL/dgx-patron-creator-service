/**
 * modelUsernameResponse(data, status)
 * Model the response from calling the route "/username".
 *
 * @param {object} data
 * @param {number} status
 * @return {object}
 */
function modelUsernameResponse(data, status) {
  const detail = data && data.debug_message ? JSON.parse(data.debug_message) : {};

  return {
    data: {
      status_code_from_card_creator: status || null,
      valid: data && data.type === 'available-username',
      type: data.type || '',
      card_type: data.card_type || null,
      message: data.message || '',
      detail,
    },
  };
}

/**
 * modelAddressResponse(data, status)
 * Model the response from calling the route "/address".
 *
 * @param {object} data
 * @param {number} status
 * @return {object}
 */
function modelAddressResponse(data, status) {
  const addresses = [];
  const detail = data && data.debug_message ? JSON.parse(data.debug_message) : {};

  // the response could have only one valid address or multiple possible addresses
  if (data && data.addresses && data.addresses.length) {
    data.addresses.forEach((addressArray) => {
      if (addressArray.address) {
        addresses.push(addressArray.address);
      }
    });
  } else if (data.address) {
    addresses.push(data.address);
  }

  return {
    data: {
      status_code_from_card_creator: status || null,
      valid:
        (data && data.type === 'valid-address')
        || data.type === 'alternate-addresses',
      type: data.type || '',
      card_type: data.card_type || null,
      message: data.message || '',
      detail,
      addresses: addresses || null,
      original_address: data.original_address || null,
    },
  };
}

module.exports = {
  username: modelUsernameResponse,
  address: modelAddressResponse,
};
