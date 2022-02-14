// 콘솔 창의 텍스트 색깔 변경
const colors = require('colors');
// 콘솔 창에 현재 날짜 및 시간 출력
const moment = require('moment');
// 랜덤한 토큰을 생성하기 위해 사용
const crypto = require('crypto');
// 카페의 위치 데이터 값 중부원점 >> WGS84 좌표계로 변환
const proj4 = require('proj4');
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
exports.convertLocationData = coordinateObj => {
  //GRS80(중부원점) 좌표계
  const grs80 =
    '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs';
  //wgs84(위경도)좌표계
  const wgs84 =
    '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';
  // let coord = proj4(fromProjection, toProjection, coordinates);
  // fromProjection : 변환 대상 좌표계, toProjection : 변환 목표 좌표계, coordinates : 객체 또는 배열 형태 (예시 {x: 'x', y: 'y'} 또는 [x, y])
  const coord = proj4(grs80, wgs84, coordinateObj);
  return { latitude: coord.x, longitude: coord.y };
};
