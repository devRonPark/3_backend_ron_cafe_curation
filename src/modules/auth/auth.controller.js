const logger = require('../../config/logger');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { successCode } = require('../../common/statusCodes/statusCode');
const { generateRandomNumber, printSqlLog } = require('../../common/util');
const { sendMailRun } = require('../../config/smtpTransporter');
const InternalServerError = require('../../common/errors/internal-sever.error');
const NotFoundError = require('../../common/errors/not-found.error');
const AlreadyInUseError = require('../../common/errors/already-in-use.error');
const pool = require('../../config/mysql');
const { convertToDateTimeFormat } = require('../../common/util');
const AuthService = require('./auth.service');
const { messages } = require('../../common/errors/message');
const config = require('../../config/config');

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
      console.log('userinfo: ', userInfo);
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
  static createUser = async (req, res, next) => {
    const result = await AuthService.saveNewUser(req.body);
    if (result === 500) throw new InternalServerError(messages[500]);
    return res.sendStatus(successCode.CREATED);
  };

  // 로그인 시 사용자 인증
  static authenticate = async (req, res, next) => {
    const reqObj = { ...req.body };
    const resObj = {};
    const { email, password, isAutoLoginChecked } = reqObj;

    const connection = await pool.getConnection();
    try {
      const queryString =
        'select count(0), id, name, password, profile_image_path from users where email=? and deleted_at is null';
      const queryParams = [email.trim()]; // trim(): 양끝의 공백 제거
      // 사용자 DB에 이메일 존재 여부 파악
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (userInfo['count(0)'] < 1 || userInfo['deleted_at']) {
        resObj.message = 'LOGIN_FAIL';
        return res.status(successCode.OK).json(resObj);
      }

      logger.info('Email exists');

      const plainPassword = password;
      const passwordInDb = userInfo.password;
      // 비밀번호 일치 여부 파악
      const isPwdMatch = await bcrypt.compare(plainPassword, passwordInDb);

      if (!isPwdMatch) {
        resObj.message = 'LOGIN_FAIL';
        return res.status(successCode.OK).json(resObj);
      }
      logger.info('Login success');

      resObj.userid = userInfo.id;
      resObj.email = email;
      resObj.nickname = userInfo.name;
      resObj.imagePath = userInfo['profile_image_path'];

      // 사용자를 찾으면 세션에 userId 저장.
      req.session.userid = userInfo.id;

      // 자동 로그인 체크한 채 로그인 시,
      if (isAutoLoginChecked) {
        // loginCookie라는 키로 세션 아이디를 담아 쿠키 생성
        // 쿠키의 저장 경로는 기본 uri 경로(홈페이지 시작 uri)
        // 초 단위로 쿠키 유지 시간 설정
        // response에 쿠키를 담아 클라이언트에게 보낸다.
        // maxAge: 쿠키 만료 기간 설정
        const limitTime = 60 * 60 * 24 * 7; // 1주일의 시간 저장
        const cookieValue = {
          isAutoLoginChecked: true,
          userid: userInfo.id,
        };
        // 쿠키에 sessionID 뿐만 아니라 isAutoLoginChecked: true, userid: 34 데이터를 저장해야 함.
        res.cookie('loginCookie', JSON.stringify(cookieValue), {
          path: '/',
          maxAge: limitTime,
          httpOnly: true,
        });
        console.log('cookie for auto-login have created successfully.');
      }

      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      next(err);
    }
  };
  // 사용자 로그아웃
  static logout = (req, res, next) => {
    req.session.destroy(err => {
      console.log('session object is deleted successfully in session store');
      res.clearCookie('sessionID');
      return res.sendStatus(successCode.NOCONTENT);
    });
  };
  // 이메일 인증을 위한 6자리 인증번호를 포함한 메일 발송
  static authEmail = async (req, res) => {
    try {
      // 회원가입 시 사용자가 입력한 이메일 주소
      const { email } = req.body;
      // 이메일 인증을 위해 랜덤한 6자리 인증번호 생성
      const authNumber = generateRandomNumber(111111, 999999);
      // 인증키 생성 시간
      const createdAt = convertToDateTimeFormat(new Date());
      // 인증키 만료 시간
      let expiredAt = new Date();
      expiredAt.setMinutes(expiredAt.getMinutes() + 10);
      expiredAt = convertToDateTimeFormat(expiredAt);
      // 인증번호 DB에 저장
      const result = await AuthController.saveAuthKey(
        email,
        authNumber,
        createdAt,
        expiredAt,
      );
      if (result[0].affectedRows === 0) {
        throw new InternalServerError('AuthNumber save fail');
      }
      logger.info('AuthNumber save success');

      const message = {
        from: config.mailInfo.user, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 회원가입 인증메일',
        text: 'ZZINCAFE 회원가입 인증메일 입니다.', // plain text body
        html: `
          <p>ZZINCAFE 회원가입을 위한 인증 번호입니다.</p>
          <p>아래의 인증 번호를 입력하여 인증을 완료해주세요.</p>
          <h2>${authNumber}</h2>
        `,
      };

      // 이메일 발송
      await sendMailRun(message);
      // 이메일 발송 성공하면
      return res.sendStatus(successCode.OK);
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
  // 인증키 인증 테이블에 저장
  static saveAuthKey = async (email, authKey, createdAt, expiredAt) => {
    const connection = await pool.getConnection();
    try {
      const queryString =
        'insert into auth_email (email, ae_type, ae_value, created_at ,expired_at) values (?,?,?,?,?)';
      const queryParams = [email.trim(), 1, authKey, createdAt, expiredAt]; // trim(): 양끝의 공백 제거
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      return result;
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  };
  // 인증번호 일치 여부 판단
  static checkIsVerifyNumberSame = async (req, res, next) => {
    const reqObj = { ...req.body };
    const resObj = {};
    let { email, authKey, clickedAt } = reqObj;
    clickedAt = convertToDateTimeFormat(clickedAt);
    const connection = await pool.getConnection();

    try {
      // 검색조건:
      // email = (인증메일 발송한 이메일 주소) ae_type = 1('회원가입'), ae_value = (사용자 입력 값), expired_at > (request 시점)
      // 가장 최근 값
      const queryString =
        'select ae_value, expired_at from auth_email where ae_type = 1 and email = ? ORDER BY created_at DESC LIMIT 1';
      const queryParams = [email];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);

      const authKeyInfo = result[0][0];

      if (!authKeyInfo) next(new InternalServerError('AuthKey does not exist'));

      const authKeyInDb = authKeyInfo['ae_value'];
      let expiredAt = authKeyInfo['expired_at'];
      expiredAt = convertToDateTimeFormat(expiredAt);
      console.log('authKey: ', authKey);
      console.log('authKeyInDb: ', authKeyInDb);
      console.log('isAuthKeySame: ', authKey === authKeyInDb);
      console.log('isAuthKeySame: ', authKey == authKeyInDb);
      console.log('expiredAt: ', expiredAt);
      console.log('clickeddAt: ', clickedAt);
      const isAuthKeyExpired = moment(clickedAt).isAfter(expiredAt);
      console.log('isAuthKeyExpired: ', isAuthKeyExpired);
      // clickedAt > expiredAt => "인증키가 만료되었습니다."
      if (isAuthKeyExpired) {
        resObj.isEmailVerified = false;
        resObj.desc = 'AUTH_KEY_EXPIRED';
        // authKey !== authKeyInDb => "인증키가 일치하지 않습니다."
      } else if (authKey != authKeyInDb) {
        resObj.isEmailVerified = false;
        resObj.desc = 'AUTH_KEY_NOT_SAME';
        // 인증키 일치하는 경우
      } else if (!isAuthKeyExpired && authKey == authKeyInDb) {
        resObj.isEmailVerified = true;
      }

      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      throw new InternalServerError(err.message);
    } finally {
      connection.release();
    }
  };

  // session id 를 기준으로 사용자 로그인 여부 판단
  static checkUserLoggedIn = async (req, res, next) => {
    const autoLoginCookie = req.cookies['loginCookie']
      ? JSON.parse(req.cookies['loginCookie'])
      : null;

    // 로그아웃하거나 현재 세션 종료 시 사라짐.
    if (req.session.userid) {
      return res.status(successCode.OK).json({ isUserLoggedIn: true });
    } else {
      // 자동 로그인에 체크된 경우
      if (autoLoginCookie?.isAutoLoginChecked) {
        // 세션 새로 발급
        req.session.userid = autoLoginCookie.userid;
        // 자동 로그인 쿠키 갱신
        const limitTime = 60 * 60 * 24 * 7; // 1주일의 시간 저장
        const cookieValue = {
          isAutoLoginChecked: true,
          userid: autoLoginCookie.userid,
        };
        // 쿠키에 sessionID 뿐만 아니라 isAutoLoginChecked: true, userid: 34 데이터를 저장해야 함.
        res.cookie('loginCookie', JSON.stringify(cookieValue), {
          path: '/',
          maxAge: limitTime,
          httpOnly: true,
        });
        return res.status(successCode.OK).json({ isUserLoggedIn: true });
      }
      return res.status(successCode.OK).json({ isUserLoggedIn: false });
    }
  };
}

module.exports = AuthController;
