const express = require('express');
// session 객체를 req 에 추가해주는 모듈
const session = require('express-session');
require('dotenv').config();
const sessionStore = require('./config/sessionStore');
const userRouter = require('./routes/user.routes');
const cafeRouter = require('./routes/cafe.routes');
const commentRouter = require('./routes/comment.routes');
const { loadUserData, addLogout } = require('./middlewares/middlewares');

// express 인스턴스 생성
const app = express();

// 로거 출력용 logger, morgan
global.logger || (global.logger = require('./config/logger')); // 전역에서 사용
const morganMiddleware = require('./config/morganMiddleware');
const adminRouter = require('./routes/admin.routes');
app.use(morganMiddleware); // 콘솔창에 통신결과 나오게 해주는 미들웨어

// 미들웨어 등록 시작, 아래 미들웨어들은 내부적으로 next() 가 실행됨.
app.use(
  // json request body 파싱
  express.json(),
  // url을 통해 전달되는 데이터에 한글, 공백 등과 같은 문자가 포함될 경우 제대로 인식되지 않는 문제 해결
  express.urlencoded({ extended: false }),
  // DB에 session 테이블 추가
  session({
    secret: process.env.SESSION_SECRET_KEY,
    store: sessionStore,
    resave: false, // 세션 아이디를 접속할 때마다 발급하지 않는다.
    saveUninitialized: true, // 세션이 저장되기 전에 uninitialized 상태로 미리 만들어서 저장한다
  }),
  loadUserData(),
  addLogout(),
);

app.get('/', (req, res) => {
  res.json(req.userInfo);
});
app.use('/user', userRouter);
// 카페 정보 등록, 수정, 삭제할 수 있는 라우터 추가
app.use('/cafes', cafeRouter);
app.use('/admin', adminRouter);
app.use('/comments', commentRouter);
app.get('/debug', (req, res) => {
  console.log(req.session.userid);
  if (!req.session.userid) {
    return res.status(400).json({ message: '세션 데이터가 존재하지 않음.' });
  }
  res.json({
    'req.session': req.session, // 세션 데이터
  });
});

module.exports = app;
