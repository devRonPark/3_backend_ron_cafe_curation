const mysql = require('mysql2/promise');
const { db_info } = require('./config');
const logger = require('../config/logger');
const pool = mysql.createPool(db_info);

const DB = async (type, sql, params) => {
  // async, await
  try {
    // state : 쿼리문 실행 성공 시 true, 실패 시 false
    // error : 쿼리문 error 정보 반환
    let result = {}; // 반환 값
    const connection = await pool.getConnection(async conn => conn);
    try {
      const [rows] = await connection.query(sql, params);
      console.log('rows: ', rows);
      if (type == 'GET') result.data = rows;
      result.state = true;
      connection.release(); // 사용된 풀 반환
      return result;
    } catch (err) {
      logger.error(`Query Error: ${err.message}`);
      throw new Error(err.message);
    }
  } catch (err) {
    logger.error(`DB Error: ${err.message}`);
    throw new Error(err.message);
  }
};

module.exports = DB;
