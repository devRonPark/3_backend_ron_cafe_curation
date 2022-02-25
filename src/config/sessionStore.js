const session = require('express-session');
// 세션 데이터를 MySQL 서버에 저장하기 위한 모듈
const MySQLStore = require('express-mysql-session')(session);

// DB Options
const options = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// create session store
const sessionStore = new MySQLStore(options);

module.exports = sessionStore;
