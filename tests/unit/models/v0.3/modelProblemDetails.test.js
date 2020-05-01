const ProblemDetail = require('../../../../api/models/v0.3/problemDetail');

describe('ProblemDetail', () => {
  const PROBLEM_DETAIL_URI = 'http://librarysimplified.org/terms/problem/';
  const pd = ProblemDetail({
    status: 200,
    type: 'ILS_Error',
    title: 'some title',
  });

  it('returns a simple json object', () => {
    expect(pd.response()).toEqual({
      status: 200,
      json: {
        type: `${PROBLEM_DETAIL_URI}ILS_Error`,
        status: 200,
        title: 'some title',
        detail: '',
        debugMessage: '',
      },
    });
  });

  it('returns a problem detail with a debug message', () => {
    const debug = pd.withDebug('let us debug this');

    expect(debug).toEqual({
      status: 200,
      json: {
        type: `${PROBLEM_DETAIL_URI}ILS_Error`,
        status: 200,
        title: 'some title',
        detail: '',
        debugMessage: 'let us debug this',
      },
    });
  });
});
