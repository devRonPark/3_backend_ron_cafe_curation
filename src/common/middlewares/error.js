import { sendError } from '../util';

export const notFoundErrorHandler = (err, req, res, next) => {
  if (err instanceof NotFoundError) {
    const errorObj = {
      httpStatus: errorCode.NOT_FOUND,
      type: err.name,
      message: err.message,
    };
    return sendError(errorCode.NOT_FOUND, errorObj);
  }
  next(err);
};

export const unauthorizedErrorHandler = (err, req, res, next) => {
  if (err instanceof UnauthorizedError) {
    const errorObj = {
      httpStatus: errorCode.UNAUTHORIZED,
      type: err.name,
      message: err.message,
    };
    return sendError(errorCode.UNAUTHORIZED, errorObj);
  }
  next(err);
};

export const alreadyInUseErrorHandler = (err, req, res, next) => {
  if (err instanceof AlreadyInUseError) {
    const errorObj = {
      httpStatus: errorCode.CONFLICT,
      type: err.name,
      message: err.message,
    };
    return sendError(errorCode.CONFLICT, errorObj);
  }
  next(err);
};

export const validationErrorHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    const errorObj = {
      httpStatus: errorCode.BAD_REQUEST,
      type: err.name,
      message: err.message,
      validationErrors: err.validationErrors,
    };
    return sendError(errorCode.BAD_REQUEST, errorObj);
  }
  next(err);
};

export const clientErrorHandler = (err, req, res, next) => {
  if (err instanceof ClientError) {
    const errorObj = {
      httpStatus: errorCode.BAD_REQUEST,
      type: err.name,
      message: err.message,
    };
    return sendError(errorCode.BAD_REQUEST, errorObj);
  }
  next(err);
};

export const internalServerErrorHandler = (err, req, res, next) => {
  if (err instanceof MySqlError || err instanceof InternalServerError) {
    const errorObj = {
      httpStatus: errorCode.INTERNAL_SERVER_ERROR,
      type: err.name,
      message: err.message,
    };
    return sendError(errorCode.INTERNAL_SERVER_ERROR, errorObj);
  }
  next(err);
};

export const productionErrorHandler = (err, req, res, next) => {
  let errorObj = {};
  if (res.headersSent) {
    return next(err);
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    // Multer error - see https://github.com/expressjs/multer/blob/master/lib/multer-error.js && https://github.com/expressjs/multer#error-handling
    errorObj = {
      httpStatus: errorCode.BAD_REQUEST,
      message: err.code + ' ' + err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    };

    return sendError(errorCode.BAD_REQUEST, errorObj);
  } else {
    errorObj = {
      httpStatus: errorCode.INTERNAL_SERVER_ERROR,
      type: err.name,
      message: err.message,
    };
    return sendError(err.status || errorCode.INTERNAL_SERVER_ERROR, errorObj);
  }
};

export default {
  notFoundErrorHandler,
  unauthorizedErrorHandler,
  alreadyInUseErrorHandler,
  validationErrorHandler,
  clientErrorHandler,
  internalServerErrorHandler,
  productionErrorHandler,
};
