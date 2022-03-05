const logger = require('../config/logger');
const bcrypt = require('bcrypt');
const { successCode } = require('../lib/statusCodes/statusCode');
const { generateRandomNumber, printSqlLog } = require('../lib/util');
const { sendMailRun } = require('../config/smtpTransporter');
const InternalServerError = require('../lib/errors/internal-sever.error');
const NotFoundError = require('../lib/errors/not-found.error');
const ClientError = require('../lib/errors/client.error.js');
const AlreadyInUseError = require('../lib/errors/already-in-use.error');
const pool = require('../config/mysql');
const { destoryFlag } = require('../lib/util');

class AuthController {
  // 로그인 시 사용자 존재 여부 검사
  static checkUserWithEmailExist = async (req, res, next) => {
    const reqObj = { ...req.body };
    const { email } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select count(0) from users where email = ? and deleted_at is null';
      const queryParams = [email];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (userInfo['count(0)'] < 1) {
        throw new NotFoundError('User with email does not exist');
      }
      next();
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  // 이메일 중복 검사
  static checkEmailAlreadyInUse = async (req, res, next) => {
    const reqObj = { ...req.body };
    const { email } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select count(0) from users where email = ? and deleted_at is null';
      const queryParams = [email];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (userInfo['count(0)'] > 0) {
        throw new AlreadyInUseError('User with same email already exists');
      }
      return res.sendStatus(successCode.OK);
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  };
  // 이름 중복 검사
  static checkNameAlreadyInUse = async (req, res, next) => {
    const reqObj = { ...req.body };
    const { name } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select count(0) from users where name = ? and deleted_at is null';
      const queryParams = [name];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (userInfo['count(0)'] > 0) {
        throw new AlreadyInUseError('User with same name already exists');
      }
      return res.sendStatus(successCode.OK);
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  };
  // 회원가입 컨트롤러
  static createUser = async function (req, res, next) {
    const reqObj = { ...req.body };
    const { name, image_path, phone_number, email, password } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'insert into users (name, profile_image_path, phone_number, email, password) values (?,?,?,?,?)';
      const queryParams = [name, image_path, phone_number, email, password];
      const result = await connection.execute(queryString, queryParams);
      if (result[0].affectedRows === 0) {
        throw new InternalServerError('User register fail');
      }
      logger.info('User register success');
      // TODO 회원가입 성공 시, 중복 요청에 대한 처리 필요
      return res.sendStatus(successCode.CREATED);
    } catch (err) {
      // TODO 회원가입 실패 시, 중복 요청에 대한 처리 필요
      destoryFlag(req);
      throw err;
    } finally {
      connection.release();
    }
  };
  // 로그인 시 사용자 인증
  static authenticate = async function (req, res, next) {
    const reqObj = { ...req.body };
    const { email, password } = reqObj;

    const connection = await pool.getConnection();
    try {
      const queryString =
        'select count(0), id, password, deleted_at from users where email=?';
      const queryParams = [email.trim()]; // trim(): 양끝의 공백 제거
      // 사용자 DB에 이메일 존재 여부 파악
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (userInfo['count(0)'] < 1 || userInfo['deleted_at']) {
        throw new NotFoundError('Email is not registered');
      }
      logger.info('Email exists');

      const plainPassword = password;
      const passwordInDb = result[0][0].password;
      // 비밀번호 일치 여부 파악
      const isPwdMatch = await bcrypt.compare(plainPassword, passwordInDb);

      if (!isPwdMatch) throw new ClientError('Password is wrong');
      logger.info('Login success');
      // 사용자를 찾으면 세션에 userId 저장.
      req.session.userid = userInfo.id;
      console.log(req.session.userid);
      return res.sendStatus(successCode.OK);
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  // 사용자 로그아웃
  static logout = function (req, res, next) {
    try {
      // 세션에 userid가 존재하지 않으면
      if (!req.session.userid) {
        throw new ClientError('You already logged out');
      }
      req.logout(); // 현재 활성화된 세션 삭제
      return res.sendStatus(successCode.OK);
    } catch (err) {
      throw err;
    }
  };
  // 이메일 인증을 위한 6자리 인증번호를 포함한 메일 발송
  static authEmail = async function (req, res) {
    try {
      // 회원가입 시 사용자가 입력한 이메일 주소
      const { email } = req.body;
      // 이메일 인증을 위해 랜덤한 6자리 인증번호 생성
      const authenticationNumber = generateRandomNumber(111111, 999999);

      const message = {
        from: process.env.ACCOUNT_USER, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 회원가입 인증메일',
        text: 'ZZINCAFE 회원가입 인증메일 입니다.', // plain text body
        html: `
          <p>ZZINCAFE 회원가입을 위한 인증 번호입니다.</p>
          <p>아래의 인증 번호를 입력하여 인증을 완료해주세요.</p>
          <h2>${authenticationNumber}</h2>
        `,
      };

      // 이메일 발송
      await sendMailRun(message);
      // 이메일 발송 성공하면
      return res.status(successCode.OK).json({ authenticationNumber });
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
}

module.exports = AuthController;
