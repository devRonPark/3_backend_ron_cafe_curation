const mysql = require('mysql2/promise');
const { db_info } = require('../config/config');
const pool = mysql.createPool(db_info);

module.exports = pool;
