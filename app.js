const express = require('express');
const morgan = require('morgan');
const path = require('path');

require('dotenv').config();

const userRouter = require('./routes/user.routes');

// express 인스턴스 생성
const app = express();

app.set('port', process.env.PORT || 3000);

app.use(
  // 요청, 응답에 대한 좀 더 디테일한 로그 출력
  morgan('dev'),
  // json request body 파싱
  express.json(),
  // 요청 경로의 querystring 해석
  express.urlencoded({ extended: true }),
);

app.use('/users', userRouter);

app.listen(app.get('port'), () => {
  console.log(`Example app listening at http://localhost:${app.get('port')}`);
});
