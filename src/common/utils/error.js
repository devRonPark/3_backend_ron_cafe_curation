const sendError = (statusCode, errorObj) =>
  res.status(statusCode).send(errorObj);
const errorObj = (statusCode, err) => {
  return {
    httpStatus: statusCode,
    type: err.name,
    message: err.message,
  };
};
const mustOne = (arr, err) => {
  if (!arr[0]) throw err;

  return arr[0];
};

module.exports = { sendError, errorObj, mustOne };
