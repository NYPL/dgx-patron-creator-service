/* eslint-disable */
const ProblemDetail = (args) => {
  const PROBLEM_DETAIL_URI = "http://librarysimplified.org/terms/problem/";

  const status = parseInt(args["status"], 10) || 500;
  const type = `${PROBLEM_DETAIL_URI}${args["type"]}`;
  const title = args["title"] || "";
  const detail = args["detail"] || "";
  const debugMessage = args["debugMessage"] || "";

  const withDebug = (debugMessage) => {
    const attributes = currentValues();
    attributes["debugMessage"] = debugMessage;
    attributes["type"] = type.split("/").pop();
    return ProblemDetail(attributes).response();
  };

  const currentValues = () => ({
    type,
    status,
    title,
    detail,
    debugMessage,
  });

  const response = () => ({ json: currentValues(), status });

  return {
    withDebug,
    response,
  };
};

export default ProblemDetail;
