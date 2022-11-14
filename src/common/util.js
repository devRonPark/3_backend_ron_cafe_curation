const { errorCode, successCode } = require('./statusCodes/statusCode');
const ClientError = require('./errors/client.error.js');
const mysql = require('mysql2/promise');
// 콘솔 창의 텍스트 색깔 변경
const colors = require('colors');
// 콘솔 창에 현재 날짜 및 시간 출력
const moment = require('moment');
// 랜덤한 토큰을 생성하기 위해 사용
const crypto = require('crypto');
// 카페의 위치 데이터 값 중부원점 >> WGS84 좌표계로 변환
const proj4 = require('proj4');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');
require('moment-timezone');
// 시간대는 한국 서울 기준
moment.tz.setDefault('Asia/Seoul');
// 텍스트 색깔 선택 옵션 활성화
colors.enable();

exports.printSqlLog = (sql, params) => {
  // 콘솔에 출력할 sql문 생성
  const executedSql = params ? mysql.format(sql, params) : mysql.format(sql);
  logger.info(
    `[${moment().format(
      'YYYY-MM-DD HH:mm:ss',
    )}] [ 실행된 SQL문 ] ${executedSql} `.blue,
  );
};
exports.printCurrentTime = () => {
  return moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
};
// DATETIME 형식으로 변경
exports.convertToDateTimeFormat = date => {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

const currentDate = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
console.log(typeof currentDate);
setTimeout(() => {
  const afterDate = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  console.log('currentDate: ', currentDate);
  console.log('afterDate: ', afterDate);
  console.log('difference: ', moment().subtract(afterDate, currentDate));
}, 5000);
// min ~ max 까지 랜덤으로 숫자 생성
// TODO 현재 시간까지 추가 권장
exports.generateRandomNumber = (min, max) => {
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNumber;
};
exports.generateRandomToken = () => {
  return crypto.randomBytes(20).toString('hex');
};
exports.convertLocationData = coordinateObj => {
  // EPSG:2097 좌표계
  const epsg2097 =
    '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';

  //wgs84(위경도)좌표계
  const wgs84 =
    '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';
  // let coord = proj4(fromProjection, toProjection, coordinates);
  // fromProjection : 변환 대상 좌표계, toProjection : 변환 목표 좌표계, coordinates : 객체 또는 배열 형태 (예시 {x: 'x', y: 'y'} 또는 [x, y])
  const coord = proj4(epsg2097, wgs84, coordinateObj);
  return { latitude: coord.y, longitude: coord.x };
};

// 로그인 여부 판단
exports.isLoggedIn = (req, res, next) => {
  // 로그인하지 않은 경우
  if (!req.session.userid) {
    return res.status(successCode.OK).json({ message: 'LOGIN_REQUIRED' });
  }
  // 현재 로그인한 상태라면
  next();
};
// 로그인한 사용자 id와 req.params.id 일치 여부 파악
exports.isLoginUserInfo = (req, res, next) => {
  let { userId } = req.params;
  // req.params.userId 는 string이므로 숫자로 변환 필요
  userId = parseInt(userId, 10);
  if (req.session.userid !== userId) {
    return next(
      new ClientError('Req.params.id does not same with loginUser id'),
    );
  }
  next();
};
// 로그인하지 않았는지
exports.isNotLoggedIn = (req, res, next) => {
  // 로그인하지 않은 경우
  if (req.session.userid) {
    return res.status(errCode.FORBIDDEN).json({ message: 'ALREADY_LOGGED_IN' });
  }
  // 현재 로그인 안 한 상태라면(로그인 페이지, 회원가입 페이지 접근 가능)
  next();
};
// 접근 가능 여부 판단
exports.hasNoPermission = (req, res, next) => {
  // 사용자가 로그인 시
  if (req.session.userid && req.session.role === 'user') {
    return res.status(errCode.FORBIDDEN).json({ message: 'NO_PERMISSION' });
  }
  // 관리자 로그인 시
  next();
};
// 로그인 안 한 상태인지 체크
exports.isNotAuthorized = (req, res, next) => {
  // session 객체가 존재하지 않으면,
  if (!req.session) return res.send(err);

  // 현재 로그인한 상태라면,
  if (req.session && req.session.userid) {
    return res.sendStatus(errorCode.FORBIDDEN);
  }
  // userid 가 없을 경우에만 다음 미들웨어 실행
  next();
};
// req 객체에 logout 메소드 추가
exports.addLogout = () => {
  return (req, res, next) => {
    req.logout = function () {
      req.session.destroy(); // 세션 삭제
    };

    next();
  };
};
// 12글자의 패스워드 랜덤 생성
exports.generateRandomPassword = () => {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz!@#$%^&*';
  const stringLength = 12;
  const passwordRegExp =
    /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^*()\-_=+\\\|\[\]{};:\'",.<>\/?])*.{8,16}$/;

  var randomString = '';
  for (let i = 0; i < stringLength; i++) {
    let randomNum = Math.floor(Math.random() * chars.length);
    randomString += chars.substring(randomNum, randomNum + 1);
  }
  if (!passwordRegExp.test(randomString)) {
    this.generateRandomPassword();
  }

  return randomString;
};

exports.changeOptionToWhereCond = options => {
  const optionArray = Object.entries(options);
  return optionArray
    .map((option, idx) => {
      if (typeof option[1] == 'number') {
        if (idx == optionArray.length - 1) return `${option[0]} = ${option[1]}`;
        return `${option[0]} = ${option[1]} and `;
      } else if (typeof option[1] == 'string') {
        if (idx == optionArray.length - 1)
          return `${option[0]} = \"${option[1]}\"`;
        return `${option[0]} = \"${option[1]}\" and `;
      }
    })
    .join('');
};

exports.checkPasswordMatch = async (pwdFromReq, pwdFromDb) => {
  return bcrypt.compare(pwdFromReq, pwdFromDb);
};

exports.encryptPassword = password => {
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(password, salt);
};
