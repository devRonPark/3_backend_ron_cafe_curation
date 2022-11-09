const logger = require('../config/logger');
const DB = require('../config/mysql');
const { convertToDateTimeFormat, printSqlLog } = require('../lib/util');
const pool = require('../config/mysql');

class AuthModel {
  // 생성된 토큰 저장
  // @param token: {token_value: ..., time_to_live: ..., user_id: ...}
  // @return { state: true }
  static saveToken = async data => {
    const { email, token_value } = data;
    const connection = await pool.getConnection();
    try {
      const queryString =
        'insert into auth_email (email, ae_type, ae_value, created_at, expired_at) values (?, ?, ?, ?, ?)';
      // 인증키 생성 시간
      const createdAt = convertToDateTimeFormat(new Date());
      // 인증키 만료 시간(10분)
      let expiredAt = new Date();
      expiredAt.setMinutes(expiredAt.getMinutes() + 10);
      expiredAt = convertToDateTimeFormat(expiredAt);
      // 1 => 회원가입 시 이메일 인증, 2 => 비밀번호 변경
      const queryParams = [email, 2, token_value, createdAt, expiredAt];
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
      const query = 'select * from auth_email where ae_value=?';
      const params = data;
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.message);
      throw new Error(err.message);
    }
  };

  // @param userInfo: {name, image_path, email, password}
  static saveNewUser = async userInfo => {
    let result = 0;
    const connection = await pool.getConnection(async conn => conn);

    try {
      await connection.beginTransaction();

      const {name, image_path, email, password} = userInfo;
      const queryString =
      'insert into users (name, profile_image_path, email, password) values (?,?,?,?)';
    const queryParams = [name, image_path, email, password];
    const resultOfQuery = await connection.execute(queryString, queryParams);
    if (resultOfQuery[0].affectedRows === 0) result = 500;
    else result = 201;

    return result;
    } catch (err) {
      await connection.rollback();
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  }
}

module.exports = AuthModel;
