const bcrypt = require('bcrypt');
const { generateRandomPassword } = require('../lib/util');
const {
  encryptTemporaryPassword,
} = require('../lib/middlewares/passwordEncryption');
const {
  generateRandomToken,
  printCurrentTime,
  printSqlLog,
} = require('../lib/util');
const { sendMailRun } = require('../config/smtpTransporter');
const { deleteImage } = require('../lib/middlewares/ImageDelete');
const logger = require('../config/logger');
const Auth = require('../models/auth');
const { successCode } = require('../lib/statusCodes/statusCode');
const pool = require('../config/mysql');
const NotFoundError = require('../lib/errors/not-found.error');
const InternalServerError = require('../lib/errors/internal-sever.error');
const ClientError = require('../lib/errors/client.error.js');

class UserController {
  // 사용자 정보 조회 컨트롤러
  static getUserInfoById = async (req, res, next) => {
    const reqObj = { ...req.params };
    const { userId } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select name, email, phone_number, profile_image_path from users where id = ?';
      const queryParams = [userId];
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];

      if (!userInfo) {
        throw new NotFoundError('User info does not exist');
      }
      return res.status(successCode.OK).json({ ...userInfo });
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  static getUserId = async (req, res, next) => {
    const reqObj = { ...req.body };
    const { name, phone_number } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select id from users where name = ? and phone_number = ? and deleted_at is null';
      const queryParams = [name, phone_number];
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];

