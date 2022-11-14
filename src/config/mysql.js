const mysql = require('mysql2/promise');
const config = require('../config/config');
console.log('connection pool 생성');
const pool = mysql.createPool(config.dbInfo);

module.exports = pool;
