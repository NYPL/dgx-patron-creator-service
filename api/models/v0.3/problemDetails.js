/* eslint-disable */
const ProblemDetail = (args) => {
  const PROBLEM_DETAIL_URI = "http://librarysimplified.org/terms/problem/";

  this.status = parseInt(args["status"], 10);
  this.type = `${PROBLEM_DETAIL_URI}${args["type"]}`;
  this.title = args["title"] || "";
  this.detail = args["detail"] || "";
  this.debugMessage = args["debugMessage"] || "";

  const detailed = (detail, opts = {}) => {
    const attributes = currentValues();
    attributes["detail"] = detail;
    attributes["type"] = this.type.split("/")[-1];
    opts.forEach((key, value) => {
      attributes[key] = value;
    });
    return ProblemDetail(attributes);
  };

  const withDebug = (debugMessage) => {
    const attributes = currentValues();
    attributes["debugMessage"] = debugMessage;
    attributes["type"] = this.type.split("/")[-1];
    return ProblemDetail(attributes);
  };

  const currentValues = () => ({
    type: this.type,
    status: this.status,
    title: this.title,
    detail: this.detail,
    debugMessage: this.debugMessage,
  });

  const response = () => ({ json: currentValues, status: this.status });
};

module.exports = {
  problemDetail: ProblemDetail,
};
