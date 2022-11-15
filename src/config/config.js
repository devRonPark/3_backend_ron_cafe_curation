const dotenv = require('dotenv');

if (process.env.NODE_ENV == 'production') {
  dotenv.config({ path: 'envs/.env.production' });
} else if (process.env.NODE_ENV == 'development') {
  dotenv.config({ path: 'envs/.env.development' });
} else {
  throw new Error('process.env.NODE_ENV를 설정하지 않았습니다.');
}

const config = {
  dbInfo: {
    connectionLimit: 10,
    waitForConnections: true,
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8',
  },
  sessionSecret: process.env.SESSION_SECRET_KEY,
  PORT: +process.env.PORT,
  mailInfo: {
    user: process.env.ACCOUNT_USER,
    password: process.env.ACCOUNT_PASS,
  },
  openApiKey: process.env.OPEN_API_KEY ?? '',
};

module.exports = config;
