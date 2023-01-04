const {
  encryptTemporaryPassword,
} = require('../../common/middlewares/passwordEncryption');
const {
  generateRandomToken,
  printCurrentTime,
  printSqlLog,
  checkPasswordMatch,
  encryptPassword,
} = require('../../common/utils/util');
const { sendMailRun } = require('../../config/smtpTransporter');
const logger = require('../../config/logger');
const Auth = require('../auth/auth.service');
const {
  successCode,
  errorCode,
} = require('../../common/statusCodes/statusCode');
const pool = require('../../config/mysql');
const NotFoundError = require('../../common/errors/not-found.error');
const InternalServerError = require('../../common/errors/internal-sever.error');
const config = require('../../config/config');
const UserService = require('./user.service');
const messages = require('../../common/errors/message');
const { findUserOption } = require('../../common/constants');
const { updateNickname } = require('./user.service');
const AuthService = require('../auth/auth.service');

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
    const result = await UserService.findUserByType(
      findUserOption.id,
      parseInt(req.params.userId, 10),
    );

    if (result == 500) next(new InternalServerError(messages[500]));
    else if (result == 404) next(new NotFoundError(messages[404]));

    return res.status(successCode.OK).json(result);
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
  // 사용자 검증 후 디비에서 조회된 사용자 정보 응답
  // @params req.body { name, email }
  // @returns res.body { id, name, email, phone_number, profile_image_path }
  static getUserInfo = async (req, res, next) => {
    const result = await UserService.findUserByOptions(req.body);
    if (result == 500) return next(new InternalServerError(messages[500]));
    else if (result == 404) return next(new NotFoundError(messages[404]));

    return res.status(successCode.OK).json(result);
  };

  // 아이디 찾기 컨트롤러
  static getEmailByName = async (req, res, next) => {
    const result = await UserService.findUserByType(
      findUserOption.name,
      req.body.name,
    );
    if (result == 500) return next(new InternalServerError(messages[500]));
    else if (result === 404) return next(new NotFoundError(messages[404]));

    return res.status(successCode.OK).json(result);
  };
  // userId로 아이디 찾기 컨트롤러
  static getEmailByUserId = async (req, res, next) => {
    const result = await UserService.findUserByType(
      findUserOption.id,
      parseInt(req.params.userId, 10),
    );
    if (result == 500) next(new InternalServerError(messages[500]));
    else if (result == 404) next(new NotFoundError(messages[404]));
    return res.status(successCode.OK).json({ email: result.email });
  };
  static sendEmailWithAccountInfo = async (req, res, next) => {
    try {
      // 송신자에게 보낼 메시지 작성
      const message = {
        from: config.mailInfo.user, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 아이디 찾기 결과',
        html: `
            <p>ZZINCAFE에 가입한 사용자 아이디 정보</p>
            <h2>${req.body.email}</h2>
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
        from: config.mailInfo.user, // 송신자 이메일 주소
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
  static sendEmailWithNewPassword = async (req, res, next) => {
    try {
      // 8자리의 임시 비밀번호 생성
      const temporaryPassword = generateRandomPassword();
      // 비밀번호 암호화
      const hashedTemporaryPassword =
        encryptTemporaryPassword(temporaryPassword);

      const result = await UserService.updatePassword({
        password: hashedTemporaryPassword,
        id: req.body.id,
        email: req.body.email,
      });
      if (result == 500) throw err;

      // 임시 비밀번호가 포함된 이메일 발송
      await UserController.sendEmailForTemporaryPassword(
        email,
        temporaryPassword,
      );
      return res.sendStatus(successCode.OK);
    } catch (err) {
      next(new InternalServerError(messages[500]));
    }
  };
  // 사용자 프로필 이미지 업데이트
  static updateProfileImage = async (req, res, next) => {
    const result = await UserService.updateProfile({
      profilePath: req.body.image_path,
      updatedAt: printCurrentTime(),
      id: parseInt(req.params.userId, 10),
    });
    if (result == 500) return next(new InternalServerError(messages[500]));
    return res.status(successCode.OK).json({ updatedImagePath: image_path });
  };
  // 사용자 닉네임 수정
  static updateNickname = async (req, res, next) => {
    const result = await updateNickname({
      id: parseInt(req.params.userId, 10),
      name: req.body.name,
      updatedAt: printCurrentTime(),
    });
    if (result == 500) return next(new InternalServerError(messages[500]));
    return res.status(successCode.OK).json({ updatedNickname: name });
  };
  static sendEmailForNewPassword = async (req, res, next) => {
    // 회원 이메일로 링크 전송
    const { email } = req.userInfo;
    try {
      // 송신자에게 보낼 메시지 작성
      const message = {
        from: config.mailInfo.user, // 송신자 이메일 주소
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
  static sendPasswordInitMail = async (req, res, next) => {
    try {
      const { email } = req.body;
      const { userId } = req.params;
      // 토큰 생성 후 DB에 저장
      const tokenVal = await UserController.getTokenAfterDbSave(req);

      // 송신자에게 보낼 메시지 작성
      const message = {
        from: config.mailInfo.user, // 송신자 이메일 주소
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
    const currentTime = printCurrentTime();
    // 토큰 만료 여부 체크
    const [resultOfTokenCheck] = await AuthService.checkTokenValid(
      req.params.token,
      currentTime,
    );
    const isTokenValid = resultOfTokenCheck[0]['count(0)'] > 0;
    if (!isTokenValid) {
      resObj.message = 'TOKEN_IS_EXPIRED';
      return res.status(errorCode.UNAUTHORIZED).json(resObj);
    }
    logger.info('token is valid');

    const resultOfFindPassword = await UserService.findPasswordById(
      parseInt(req.params.userId, 10),
    );
    if (resultOfFindPassword == 404) next(new NotFoundError(messages[404]));
    const pwdInDb = resultOfFindPassword.password;

    // passwordInDb와 currentPassword 일치 여부 파악
    const isPwdMatch = await checkPasswordMatch(current_password, pwdInDb);
    if (!isPwdMatch) {
      resObj.message = 'PASSWORD_IS_WRONG';
      return res.status(successCode.OK).json(resObj);
    }

    // 비밀번호가 일치하면, 입력된 newPassword 암호화
    const encryptedPassword = encryptPassword(req.body.new_password);
    logger.info('New password is encrypted');

    const resultOfUpdatePassword = await UserService.updateNewPassword({
      id: parseInt(req.params.userId, 10),
      password: encryptedPassword,
    });
    if (resultOfUpdatePassword == 500)
      next(new InternalServerError(messages[500]));

    logger.info('New password is updated');

    // 사용자가 현재 로그인한 상태라면 새로 업데이트된 비밀번호로 로그인하도록 로그아웃 처리
    if (req.session.userid) {
      req.session.destroy(err => {
        res.clearCookie('sessionID');
        res.clearCookie('userid');
      });
    }

    return res.sendStatus(successCode.OK);
  };

  static getTokenAfterDbSave = async req => {
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
    const result = await UserService.deleteUser(
      parseInt(req.params.userId, 10),
    );
    if (result == 500) next(new InternalServerError(messages[500]));

    try {
      // 사용자 탈퇴에 따른 현재 활성화된 로그인 세션 삭제
      req.session.destroy(err => {
        res.clearCookie('sessionID');
        res.clearCookie('userid');
      });
      return res.status(successCode.OK).json({ deleted_at: result });
    } catch (err) {
      next(new InternalServerError(messages[500]));
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

  static checkIsPasswordSame = async (req, res) => {
    const result = await UserService.findPasswordById(
      parseInt(req.params.userId, 10),
    );
    if (result == 500) next(new InternalServerError(messages[500]));
    else if (result == 404) next(new NotFoundError(messages[400]));

    try {
      const isPasswordMatch = await checkPasswordMatch(
        req.body.password,
        result.password,
      );
      if (!isPasswordMatch) {
        resObj.isPwdMatch = false;
        logger.info('PASSWORD_NOT_SAME');
      } else {
        resObj.isPwdMatch = true;
        logger.info('PASSWORD_IS_SAME');
      }

      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      logger.error(err);
      next(new InternalServerError(messages[500]));
    }
  };

  static validateUserWithPasswordCheck = async (req, res, next) => {
    const result = await UserService.findPasswordById(
      parseInt(req.params.userId, 10),
    );
    if (result == 500) return next(new InternalServerError(messages[500]));
    else if (result == 404) return next(new NotFoundError(messages[400]));

    try {
      const isPasswordMatch = await checkPasswordMatch(
        req.body.password,
        result.password,
      );
      if (!isPasswordMatch) {
        return next(new NotFoundError(messages[404]));
      } else {
        return res.status(successCode.OK).json({ userId: result.id });
      }
    } catch (err) {
      logger.error(err.stack);
      next(new InternalServerError(messages[500]));
    }
  };
}

module.exports = UserController;
