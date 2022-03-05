const mysql = require('mysql2/promise');
require('dotenv').config();
const { db_info } = require('./config');
console.log(db_info);
const pool = mysql.createPool(db_info);

module.exports = pool;
