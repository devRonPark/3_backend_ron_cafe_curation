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
const { successCode, errorCode } = require('../lib/statusCodes/statusCode');
const pool = require('../config/mysql');
const NotFoundError = require('../lib/errors/not-found.error');
const InternalServerError = require('../lib/errors/internal-sever.error');
const ClientError = require('../lib/errors/client.error.js');

class UserController {
  static getLoggedInUsername = async (req, res, next) => {
    const userId = req.session.userid;
    console.log('userId: ', userId);
    const connection = await pool.getConnection();

    try {
      const queryString = 'select name from users where id = ?';
      const queryParams = [userId];
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) {
        throw new NotFoundError('User info does not exist');
      }

      return res.status(successCode.OK).json(userInfo);
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
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
  // @params req.body { name, email }
  // @returns res.body { id, name, email, phone_number, profile_image_path }
  static getUserInfo = async (req, res, next) => {
    const reqObj = { ...req.body };
    const resObj = {};
    const { name, email } = reqObj;

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select id, name, email from users where name = ? and email = ? and deleted_at is null';
      const queryParams = [name, email];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) {
        resObj.message = 'USER_NOT_EXIST';
      } else {
        resObj.user = userInfo;
      }
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };

  // 아이디 찾기 컨트롤러
  static getEmailByName = async function (req, res, next) {
    const reqObj = { ...req.body };
    const resObj = {};

    const { name } = reqObj;
    const connection = await pool.getConnection();

    try {
      const queryString =
        'select name, email from users where name = ? and deleted_at is null';
      const queryParams = [name];
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) {
        resObj.message = 'USER_NOT_EXIST';
      } else {
        logger.info('User info exists');
        resObj.user = userInfo;
      }

      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
  // userId로 아이디 찾기 컨트롤러
  static getEmailByUserId = async function (req, res, next) {
    const reqObj = { ...req.params };
    const resObj = {};

    let { userId } = reqObj;
    userId = parseInt(userId, 10);

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select email from users where id = ? and deleted_at is null';
      const queryParams = [userId];
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) {
        resObj.message = 'USER_ACCOUNT_NOT_EXIST';
      } else {
        logger.info('USER_ACCOUNT_EXISTS');
        resObj.email = userInfo.email;
      }

      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      next(err);
    }
  };
  static sendEmailForEmail = async (req, res, next) => {
    const reqObj = { ...req.body };
    const { email } = reqObj;
    try {
      // 송신자에게 보낼 메시지 작성
      const message = {
        from: process.env.ACCOUNT_USER, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 아이디 찾기 결과',
        html: `
            <p>ZZINCAFE에 가입한 사용자 아이디 정보</p>
            <h2>${email}</h2>
          `,
      };
      // 이메일 발송
      await sendMailRun(message);
      return res.sendStatus(successCode.OK);
    } catch (err) {
      throw new InternalServerError(err.message);
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
      return res.status(successCode.OK).json({ updatedImagePath: image_path });
    } catch (err) {
      next(err);
    } finally {
      connection.release();
    }
  };
  // 사용자 닉네임 수정
  static updateNameAndPhoneNumber = async (req, res, next) => {
    const reqObj = { ...req.params, ...req.body };
    let { userId, name } = reqObj;
    userId = parseInt(userId, 10);
    const connection = await pool.getConnection();

    try {
      const queryString =
        'update users set name = ?, updated_at = ? where id = ?';
      const updated_at = printCurrentTime();
      const queryParams = [name, updated_at, userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      const isUserInfoUpdated = result[0].affectedRows > 0;
      if (!isUserInfoUpdated) {
        throw new InternalServerError('User info is not updated');
      }

      logger.info('User info is updated');
      return res.status(successCode.OK).json({ updatedNickname: name });
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
          <p>위 링크는 10분 간만 유효합니다.</p>
        `,
      };
      const isMailSent = await sendMailRun(message); // 메일 발송

      // 이메일 발송이 완료되면,
      if (isMailSent) return res.sendStatus(successCode.OK);
    } catch (err) {
      next(err);
    }
  };
  // 비밀번호 업데이트
  static updateNewPassword = async (req, res, next) => {
    const reqObj = { ...req.params, ...req.body };
    const resObj = {};

    let { userId, token, current_password, new_password } = reqObj;
    userId = parseInt(userId, 10);

    const currentTime = printCurrentTime();
    const queryString = {
      // 토큰 유효 기한이 아직 유효한지까지도 검증
      checkTokenValid:
        'select count(0) from auth_email where ae_value = ? and expired_at > ?',
      getPwdInDb:
        'select password from users where id = ? and deleted_at is null',
      updateNewPwd:
        'update users set password = ?, updated_at = ? where id = ? and deleted_at is null',
    };
    const queryParams = {
      checkTokenValid: [token, currentTime],
      getPwdInDb: [userId],
      updateNewPwd: [],
    };
    const result = {};

    const connection = await pool.getConnection();
    connection.beginTransaction();

    try {
      // token_value로 token 일치 여부 파악
      printSqlLog(queryString.checkTokenValid, queryParams.checkTokenValid);
      result.checkTokenValid = await connection.query(
        queryString.checkTokenValid,
        queryParams.checkTokenValid,
      );
      const isTokenValid = result.checkTokenValid[0][0]['count(0)'] > 0;
      // 토큰이 만료된 경우
      if (!isTokenValid) {
        resObj.message = 'TOKEN_IS_EXPIRED';
        return res.status(errorCode.UNAUTHORIZED).json(resObj);
      }

      logger.info('token is valid');

      // token이 일치하면, userId로 db에 저장된 password 불러오기
      printSqlLog(queryString.getPwdInDb, queryParams.getPwdInDb);
      result.getPwdInDb = await connection.query(
        queryString.getPwdInDb,
        queryParams.getPwdInDb,
      );
      const pwdInDb = result.getPwdInDb[0][0].password;

      // passwordInDb와 currentPassword 일치 여부 파악
      const isPwdMatch = await bcrypt.compare(current_password, pwdInDb);
      if (!isPwdMatch) {
        resObj.message = 'PASSWORD_IS_WRONG';
        return res.status(successCode.OK).json(resObj);
      }

      // 비밀번호가 일치하면, 입력된 newPassword 암호화
      const saltRounds = 10;
      const salt = bcrypt.genSaltSync(saltRounds);
      const encryptedPassword = bcrypt.hashSync(new_password, salt);
      logger.info('New password is encrypted');

      // 암호화된 newPassword를 db에 업데이트
      const updated_at = printCurrentTime();
      queryParams.updateNewPwd = [encryptedPassword, updated_at, userId];
      printSqlLog(queryString.updateNewPwd, queryParams.updateNewPwd);
      result.updateNewPwd = await connection.execute(
        queryString.updateNewPwd,
        queryParams.updateNewPwd,
      );
      const isNewPwdUpdated = result.updateNewPwd[0].affectedRows > 0;
      if (!isNewPwdUpdated)
        throw new InternalServerError('New password updated fail');
      logger.info('New password is updated');

      // 사용자가 현재 로그인한 상태라면 새로 업데이트된 비밀번호로 로그인하도록 로그아웃 처리
      if (req.session.userid) {
        req.session.destroy(err => {
          console.log(
            'session object is deleted successfully in session store',
          );
          res.clearCookie('sessionID');
          res.clearCookie('userid');
        });
      }

      await connection.commit();
      connection.release();
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
        email: req.body.email,
        token_value: token,
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
    const reqObj = { ...req.params };
    const resObj = {};

    let { userId } = reqObj;
    userId = parseInt(userId, 10);

    const queryString = {
      users:
        'update users set deleted_at = ? where id = ? and deleted_at is null',
      likes:
        'update likes set deleted_at = ? where user_id = ? and deleted_at is null',
      reviews:
        'update reviews set deleted_at = ? where user_id = ? and deleted_at is null',
    };

    const connection = await pool.getConnection();
    connection.beginTransaction();
    try {
      const deleted_at = printCurrentTime();
      const queryParams = [deleted_at, userId];
      const resultOfUsers = await connection.execute(
        queryString.users,
        queryParams,
      );
      const isUserDeleted = resultOfUsers[0].affectedRows > 0;
      if (isUserDeleted) {
        logger.info('USER_DELETE_SUCCESS');
        resObj['deleted_at'] = deleted_at;
      }

      const resultOfLikes = await connection.execute(
        queryString.likes,
        queryParams,
      );
      const isLikesDeleted = resultOfLikes[0].affectedRows > 0;

      if (isLikesDeleted) logger.info('LIKE_DATA_EXIST_AND_DELETED');
      const resultOfReviews = await connection.execute(
        queryString.reviews,
        queryParams,
      );
      const isReviewsDeleted = resultOfReviews[0].affectedRows > 0;
      if (isReviewsDeleted) logger.info('LIKE_DATA_EXIST_AND_DELETED');

      await connection.commit();
      // 사용자 탈퇴에 따른 현재 활성화된 로그인 세션 삭제
      req.session.destroy(err => {
        console.log('session object is deleted successfully in session store');
        res.clearCookie('sessionID');
        res.clearCookie('userid');
      });
      // 사용자 회원 탈퇴 시에 사용자가 남긴 좋아요 및 리뷰 정보들 또한 전부 deleted_at 처리해야 하는 건가?
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      await connection.rollback();
      throw new InternalServerError(err.message);
    } finally {
      connection.release();
    }
  };
  // 사용자가 작성한 모든 리뷰 정보 조회
  static getReviewsByUserId = async (req, res, next) => {
    const reqObj = { ...req.params };
    const resObj = {};
    let { userId } = reqObj;
    userId = parseInt(userId, 10);

    const connection = await pool.getConnection();

    try {
      // userid 로 review 조회
      // inner join
      const queryString =
        'select r.id as review_id, r.cafe_id, r.ratings, r.comment, r.created_at, r.updated_at, c.name as cafe_name, u.name as user_name, u.profile_image_path from reviews as r join users as u on r.user_id = ? and r.deleted_at is null and r.user_id = u.id join cafes as c on c.id = r.cafe_id';
      const queryParams = [userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const reviewCount = result[0].length;
      if (reviewCount < 1) {
        resObj.message = 'MY_CAFE_REVIEWS_NOT_EXIST';
        return res.status(successCode.OK).json(resObj);
      }

      resObj.reviews = result[0];
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      throw new InternalServerError(err.message);
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
    const connection = await pool.getConnection();

    try {
      const queryString =
        'select l.cafe_id, c.name as cafe_name, c.jibun_address, c.image_path from likes as l join cafes as c on l.user_id = ? and l.deleted_at is null and l.cafe_id = c.id';
      const queryParams = [userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const likeCafeCount = result[0].length;
      if (likeCafeCount < 1) {
        resObj.message = 'MY_LIKE_CAFES_NOT_EXIST';
        return res.status(successCode.OK).json(resObj);
      }
      logger.info(`[UserId: ${userId}] Like cafes exist`);
      resObj.likes = result[0];
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };

  static checkIsPwdSame = async (req, res) => {
    const reqObj = { ...req.params, ...req.body };
    const resObj = {};

    let { userId, password } = reqObj;
    userId = parseInt(userId, 10);
    console.log('userId: ', userId);
    console.log('passwordInBody: ', password);

    const connection = await pool.getConnection();

    try {
      const queryString =
        'select password from users where id = ? and deleted_at is null';
      const queryParams = [userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const userInfo = result[0][0];
      if (!userInfo) {
        resObj.message = 'USER_NOT_EXIST';
      } else {
        // 비밀번호 일치 여부 검증
        const passwordInDb = result[0][0].password;
        console.log('passwordInDb: ', passwordInDb);
        const isPwdMatch = await bcrypt.compare(password, passwordInDb);

        if (!isPwdMatch) {
          resObj.isPwdMatch = false;
          logger.info('PASSWORD_NOT_SAME');
        } else {
          resObj.isPwdMatch = true;
          logger.info('PASSWORD_IS_SAME');
        }
      }
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
}

module.exports = UserController;
