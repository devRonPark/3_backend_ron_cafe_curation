// 콘솔 창의 텍스트 색깔 변경
const colors = require('colors');
// 콘솔 창에 현재 날짜 및 시간 출력
const moment = require('moment');
const crypto = require('crypto');
require('moment-timezone');
// 시간대는 한국 서울 기준
moment.tz.setDefault('Asia/Seoul');
// 텍스트 색깔 선택 옵션 활성화
colors.enable();

exports.printSqlLog = sqlStatement => {
  logger.info(
    `[ 실행된 SQL문 ] ${sqlStatement} [${moment().format(
      'YYYY-MM-DD HH:mm:ss',
    )}]`.blue,
  );
};
exports.printCurrentTime = () => {
  return moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
};
// min ~ max 까지 랜덤으로 숫자 생성
exports.generateRandomNumber = function (min, max) {
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNumber;
};
exports.generateRandomToken = function () {
  return crypto.randomBytes(20).toString('hex');
};
