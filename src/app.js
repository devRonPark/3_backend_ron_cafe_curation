// 모듈 import
const express = require('express');
require('express-async-errors');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config/config');
const sessionStore = require('./config/sessionStore');
const { errorCode } = require('./common/statusCodes/statusCode');
const { deleteImage } = require('./common/middlewares/ImageDelete');
const {
  ValidationError,
  AlreadyInUseError,
  NotFoundError,
  MySqlError,
  InternalServerError,
  UnauthorizedError,
  ClientError,
} = require('./common/errors');

const adminRouter = require('./modules/admin/admin.router');
const userRouter = require('./modules/user/user.router');
const cafeRouter = require('./modules/cafe/cafe.router');
const authRouter = require('./modules/auth/auth.router');

// express 인스턴스 생성
const app = express();

// middleware setup
global.logger || (global.logger = require('./config/logger'));
const morganMiddleware = require('./config/morganMiddleware');
const logger = require('./config/logger');

app.use(
  morganMiddleware,
  // DB에 session 테이블 추가
  session({
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // true일 경우, 모든 요청에 대해 session 이 새로 생성되어 session 스토어에 저장된다.
    cookie: {
      secure: false,
      httpOnly: true,
    },
    name: 'sessionID',
  }),
  // json request body 파싱
  express.json(),
  // url을 통해 전달되는 데이터에 한글, 공백 등과 같은 문자가 포함될 경우 제대로 인식되지 않는 문제 해결
  express.urlencoded({ extended: true }),
  // 쿠키 파서 미들웨어
  cookieParser(config.sessionSecret),
  cors({
    origin: true,
    credentials: true,
  }),
  express.static(path.resolve(__dirname, 'uploads').replace('/src', '')),
);

// router
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/cafes', cafeRouter);
app.use('/api/admin', adminRouter);

// error handlers
// select 로 조회 시 검색된 데이터가 없을 경우 NotFoundError 발생
app.use(function handleNotFoundError(err, req, res, next) {
  if (err instanceof NotFoundError) {
    res.status(errorCode.NOT_FOUND).send({
      httpStatus: errorCode.NOT_FOUND,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
});
app.use(function handleUnauthorizedError(err, req, res, next) {
  if (err instanceof UnauthorizedError) {
    res.status(errorCode.UNAUTHORIZED).send({
      httpStatus: errorCode.UNAUTHORIZED,
      type: err.name,
      message: err.message,
    });
  }
  next(err);
});
// select 로 조회 시 이미 해당 이름으로 등록된 데이터가 있을 경우 AlreadyInUseError 발생
app.use(function handleAlreadyInUseError(err, req, res, next) {
  if (err instanceof AlreadyInUseError) {
    res.status(errorCode.CONFLICT).send({
      httpStatus: errorCode.CONFLICT,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
});
// Client로부터 전달 받은 데이터(req.params, req.query, req.body)가 서버에서 정한 규칙에 위배될 경우 ValidationError 발생
app.use(function handleValidationError(err, req, res, next) {
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
});
// Client Error 핸들링
app.use(function handleClientError(err, req, res, next) {
  if (err instanceof ClientError) {
    res.status(errorCode.BAD_REQUEST).json({
      httpStatus: errorCode.BAD_REQUEST,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
});

app.use(function handleInternalServerError(err, req, res, next) {
  if (err instanceof MySqlError || err instanceof InternalServerError) {
    res.status(errorCode.INTERNAL_SERVER_ERROR).json({
      httpStatus: errorCode.INTERNAL_SERVER_ERROR,
      type: err.name,
      message: err.message,
      stack: app.get('env') === 'development' ? err.stack : {},
    });
  }
  next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
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
});
// 에러 로깅 미들웨어
app.use(function errorLogger(err, req, res, next) {
  if (req.file) {
    // 에러 발생 시 업로드된 이미지 파일 삭제
    deleteImage(req.file.path);
  }
  logger.error(err.stack);
});

module.exports = app;
