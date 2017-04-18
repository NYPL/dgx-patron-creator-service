const url = require("url");

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

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

function modelErrorResponse(data) {
  var typeSlug = '';

  if (data && data.type) {
    const typeURL = url.parse(data.type);
    typeSlug = typeURL.pathname.split("/").pop();
  }

  return {
    data: {
      status_code_from_card_creator: data.status || null,
      type: typeSlug,
      patron: null,
      simplePatron: null,
      message: data.message,
      detail: {
        title: data.title || '',
        debug: (data.debug_message) ? parseJSON(data.debug_message) : {},
      },
      count: 0,
    },
  };
}

module.exports = {
  patronCreator: modelPatronCreatorResponse,
  errorResponse: modelErrorResponse,
};
