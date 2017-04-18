function modelPatronCreatorResponse(data, status) {
  const detail = (data && data.debug_info) ? JSON.parse(data.debug_info) : {};

  return {
    data: {
      status_code_from_card_creator: status || null,
      patron: {},
      simplePatron: {
        type: data.type || null,
        username: data.username || '',
        temporary: data.temporary || false,
      },
      message: data.message || '',
      detail,
      count: 1,
    },
  };
}

function modelErrorResponse(data) {

  return {
    data: {
      status_code_from_card_creator: data.status || null,
      type: data.type || null,
      patron: null,
      simplePatron: null,
      message: data.message,
      detail: {
        title: data.title || '',
        debug: (data.debug_message) ? JSON.parse(data.debug_message) : {},
      },
      count: 0,
    },
  };
}

module.exports = {
  patronCreator: modelPatronCreatorResponse,
  errorResponse: modelErrorResponse,
};