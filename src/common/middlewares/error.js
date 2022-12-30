import { errorObj, sendError } from '../utils/error';

export const notFoundErrorHandler = (err, req, res, next) => {
  if (err instanceof NotFoundError) {
    return sendError(errorCode.NOT_FOUND, errorObj(errorCode.NOT_FOUND, err));
  }
  next(err);
};

export const unauthorizedErrorHandler = (err, req, res, next) => {
  if (err instanceof UnauthorizedError) {
    return sendError(
      errorCode.UNAUTHORIZED,
      errorObj(errorCode.UNAUTHORIZED, err),
    );
  }
  next(err);
};

export const alreadyInUseErrorHandler = (err, req, res, next) => {
  if (err instanceof AlreadyInUseError) {
    return sendError(errorCode.CONFLICT, errorObj(errorCode.CONFLICT, err));
  }
  next(err);
};

export const validationErrorHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    return sendError(
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  }
  next(err);
};

export const clientErrorHandler = (err, req, res, next) => {
  if (err instanceof ClientError) {
    return sendError(
      errorCode.BAD_REQUEST,
      errorObj(errorCode.BAD_REQUEST, err),
    );
  }
  next(err);
};

export const internalServerErrorHandler = (err, req, res, next) => {
  if (err instanceof MySqlError || err instanceof InternalServerError) {
    return sendError(
      errorCode.INTERNAL_SERVER_ERROR,
      errorObj(errorCode.INTERNAL_SERVER_ERROR, err),
    );
  }
  next(err);
};

export const productionErrorHandler = (err, req, res, next) => {
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

export default {
  notFoundErrorHandler,
  unauthorizedErrorHandler,
  alreadyInUseErrorHandler,
  validationErrorHandler,
  clientErrorHandler,
  internalServerErrorHandler,
  productionErrorHandler,
};
