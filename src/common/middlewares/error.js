export const notFoundErrorHandler = (err, req, res, next) => {
  if (err instanceof NotFoundError) {
    res.status(errorCode.NOT_FOUND).send({
      httpStatus: errorCode.NOT_FOUND,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
};

export const unauthorizedErrorHandler = (err, req, res, next) => {
  if (err instanceof UnauthorizedError) {
    res.status(errorCode.UNAUTHORIZED).send({
      httpStatus: errorCode.UNAUTHORIZED,
      type: err.name,
      message: err.message,
    });
  }
  next(err);
};

export const alreadyInUseErrorHandler = (err, req, res, next) => {
  if (err instanceof AlreadyInUseError) {
    res.status(errorCode.CONFLICT).send({
      httpStatus: errorCode.CONFLICT,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
};

export const validationErrorHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    res.status(errorCode.BAD_REQUEST).json({
      httpStatus: errorCode.BAD_REQUEST,
      type: err.name,
      message: err.message,
      validationErrors: err.validationErrors,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
};

export const clientErrorHandler = (err, req, res, next) => {
  if (err instanceof ClientError) {
    res.status(errorCode.BAD_REQUEST).json({
      httpStatus: errorCode.BAD_REQUEST,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
};

export const internalServerErrorHandler = (err, req, res, next) => {
  if (err instanceof MySqlError || err instanceof InternalServerError) {
    res.status(errorCode.INTERNAL_SERVER_ERROR).json({
      httpStatus: errorCode.INTERNAL_SERVER_ERROR,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
};

export const productionErrorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    // Multer error - see https://github.com/expressjs/multer/blob/master/lib/multer-error.js && https://github.com/expressjs/multer#error-handling
    return res.status(errorCode.BAD_REQUEST).json({
      httpStatus: errorCode.BAD_REQUEST,
      message: err.code + ' ' + err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  } else {
    res.status(err.status || errorCode.INTERNAL_SERVER_ERROR);
    res.send({
      httpStatus: errorCode.INTERNAL_SERVER_ERROR,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
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
