const mysql = require('mysql2/promise');
const { db_info } = require('./config');
const logger = require('../config/logger');
const { printSqlLog } = require('../models/util');
const pool = mysql.createPool(db_info);

const DB = async (type, sql, params) => {
  // async, await
  try {
    // state : 쿼리문 실행 성공 시 true
    // error : 쿼리문 error 정보 반환
    let result = {}; // 반환 값
    // connection 생성
    const connection = await pool.getConnection(async conn => conn);
    try {
      let executedSql;
      let rows;
      if (params) {
        // 콘솔에 출력할 sql문 생성
        executedSql = mysql.format(sql, params);
        [rows] = await connection.query(sql, params);
        console.log('results: ', rows);
      } else {
        // 콘솔에 출력할 sql문 생성
        executedSql = mysql.format(sql);
        [rows] = await connection.query(sql);
        console.log('results: ', rows);
      }
      printSqlLog(executedSql); // 현재 실행되는 sql문 콘솔에 출력

      result.data = rows; // 조회되는 데이터 추가
      result.state = true;
      connection.release(); // 사용된 풀 반환
      return result;
    } catch (err) {
      logger.error(`Query Error: ${err.stack}`);
      throw new Error(err.message);
    }
  } catch (err) {
    logger.error(`DB Error: ${err.stack}`);
    throw new Error(err.message);
  }
};

module.exports = DB;
