const winston = require('winston');
require('winston-daily-rotate-file');
const logDir = `${__dirname}`;

// 레벨 설정
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};
// 개발 환경에 따라 출력할 로그 범위 설정
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};
// 로그 종류 별 색상 설정
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};
// 로그 파일에 로그 종류 별 색상 옵션 적용
winston.addColors(colors);
// log 출력 format 바꾸기
const format = winston.format.combine(
  winston.format.timestamp({ format: ' YYYY-MM-DD HH:MM:SS ||' }), // 표시 날짜 형식 변경
  winston.format.colorize({ all: true }), // log level 별 색상 표시
  winston.format.printf(
    // 실제 출력 양식
    info => `${info.timestamp} [ ${info.level} ] ▶ ${info.message}`,
  ),
);
// winston logger 생성
const logger = winston.createLogger({
  format,
  level: level(),
  // 남길 logger 파일 설정
  transports: [
    // info 레벨 로그를 저장할 파일 설정
    new winston.transports.DailyRotateFile({
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir,
      filename: '%DATE%.log',
      zippedArchive: true,
      handleExceptions: true,
      maxFiles: 30,
    }),
    // error 레벨 로그를 저장할 파일 설정
    new winston.transports.DailyRotateFile({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir + '/error',
      filename: '%DATE%.error.log',
      zippedArchive: true,
      maxFiles: 30,
    }),
    new winston.transports.Console({
      handleExceptions: true,
    }),
  ],
});

module.exports = logger;
