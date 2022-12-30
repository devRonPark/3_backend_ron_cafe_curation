// 모듈 import
const express = require('express');
require('express-async-errors');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config/config');
const sessionStore = require('./config/sessionStore');
const { deleteImage } = require('./common/middlewares/ImageDelete');

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
const errorHandler = require('./common/middlewares/error');

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
app.use(errorHandler);
// 에러 로깅 미들웨어
app.use(function errorLogger(err, req, res, next) {
  if (req.file) {
    // 에러 발생 시 업로드된 이미지 파일 삭제
    deleteImage(req.file.path);
  }
  logger.error(err.stack);
});

module.exports = app;
