const { addColors, createLogger, transports, format } = require('winston');
const { combine, timestamp, label, colorize, printf } = format;
require('winston-daily-rotate-file');
const logDir = `${__dirname}/logs`;

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
addColors(colors);
const printFormat = printf(
  ({ timestamp, label, level, message }) =>
    `${timestamp} ${label ? '{' + label + '}' : ''} [ ${level} ] ▶ ${message}`,
);
const printLogFormat = {
  file: combine(
    label({
      label: 'ZZINCAFE_SERVICE_BACKEND',
    }),
    timestamp({ format: 'YYYY-MM-DD HH:MM:SS ||' }), // 표시 날짜 형식 변경
    printFormat,
  ),
  console: combine(
    timestamp({ format: 'HH:MM:SS ||' }),
    colorize({ all: true }), // log level 별 색상 표시
    printFormat,
  ),
};
const options = {
  infoLogFile: new transports.DailyRotateFile({
    level: 'info',
    format: printLogFormat.file,
    datePattern: 'YYYY-MM-DD',
    dirname: logDir,
    filename: '%DATE%.log',
    zippedArchive: true,
    handleExceptions: true,
    maxFiles: 30,
  }),
  errLogFile: new transports.DailyRotateFile({
    level: 'error',
    format: printLogFormat.file,
    datePattern: 'YYYY-MM-DD',
    dirname: logDir + '/error',
    filename: '%DATE%.error.log',
    zippedArchive: true,
    maxFiles: 30,
  }),
  console: new transports.Console({
    format: printLogFormat.console,
    handleExceptions: true,
  }),
};
// winston logger 생성
const logger = createLogger({
  level: level(),
  // 남길 logger 파일 설정
  transports: [
    // info 레벨 로그를 저장할 파일 설정
    options.infoLogFile,
    // error 레벨 로그를 저장할 파일 설정
    options.errLogFile,
    options.console,
  ],
});

module.exports = logger;
