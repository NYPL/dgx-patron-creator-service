const modelResponse = require('../../../../api/models/v0.2/modelResponse');

const exampleStatus = 999;
const emptyPatronCreatorResponseIn = {};
const defaultPatronCreatorResponseOut = {
  count: 1,
  data: {
    patron: {},
    simplePatron: {
      barcode: '',
      detail: {},
      message: '',
      patron_id: '',
      status_code_from_ils: exampleStatus,
      temporary: false,
      type: null,
      username: '',
    },
  },
};
const examplePatronCreatorResponseIn = {
  type: 'example type',
  username: 'example username',
  temporary: 'example temporary',
  patron_id: 'example patron_id',
  barcode: 'example barcode',
  message: 'example message',
  debug_info: JSON.stringify({ example: 'example message' }),
};
const examplePatronCreatorResponseOut = {
  count: 1,
  data: {
    patron: {},
    simplePatron: {
      barcode: 'example barcode',
      detail: {
        example: 'example message',
      },
      message: 'example message',
      patron_id: 'example patron_id',
      status_code_from_ils: null,
      temporary: 'example temporary',
      type: 'example type',
      username: 'example username',
    },
  },
};

const emptyErrorResponseDataIn = {
  debug_message: JSON.stringify({ example: 'example message' }),
};
const defaultErrorResponseDataOut = {
  count: 0,
  data: {
    patron: null,
    simplePatron: {
      detail: {
        debug: {
          example: 'example message',
        },
        title: '',
      },
      message: undefined,
      status_code_from_ils: null,
      type: '',
    },
  },
};
const exampleErrorResponseDataIn = {
  status: 'example status',
  type: 'example type',
  message: 'example message',
  title: 'example title',
  debug_message: JSON.stringify({ example: 'example message' }),
};
const exampleErrorResponseDataOut = {
  count: 0,
  data: {
    patron: null,
    simplePatron: {
      detail: {
        debug: {
          example: 'example message',
        },
        title: 'example title',
      },
      message: 'example message',
      status_code_from_ils: 'example status',
      type: 'example%20type',
    },
  },
};

describe('modelPatronCreatorResponse', () => {
  it('returns defaults if given empty data', () => {
    expect(modelResponse.patronCreator(emptyPatronCreatorResponseIn, exampleStatus))
      .toEqual(defaultPatronCreatorResponseOut);
  });

  it('assigns received data to the patron object in the response', () => {
    expect(modelResponse.patronCreator(examplePatronCreatorResponseIn))
      .toEqual(examplePatronCreatorResponseOut);
  });
});

describe('modelErrorResponseData', () => {
  it('returns default error response if no data is given', () => {
    expect(modelResponse.errorResponseData(emptyErrorResponseDataIn))
      .toEqual(defaultErrorResponseDataOut);
  });

  it('assigns received data to the error response', () => {
    expect(modelResponse.errorResponseData(exampleErrorResponseDataIn))
      .toEqual(exampleErrorResponseDataOut);
  });
});
