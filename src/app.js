const express = require('express');
require('express-async-errors');
require('dotenv').config();
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const sessionStore = require('./config/sessionStore');
const { errorCode } = require('./lib/statusCodes/statusCode');
const { deleteImage } = require('./lib/middlewares/ImageDelete');
const ValidationError = require('./lib/errors/validation.error');
const AlreadyInUseError = require('./lib/errors/already-in-use.error');
const NotFoundError = require('./lib/errors/not-found.error');
const MySqlError = require('./lib/errors/mysql.error');
const ClientError = require('./lib/errors/client.error.js');
const InternalServerError = require('./lib/errors/internal-sever.error');
const UnauthorizedError = require('./lib/errors/unauthorized.error');

const adminRouter = require('./routes/admin.routes');
const userRouter = require('./routes/user.routes');
const cafeRouter = require('./routes/cafe.routes');
const authRouter = require('./routes/auth.routes');

// express 인스턴스 생성
const app = express();

// 로거 출력용 logger, morgan
global.logger || (global.logger = require('./config/logger')); // 전역에서 사용
const morganMiddleware = require('./config/morganMiddleware');
const logger = require('./config/logger');
app.use(morganMiddleware); // 콘솔창에 통신결과 나오게 해주는 미들웨어

// 미들웨어 등록 시작, 아래 미들웨어들은 내부적으로 next() 가 실행됨.
app.use(
  // DB에 session 테이블 추가
  session({
    secret: process.env.SESSION_SECRET_KEY,
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
  cookieParser(process.env.SESSION_SECRET_KEY),
  cors({
    origin: true,
    credentials: true,
  }),
);

console.log(
  'path.resolve(__dirname): ',
  path.resolve(__dirname, 'uploads').replace('/src', ''),
);
console.log(
  'path.resolve(__dirname, uploads): ',
  path.resolve(__dirname, 'uploads'),
);
// 이미지 라우팅 설정
app.use(express.static(path.resolve(__dirname, 'uploads').replace('/src', '')));

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
