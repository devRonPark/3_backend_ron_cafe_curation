const logger = require('../../config/logger');
const {
  AlreadyInUseError,
  ClientError,
  InternalServerError,
  MySqlError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} = require('../errors/index');
const { errorCode } = require('../statusCodes/statusCode');
const { errorObj, sendError } = require('../utils/error');

const errorHandler = (err, req, res, next) => {
  logger.info(res);
  const mode = process.env.NODE_ENV;
  // 배포/개발 환경에 따른 에러 핸들러 분리
  if (mode === 'production') {
    prodModeErrorHandler(err, req, res, next);
  } else {
    devModeErrorHandler(err, req, res, next);
  }
};

const devModeErrorHandler = (err, req, res, next) => {
  if (err instanceof NotFoundError) {
    return sendError(
      res,
      errorCode.NOT_FOUND,
      errorObj(errorCode.NOT_FOUND, err),
    );
  } else if (err instanceof UnauthorizedError) {
    return sendError(
      res,
      errorCode.UNAUTHORIZED,
      errorObj(errorCode.UNAUTHORIZED, err),
    );
  } else if (err instanceof AlreadyInUseError) {
    return sendError(
      res,
      errorCode.CONFLICT,
      errorObj(errorCode.CONFLICT, err),
    );
  } else if (err instanceof ValidationError) {
    return sendError(
      res,
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  } else if (err instanceof ClientError) {
    return sendError(
      res,
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  } else if (err instanceof MySqlError || err instanceof InternalServerError) {
    return sendError(
      res,
      errorCode.INTERNAL_SERVER_ERROR,
      errorObj(errorCode.INTERNAL_SERVER_ERROR, err),
    );
  }

  next(err);
};

const prodModeErrorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    // Multer error - see https://github.com/expressjs/multer/blob/master/lib/multer-error.js && https://github.com/expressjs/multer#error-handling
    return sendError(
      res,
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  } else {
    return sendError(
      res,
      err.status || errorCode.INTERNAL_SERVER_ERROR,
      errorObj(errorCode.INTERNAL_SERVER_ERROR, err),
    );
  }
};

module.exports = errorHandler;
