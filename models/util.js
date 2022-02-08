// 콘솔 창의 텍스트 색깔 변경
const colors = require('colors');
// 콘솔 창에 현재 날짜 및 시간 출력
const moment = require('moment');
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
