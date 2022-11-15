const config = require('../config/config');
const session = require('express-session');
// 세션 데이터를 MySQL 서버에 저장하기 위한 모듈
const MySQLStore = require('express-mysql-session')(session);

// DB Options
const options = {
  host: config.dbInfo.host,
  user: config.dbInfo.user,
  password: config.dbInfo.password,
  database: config.dbInfo.database,
};

console.log('options: ', options);

// create session store
const sessionStore = new MySQLStore(options);

module.exports = sessionStore;