      if (!userInfo) {
        throw new NotFoundError('User info does not exist');
      }
      return res.status(successCode.OK).json({ userId: userInfo.id });
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  static validateUserWithPasswordCheck = async (req, res, next) => {
    const reqObj = { ...req.params, ...req.body };
    const { userId, password } = reqObj;

    const connection = await pool.getConnection();

    try {
      // userId 로 사용자 정보 조회
      const queryString =
        'select id, password from users where id = ? and deleted_at is null';
      const queryParams = [userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) throw new NotFoundError('User info not found');

      const plainPwd = password;
      const dbInPwd = result[0][0].password;
      // 비밀번호 일치 여부 파악
      const isPwdMatch = await bcrypt.compare(plainPwd, dbInPwd);

      if (!isPwdMatch) throw new ClientError('Password is wrong');
      logger.info('User authentication success');
      return res.status(successCode.OK).json({ userId: userInfo.id });
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  // 사용자 검증 후 디비에서 조회된 사용자 정보 응답
  // @params req.body { name, email, phone_number }
  // @returns res.body { id, name, email, phone_number, profile_image_path }
  static getUserInfo = async (req, res, next) => {
    const reqObj = { ...req.body };
    const { name, email, phone_number } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
      'select id, name, email, phone_number, profile_image_path from users where name = ? and email = ? and phone_number = ? and deleted_at is null';
      const queryParams = [name, email, phone_number];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) {
        throw new NotFoundError('User info not found');
      }
      return res.status(successCode.OK).json({ user: userInfo });
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };

  // 아이디 찾기 컨트롤러
  static getEmail = async function (req, res, next) {
    const userId = req.params.userId;
    const connection = await pool.getConnection();

    try {
      const queryString =
        'select email from users where userId = ? and deleted_at is null';
      const queryParams = [userId];
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) throw new NotFoundError('User info does not exist');
      logger.info('User info exists');

      return res.status(successCode.OK).json({ email: userInfo.email });
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };

  // 비밀번호 찾기 로직 상, 임시 비밀번호가 포함된 이메일 발송
  static sendEmailForTemporaryPassword = async (email, newPassword) => {
    try {
      // 송신자에게 보낼 메시지 작성
      const message = {
        from: process.env.ACCOUNT_USER, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 로그인 임시 패스워드 발급',
        html: `
            <p>ZZINCAFE 로그인을 위한 임시 패스워드입니다.</p>
            <h2>${newPassword}</h2>
            <p>반드시 로그인하신 이후 비밀번호를 변경해주시기 바랍니다.</p>
          `,
      };
      // 이메일 발송
      await sendMailRun(message);
      return true;
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
  // 비밀번호 찾기 라우터 로직
  static sendEmailWithNewPassword = async function (req, res, next) {
    const reqObj = { ...req.body };
    const { id, email } = reqObj;

    const connection = await pool.getConnection();
    connection.beginTransaction();

    try {
      // 8자리의 임시 비밀번호 생성
      const temporaryPassword = generateRandomPassword();
      // 비밀번호 암호화
      const hashedTemporaryPassword =
        encryptTemporaryPassword(temporaryPassword);

      const updateQueryString =
        'update users set password = ? where id = ? and email = ? and deleted_at is null';
      const updateQueryParams = [hashedTemporaryPassword, id, email];
      printSqlLog(updateQueryString, updateQueryParams);
      const resultOfUpdateQuery = await connection.execute(
        updateQueryString,
        updateQueryParams,
      );
      const isPwdUpdated = resultOfUpdateQuery[0].affectedRows > 0;
      if (!isPwdUpdated) {
        throw new InternalServerError('User password update fail');
      }

      // 임시 비밀번호가 포함된 이메일 발송
      await UserController.sendEmailForTemporaryPassword(
        email,
        temporaryPassword,
      );
      await connection.commit();
      return res.sendStatus(successCode.OK);
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      connection.release();
    }
  };
  // 사용자 프로필 이미지 업데이트
  static updateProfileImage = async (req, res, next) => {
    const reqObj = { ...req.params, ...req.body };
    const { image_path, userId } = reqObj;
    const connection = await pool.getConnection();

    try {
      const queryString = `update users set profile_image_path = ?, updated_at = ? where id = ?
      `;
      const updated_at = printCurrentTime();
      const queryParams = [image_path, updated_at, userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      const isUserProfileUpdated = result[0].affectedRows > 0;
      if (!isUserProfileUpdated) {
        throw new InternalServerError('PROFILE_INFO_UPDATE_FAILURE');
      }
      logger.info('Profile image path is updated successfully');
      return res.sendStatus(successCode.OK);
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  // 사용자 이름 및 휴대폰 정보 수정
  static updateNameAndPhoneNumber = async (req, res, next) => {
    const reqObj = { ...req.params, ...req.body };
    let { userId, phone_number, name } = reqObj;
    userId = parseInt(userId, 10);
    const connection = await pool.getConnection();

    try {
      const queryString =
        phone_number && name
          ? 'update users set name = ?, phone_number = ?, updated_at = ? where id = ?'
          : !phone_number
          ? 'update users set name = ?, updated_at = ? where id = ?'
          : 'update users set phone_number = ?, updated_at = ? where id = ?';
      const updated_at = printCurrentTime();
      const queryParams =
        phone_number && name
          ? [name, phone_number, updated_at, userId]
          : !phone_number
          ? [name, updated_at, userId]
          : [phone_number, updated_at, userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      const isUserInfoUpdated = result[0].affectedRows > 0;
      if (!isUserInfoUpdated) {
        throw new InternalServerError('User info is not updated');
      }

      logger.info('User info is updated');
      return res.sendStatus(successCode.OK);
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  static sendEmailForNewPassword = async function (req, res, next) {
    // 회원 이메일로 링크 전송
    const { email } = req.userInfo;
    try {
      // 송신자에게 보낼 메시지 작성
      const message = {
        from: process.env.ACCOUNT_USER, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 비밀번호 초기화 메일',
        html: `
        <p>비밀번호 초기화를 위해서는 아래의 URL 을 클릭해 주세요.</p>
        <a href="http://localhost:3000/user/reset/password/${req.session.userid}">👉클릭</a>
      `,
      };
      await sendEmailRun(message);
      return res.sendStatus(successCode.OK);
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
  // 비밀번호 초기화 메일 발송
  static sendPasswordInitMail = async function (req, res, next) {
    try {
      const { email } = req.body;
      const { userId } = req.params;
      // 토큰 생성 후 DB에 저장
      const tokenVal = await UserController.getTokenAfterDbSave(req);

      // 송신자에게 보낼 메시지 작성
      const message = {
        from: process.env.ACCOUNT_USER, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 비밀번호 초기화 메일',
        html: `
          <p>비밀번호 초기화를 위해서는 아래의 URL 을 클릭해 주세요.</p>
          <a href="http://localhost:3000/users/${userId}/reset-password/${tokenVal}">👉클릭</a>
        `,
      };
      const isMailSent = await sendMailRun(message); // 메일 발송

      // 이메일 발송이 완료되면,
      if (isMailSent) return res.sendStatus(successCode.OK);
    } catch (err) {
      next(err);
    }
  };
  static updateNewPassword = async (req, res, next) => {
    const reqObj = { ...req.params, ...req.body };
    let { userId, token, current_password, new_password } = reqObj;
    userId = parseInt(userId, 10);
    const queryString = {
      checkTokenExist: 'select count(0) from auth where token_value = ?',
      getPwdInDb:
        'select password from users where id = ? and deleted_at is null',
      updateNewPwd:
        'update users set password = ?, updated_at = ? where id = ? and deleted_at is null',
    };
    const queryParams = {
      checkTokenExist: [token],
      getPwdInDb: [userId],
      updateNewPwd: [],
    };
    const result = {};

    const connection = await pool.getConnection();
    connection.beginTransaction();

    try {
      // token_value로 token 일치 여부 파악
      printSqlLog(queryString.checkTokenExist, queryParams.checkTokenExist);
      result.checkTokenExist = await connection.query(
        queryString.checkTokenExist,
        queryParams.checkTokenExist,
      );
      const isTokenSame = result.checkTokenExist[0][0]['count(0)'] > 0;
      if (!isTokenSame)
        throw new InternalServerError('Token is not the same in db');
      logger.info('token is same');
      // token이 일치하면, userId로 db에 저장된 password 불러오기
      printSqlLog(queryString.getPwdInDb, queryParams.getPwdInDb);
      result.getPwdInDb = await connection.query(
        queryString.getPwdInDb,
        queryParams.getPwdInDb,
      );
      const pwdInDb = result.getPwdInDb[0][0].password;
      if (!pwdInDb)
        throw new InternalServerError('Password of user does not exist');
      logger.info('Password of user exist');
      // passwordInDb와 currentPassword 일치 여부 파악
      const isPwdMatch = await bcrypt.compare(current_password, pwdInDb);
      if (!isPwdMatch) throw new ClientError('password is wrong');
      logger.info('Password is same');
      // 비밀번호가 일치하면, 입력된 newPassword 암호화
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const encryptedPassword = bcrypt.hashSync(new_password, salt);
      logger.info('New password is encrypted');
      // 암호화된 newPassword를 db에 업데이트
      const updated_at = printCurrentTime();
      queryParams.updateNewPwd = [encryptedPassword, updated_at, userId];
      console.log('queryParams: ', queryParams.updateNewPwd);
      printSqlLog(queryString.updateNewPwd, queryParams.updateNewPwd);
      result.updateNewPwd = await connection.execute(
        queryString.updateNewPwd,
        queryParams.updateNewPwd,
      );
      console.log(result.updateNewPwd);
      const isNewPwdUpdated = result.updateNewPwd[0].affectedRows > 0;
      console.log('isNewPwdUpdated: ', isNewPwdUpdated);
      if (!isNewPwdUpdated)
        throw new InternalServerError('New password updated fail');
      logger.info('New password is updated');

      await connection.commit();
      return res.sendStatus(successCode.OK);
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      connection.release();
    }
  };

  static getTokenAfterDbSave = async function (req) {
    try {
      const token = generateRandomToken(); // 토큰 생성
      // auth 테이블에 저장할 토큰 정보 가공
      const data = {
        // 데이터 정리
        token_value: token,
        user_id: req.session.userid,
        time_to_live: 300, // 토큰 유효기한 설정(5분)
      };
      const isTokenSaved = await Auth.saveToken(data);
      if (!isTokenSaved) throw new InternalServerError('Token save fail');
      logger.info('Token is saved in db successfully');
      return token;
    } catch (err) {
      throw err;
    }
  };
  // 사용자 탈퇴 컨트롤러
  static deleteUser = async (req, res, next) => {
    const userId = req.params.userId;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'update users set deleted_at = ? where id = ? and deleted_at is null';
      const deleted_at = printCurrentTime();
      const queryParams = [deleted_at, userId];
      const result = connection.execute(queryString, queryParams);
      const isUserDeleted = result[0].affectedRows > 0;
      if (!isUserDeleted) {
        throw new InternalServerError('User is not deleted');
      }

      // 사용자 탈퇴에 따른 현재 활성화된 로그인 세션 삭제
      req.logout();
      return res.sendStatus(successCode.OK);
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  // 사용자가 작성한 모든 댓글 목록 조회
  // 필요 정보 : 카페 이름, 배경 이미지, 댓글
  static getReviewsByUserId = async (req, res, next) => {
    const reqObj = { ...req.params };
    const resObj = {};
    const { userId } = reqObj;
    const queryString = {
      comments: 'select cafe_id, comment from reviews where user_id=?',
      cafes:
        'select id, name, jibun_address, image_path from cafes where cafe_id=?',
    };
    const queryParams = {
      comments: [],
      cafes: [],
    };
    const result = {
      comments: [],
      cafes: [],
    };
    const connection = await pool.getConnection();
    connection.beginTransaction();

    try {
      // 먼저 reviews 테이블에서 cafe_id와 comment 가져오기
      queryParams.comments.push(userId);
      // result.comments[0] => [{cafe_id: 1, comment:"아주 멋있는 카페" }, {cafe_id: 2, comment:"분위기 좋은 카페" }, {cafe_id: 3, comment:"공부하기 좋은 카페" }]
      const result = await connection.query(
        queryString.comments,
        queryParams.comments,
      );
      if (result[0].length === 0) {
        next(new NotFoundError('Comment data does not exist'));
      }
      logger.info(`${result[0].length} comment data is searched!`);
      const commentList = result.comments[0];
      result.comments = commentList;
      // 이전에 조회한 cafe_id 로 cafes 테이블에서 name, jibun_address, image_path 가져오기
      for (let i = 0; i < commentList.length; i++) {
        queryParams.cafes = [commentList[i].cafe_id];
        // result[0] => [{name: , jibun_address, image_path: }]
        const result = await connection.query(
          queryString.cafes,
          queryParams.cafes,
        );
        if (result[0].length === 0) {
          next(new NotFoundError('Cafe info does not exist'));
        }
        logger.info(`CafeId ${commentList[i].cafe_id}'s data is searched!`);
        const cafeInfo = result[0];
        result.cafes.push(cafeInfo);
      }
      resObj.commentData = result.comments;
      resObj.cafeData = result.cafes;
      await connection.commit();

      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      await connection.rollback();
      throw new InternalServerError(err.message);
    } finally {
      connection.release();
    }
  };
  // 사용자가 좋아요 누른 카페 정보 조회
  static getUserLikeCafesByUserId = async (req, res, next) => {
    const reqObj = { ...req.params };
    const resObj = {};
    const { userId } = reqObj;

    // cafes 테이블과 likes 테이블
    // 검색 조건 :
    // likes 테이블에서 userId 로 cafeId 조회
    // 조회된 cafeId 로 정보 가져오기
    const queryString = {
      likes: 'select cafe_id from likes where user_id=?',
      cafes:
        'select cafe_id, name, jibun_address, image_path from cafes where cafe_id=?',
    };
    const queryParams = {
      likes: [userId],
      cafes: [],
    };
    const result = {
      likes: [],
      cafes: [],
    };
    const connection = await pool.getConnection();
    connection.beginTransaction();

    try {
      const result = await connection.query(
        queryString.likes,
        queryParams.likes,
      );
      if (result[0].length === 0) {
        next(new NotFoundError('Likes data does not exist'));
      }
      logger.info(`${result[0].length} likes data is searched!`);
      const likeCafeList = result[0];
      result.likes = likeCafeList;
      // 이전에 조회한 cafe_id 로 cafes 테이블에서 name, jibun_address, image_path 가져오기
      for (let i = 0; i < likeCafeList.length; i++) {
        queryParams.cafes = [likeCafeList[i].cafe_id];
        // result[0] => [{name: , jibun_address, image_path: }]
        const result = await connection.query(
          queryString.cafes,
          queryParams.cafes,
        );
        if (result[0].length === 0) {
          next(new NotFoundError('Cafe info does not exist'));
        }
        logger.info(`CafeId ${commentList[i].cafe_id}'s data is searched!`);
        const cafeInfo = result[0];
        result.cafes.push(cafeInfo);
      }
      resObj.cafeData = result.cafes;
      await connection.commit();

      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      await connection.rollback();
      throw new InternalServerError(err.message);
    } finally {
      connection.release();
    }
  };
}

module.exports = UserController;
