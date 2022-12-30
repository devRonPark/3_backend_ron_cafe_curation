export const sendError = (statusCode, errorObj) =>
  res.status(statusCode).send(errorObj);
export const errorObj = (statusCode, err) => {
  return {
    httpStatus: statusCode,
    type: err.name,
    message: err.message,
  };
};
