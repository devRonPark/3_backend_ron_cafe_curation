const logger = require('../config/logger');
const DB = require('../config/mysql');
const { printCurrentTime } = require('./util');

class Auth {
  static saveToken = async data => {
    // 생성된 토큰 저장
    try {
      const timestamp = printCurrentTime();
      data['created_at'] = timestamp;
      const query = 'insert into auth set ?';
      const params = data;
      const result = await DB('POST', query, params);
      return result;
    } catch (err) {
      logger.error(err.message);
      throw new Error(err.message);
    }
  };
  // 토큰 값으로 유효한 토큰 가져오기
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
