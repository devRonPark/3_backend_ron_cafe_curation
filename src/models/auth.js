const logger = require('../config/logger');
const DB = require('../config/mysql');
const InternalServerError = require('../lib/errors/internal-sever.error');
const { printCurrentTime, printSqlLog } = require('../lib/util');
const pool = require('../config/mysql');

class Auth {
  // 생성된 토큰 저장
  // @param token: {token_value: ..., time_to_live: ..., user_id: ...}
  // @return { state: true }
  static saveToken = async data => {
    const { token_value, user_id, time_to_live } = data;
    const connection = await pool.getConnection();
    try {
      const queryString =
        'insert into auth (token_value, user_id, time_to_live, created_at) values (?, ?, ?, ?)';
      const created_at = printCurrentTime();
      const queryParams = [token_value, user_id, time_to_live, created_at];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      const isTokenSaved = result[0].affectedRows > 0;
      return isTokenSaved;
    } catch (err) {
      throw err;
    }
  };
  // 토큰 값으로 유효한 토큰 가져오기
  // @param token: {token_value: ...}
  // @return { data: [{}]state: true }
  static getTokenByValue = async data => {
    try {
      const query = 'select * from auth where token_value=?';
      const params = data;
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.message);
      throw new Error(err.message);
    }
  };
}

module.exports = Auth;
