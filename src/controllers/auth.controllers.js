const logger = require('../config/logger');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { successCode } = require('../lib/statusCodes/statusCode');
const { generateRandomNumber, printSqlLog } = require('../lib/util');
const { sendMailRun } = require('../config/smtpTransporter');
const InternalServerError = require('../lib/errors/internal-sever.error');
const NotFoundError = require('../lib/errors/not-found.error');
const ClientError = require('../lib/errors/client.error.js');
const AlreadyInUseError = require('../lib/errors/already-in-use.error');
const pool = require('../config/mysql');
const { destoryFlag, convertToDateTimeFormat } = require('../lib/util');

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
      console.log("userinfo: ", userInfo);
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
    const { name, image_path, email, password } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'insert into users (name, profile_image_path, email, password) values (?,?,?,?)';
      const queryParams = [name, image_path, email, password];
      const result = await connection.execute(queryString, queryParams);
      if (result[0].affectedRows === 0) {
        throw new InternalServerError('User register fail');
      }
      logger.info('User register success');
      // TODO 회원가입 성공 시, 중복 요청에 대한 처리 필요
      return res.sendStatus(successCode.CREATED);
    } catch (err) {
      // TODO 회원가입 실패 시, 중복 요청에 대한 처리 필요
      throw err;
    } finally {
      connection.release();
    }
  };
  // 로그인 시 사용자 인증
  static authenticate = async function (req, res, next) {
    console.log("req.info: ", req.headers['Access-Control-Allow-Crendentials']);
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
        throw new NotFoundError('Email is not registered');
      }
      logger.info('Email exists');

      const plainPassword = password;
      const passwordInDb = userInfo.password;
      // 비밀번호 일치 여부 파악
      const isPwdMatch = await bcrypt.compare(plainPassword, passwordInDb);

      if (!isPwdMatch) throw new ClientError('Password is wrong');
      logger.info('Login success');
      
      resObj.userid = userInfo.id;
      resObj.nickname = userInfo.name;
      resObj.image_path = userInfo["profile_image_path"];

      // 사용자를 찾으면 세션에 userId 저장.
      req.session.userid = userInfo.id;
      
      // 자동 로그인 체크한 채 로그인 시,
      if (isAutoLoginChecked) {
        // loginCookie라는 키로 세션 아이디를 담아 쿠키 생성
        // 쿠키의 저장 경로는 기본 uri 경로(홈페이지 시작 uri)
        // 초 단위로 쿠키 유지 시간 설정
        // response에 쿠키를 담아 클라이언트에게 보낸다.
        // maxAge: 쿠키 만료 기간 설정
        const limitTime = 60*60*24*7; // 1주일의 시간 저장
        const cookieValue = {isAutoLoginChecked: true, sessionID: req.sessionID, userid: userInfo.id };
        // 쿠키에 sessionID 뿐만 아니라 isAutoLoginChecked: true, userid: 34 데이터를 저장해야 함.
        res.cookie("loginCookie", JSON.stringify(cookieValue), { path: '/', maxAge: limitTime, httpOnly: true });
        console.log("cookie for auto-login have created successfully.");
      }

      res.cookie("userid", userInfo.id, {secure:false, httpOnly: true });

      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  // 사용자 로그아웃
  static logout = function (req, res, next) {
    console.info("req.config: ", req.config);
    console.log("req.headers info: ", req.headers);
    const sessionIdInCookie = req.cookies && req.cookies['loginCookie'] && JSON.parse(req.cookies['loginCookie'])['sessionID'];
    const sessionId = req.sessionID && req.sessionID === sessionIdInCookie ? req.sessionID : sessionIdInCookie;
    
    req.sessionID = sessionId;
    try {
      console.log("req.session: ", req.sessionID);
      // 세션에 userid가 존재하지 않으면
      // if (!req.session.userid) {
      //   throw new ClientError('You already logged out');
      // }
      // 세션 삭제
      req.session.destroy(function(err) {
        console.log("Session is deleted successfully.");
        // 로그아웃 시 쿠키 삭제
        req.cookies['connect.sid'] && res.cookie('connect.sid', '', { maxAge: 0 });
        req.cookies['userid'] && res.cookie('userid', '', { maxAge: 0 });
        req.cookies['loginCookie'] && res.cookie('loginCookie', '', { maxAge: 0 });
        return res.sendStatus(successCode.NOCONTENT);
      });
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
      const authNumber = generateRandomNumber(111111, 999999);
      // 인증키 생성 시간
      const createdAt = convertToDateTimeFormat(new Date());
      // 인증키 만료 시간
      let expiredAt = new Date();
      expiredAt.setMinutes(expiredAt.getMinutes() + 10);
      expiredAt = convertToDateTimeFormat(expiredAt);
      // 인증번호 DB에 저장
      const result = await AuthController.saveAuthKey(email, authNumber, createdAt, expiredAt);
      if (result[0].affectedRows === 0) {
        throw new InternalServerError('AuthNumber save fail');
      }
      logger.info('AuthNumber save success');

      const message = {
        from: process.env.ACCOUNT_USER, // 송신자 이메일 주소
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
      'insert into auth_email (email, ae_type, ae_value, created_at ,expired_at) values (?,?,?,?,?)'
      const queryParams = [email.trim(), 1, authKey, createdAt, expiredAt]; // trim(): 양끝의 공백 제거
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      return result;
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  }
  // 인증번호 일치 여부 판단
  static checkIsVerifyNumberSame = async (req, res, next) => {
    const reqObj = {...req.body};
    const resObj = {};
    let {email, authKey, clickedAt} = reqObj;
    clickedAt = convertToDateTimeFormat(clickedAt);
    const connection = await pool.getConnection();

    try {
      // 검색조건: 
      // email = (인증메일 발송한 이메일 주소) ae_type = 1('회원가입'), ae_value = (사용자 입력 값), expired_at > (request 시점)
      // 가장 최근 값
      const queryString = "select ae_value, expired_at from auth_email where ae_type = 1 and email = ? ORDER BY created_at DESC LIMIT 1";
      const queryParams = [email];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      
      const authKeyInfo = result[0][0];
      
      if (!authKeyInfo)
        next(new InternalServerError('AuthKey does not exist'));
      
      const authKeyInDb = authKeyInfo["ae_value"];
      let expiredAt = authKeyInfo["expired_at"];
      expiredAt = convertToDateTimeFormat(expiredAt);
      console.log("authKey: ", authKey);
      console.log("authKeyInDb: ", authKeyInDb);
      console.log("isAuthKeySame: ", authKey === authKeyInDb);
      console.log("isAuthKeySame: ", authKey == authKeyInDb);
      console.log("expiredAt: ", expiredAt);
      console.log("clickeddAt: ", clickedAt);
      const isAuthKeyExpired = moment(clickedAt).isAfter(expiredAt);
      console.log("isAuthKeyExpired: ", isAuthKeyExpired);
      // clickedAt > expiredAt => "인증키가 만료되었습니다."
      if (isAuthKeyExpired) {
        resObj.isEmailVerified = false;
        resObj.desc = "AUTH_KEY_EXPIRED";
      // authKey !== authKeyInDb => "인증키가 일치하지 않습니다."
      } else if (authKey != authKeyInDb) {
        resObj.isEmailVerified = false;
        resObj.desc = "AUTH_KEY_NOT_SAME";
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
  }

  // session id 를 기준으로 사용자 로그인 여부 판단
  static checkUserLoggedIn = async (req, res, next) => {
    console.log("req.sessionID: ", req.sessionID);
    console.log("req.session.userid: ", req.session.userid);
    console.log("req.signedCookies['connect.sid']: ", req.signedCookies['connect.sid']);
    // req.sessionID 는 브라우저 별로 달라지는 요소
    // req.signedCookies['connect.sid'] 가 존재하고, req.cookies['userid'] 가 존재하고
    // req.sessionID !== req.signedCookies['connect.sid'] 면,
    // req.session.userid 가 존재하지 않으면 
    // => 쿠키 삭제
    const isCookieExist = req.signedCookies['connect.sid'] !== undefined && req.cookies['userid'] !== undefined;
    const isNotSessionIdSame = req.sessionID !== req.signedCookies['connect.sid'];

    if (isCookieExist && isNotSessionIdSame) {
      return res.status(successCode.OK).json({ isUserLoggedIn: false, deleteCookie: true });
    }
    // 쿠키에 저장된 session id 불러오기
    // req.sessionID : 서버를 리로드하거나 서로 다른 탭에서 페이지 요청이 들어오는 경우 달라짐.
    // req.signedCookies['connect.sid'] : 로그인 시 세션 생성에 따라 발급되는 쿠키(session ID를 값으로 가짐)
    // req.signedCookies['loginCookie'] : 자동 로그인 체크 시 발급되는 쿠키
    // 로그아웃하지 않고 서버를 종료하거나 탭을 나갔을 때 로그인 유지하도록 설정
    const sessionId = req.sessionID;
    const connection = await pool.getConnection();
    try {
      if (sessionId) {
        // 세션에 저장된 userid 조회
        const queryString = 'select data from sessions where session_id = ?';
        const queryParams = [sessionId];
        printSqlLog(queryString, queryParams);
        const result = await connection.query(queryString, queryParams);
        // data는 JSON.stringify() 된 문자열 데이터
        if (result && result[0] && result[0][0]) {
          const data = JSON.parse(result[0][0].data);
          const userid = data.userid;
          if (!userid) {
            return res.status(successCode.OK).json({ isUserLoggedIn: false });
          }
          return res.status(successCode.OK).json({ isUserLoggedIn: true });
        } else {
          return res.status(successCode.OK).json({ isUserLoggedIn: false });
        }
      }
    } catch (err) {
      throw new InternalServerError(err.message);
    }

  }
}

module.exports = AuthController;
