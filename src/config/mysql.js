const mysql = require('mysql2/promise');
require('dotenv').config();
const { db_info } = require('./config');
const pool = mysql.createPool(db_info);

console.log('pool info: ', pool);

module.exports = pool;
