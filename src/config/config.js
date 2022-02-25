const config = {
  db_info: {
    connectionLimit: 4,
    waitForConnections: true,
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8',
  },
};
module.exports = config;
