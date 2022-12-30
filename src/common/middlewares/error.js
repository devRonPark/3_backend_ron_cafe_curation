const { errorObj, sendError } = require('../utils/error');

const devModeErrorHandler = (err, req, res, next) => {
  if (err instanceof NotFoundError) {
    return sendError(errorCode.NOT_FOUND, errorObj(errorCode.NOT_FOUND, err));
  } else if (err instanceof UnauthorizedError) {
    return sendError(
      errorCode.UNAUTHORIZED,
      errorObj(errorCode.UNAUTHORIZED, err),
    );
  } else if (err instanceof AlreadyInUseError) {
    return sendError(errorCode.CONFLICT, errorObj(errorCode.CONFLICT, err));
  } else if (err instanceof ValidationError) {
    return sendError(
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  } else if (err instanceof ClientError) {
    return sendError(
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  } else if (err instanceof MySqlError || err instanceof InternalServerError) {
    return sendError(
      errorCode.INTERNAL_SERVER_ERROR,
      errorObj(errorCode.INTERNAL_SERVER_ERROR, err),
    );
  }

  next(err);
};

const errorHandler = (err, req, res, next) => {
  const mode = process.env.NODE_ENV;
  // 배포/개발 환경에 따른 에러 핸들러 분리
  if (mode === 'production') {
    prodModeErrorHandler(err, req, res, next);
  } else {
    devModeErrorHandler(err, req, res, next);
  }
};

const prodModeErrorHandler = (err, req, res, next) => {
  let errorObj = {};
  if (res.headersSent) {
    return next(err);
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    // Multer error - see https://github.com/expressjs/multer/blob/master/lib/multer-error.js && https://github.com/expressjs/multer#error-handling
    return sendError(
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  } else {
    return sendError(
      err.status || errorCode.INTERNAL_SERVER_ERROR,
      errorObj(errorCode.INTERNAL_SERVER_ERROR, err),
    );
  }
};

module.exports = errorHandler;
