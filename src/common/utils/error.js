const sendError = (statusCode, errorObj) =>
  res.status(statusCode).send(errorObj);
const errorObj = (statusCode, err) => {
  return {
    httpStatus: statusCode,
    type: err.name,
    message: err.message,
  };
};

module.exports = { sendError, errorObj };
