// models/user.js
const bcrypt = require('bcrypt');
const logger = require('../config/logger');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const DB = require('../config/mysql');
const { printCurrentTime } = require('./util');

// 사용자 클래스
class User {
  constructor(user) {
    this.id = user.id ?? null;
    this.email = user.email;
    this.password = user.password;
    this.name = user.name;
    this.phone_number = user.phone_number;
    this.profile_image_path = user.profile_image_path ?? null;
  }
  // 모든 사용자 검색
  // @returns { data: [{}, ...], state: true }
  static findAll = async () => {
    try {
      const query = 'select * from users';
      const params = null;
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 이름으로 검색
  // @param user: {name: ...}
  // @return { data: [{}], state: true }
  static findByName = async user => {
    try {
      const query = 'select * from users where name = ?';
      const params = user.name;
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 이메일로 검색
  // @param user: {email: ...}
  // @return { data: [{}], state: true }
  static findByEmail = async user => {
    try {
      const { email } = user;
      const query = 'select name, profile_image_path from users where email=?';
      const params = [email];
      const result = await DB('GET', query, params);
      const userData = result.data[0];
      return userData;
    } catch (err) {
      logger.error(err.stack);
      return res.json({ message: err.message });
    }
  };
  // 사용자 인덱스 값으로 검색
  // @param user: {id: ...}
  // @return { name, profile_image_path }
  static findById = async user => {
    try {
      const query = 'select name, profile_image_path from users where id = ?';
      const params = [user.id];
      const result = await DB('GET', query, params);
      const userData = result.data[0];
      return userData;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 비밀번호 일치 여부 검사
  // @param plainPassword: 입력받은 비밀번호
  // @param2 passwordInDb: DB에 저장된 비밀번호 해시 값
  // @return true || false
  static comparePassword = async (plainPassword, passwordInDb) => {
    try {
      // plainPassword 를 암호화해서 데이터베이스에 있는 암호화된 비밀번호와 같은지 체크
      return await bcrypt.compare(plainPassword, passwordInDb);
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 사용자 휴대폰 번호로 데이터베이스 조회
  // @param user: {phone_number: ...}
  // @return { data: [{}], state: true }
  static getEmailByPhoneNumber = async user => {
    try {
      const query = 'select email from users where phone_number = ?';
      const params = [user.phone_number];
      const result = DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 사용자 휴대폰 번호와 이메일 주소로 데이터베이스 조회
  // @param user: {phone_number: ..., email: ...}
  // @return { data: [{}], state: true }
  static getUserIdByPhoneNumberAndEmail = async user => {
    try {
      const query = 'select id from users where phone_number = ? and email = ?';
      const params = [user.phone_number, user.email];
      const result = await DB('GET', query, params);
      console.log('result : ', result);
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  // 세션에 저장된 userid 로 사용자 비밀번호 가져오기
  // @param user: {id: ...}
  // @return { data: [{}], state: true }
  static getPasswordById = async userInfo => {
    try {
      const query = 'select password from users where id = ?';
      const params = [userInfo.id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 사용자 등록
  // @param user: {phone_number: ..., email: ..., - - -}
  // @return { state: true }
  static create = async user => {
    try {
      const query = 'insert into users set ?';
      const params = user;
      const result = await DB('POST', query, params);
      console.log('result : ', result);
      return result;
    } catch (err) {
      logger.error(err.message);
      throw new Error(err.message);
    }
  };
  // 사용자 삭제
  // @param user: {email: ...}
  // @return { state: true }
  static delete = async user => {
    try {
      const query = 'delete from users where email = ?';
      const params = [user.email];
      const result = await DB('DELETE', query, params);
      return result;
    } catch (err) {
      logger.error(err.message);
      throw new Error(err.message);
    }
  };
  // 사용자 비밀번호 정보 수정
  // @param user: {phone_number: ..., email: ...}
  // @return { data: [{}], state: true }
  static updatePassword = async user => {
    try {
      const query = 'update users set password = ? where id = ?';
      const params = [user.password, user.id];
      const result = await DB('PUT', query, params);
      console.log('result : ', result);
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };
  // 사용자 프로필 정보 수정(프로필 및 닉네임)
  // @param user: {profile_image_path: ..., name: ...}
  // @return { state: true }
  static updateProfileInfo = async user => {
    try {
      const timestamp = printCurrentTime();
      const { profile_image_path, name, id } = userInfo;
      let query, params, result;
      // 변경하고자 하는 정보에 프로필 이미지가 없다면,
      if (profile_image_path === null) {
        // 닉네임만 업데이트
        query = 'update users set name=?,modified_at=? where id=?';
        params = [user.name, timestamp, user.id];
        result = await DB('UPDATE', query, params);
        // 변경하고자 하는 정보에 닉네임이 없다면
      } else if (!name) {
        // 프로필 이미지만 업데이트
        query =
          'update users set profile_image_path=?,modified_at=? where id=?';
        params = [user.profile_image_path, timestamp, user.id];
        result = await DB('UPDATE', query, params);
      } else {
        // 닉네임 및 프로필 이미지 전부 업데이트
        query =
          'update users set name=?,profile_image_path=?,modified_at=? where id=?';
        params = [user.name, user.profile_image_path, timestamp, user.id];
        result = await DB('UPDATE', query, params);
      }
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 사용자 휴대폰 번호 수정
  // @param user: {phone_number: ...}
  // @return { state: true }
  static updatePhoneNumber = async user => {
    // db 데이터 변경 작업은 비동기 동작임.
    try {
      const timestamp = printCurrentTime();
      const { phone_number, id } = user;
      // 변경하고자 하는 정보에 휴대폰 번호가 있다면,
      if (phone_number) {
        const query =
          'update users set phone_number=?,modified_at=? where id=?';
        const params = [phone_number, timestamp, id];
        const result = await DB('UPDATE', query, params);
        return result;
      }
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
  // 사용자 탈퇴에 따른 상태 비활성화 및 삭제일자 저장
  // @param user: {id: ...}
  // @return { state: true }
  static disable = async user => {
    try {
      const timestamp = printCurrentTime();
      const query = 'update users set dropped_at=? where id=?';
      const params = [timestamp, user.id];
      const result = await DB('UPDATE', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  };
}

module.exports = User;
