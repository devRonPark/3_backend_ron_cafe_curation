const User = require('../models/user');
const { generateRandomPassword } = require('../middlewares/middlewares');
const {
  encryptTemporaryPassword,
} = require('../middlewares/passwordEncryption');
const { generateRandomToken } = require('../models/util');
const { sendMailRun } = require('../config/smtpTransporter');
const logger = require('../config/logger');
const Auth = require('../models/auth');
const { successCode, errorCode } = require('../statusCode');

// 사용자 정보 조회
exports.findAll = async function (req, res) {
  try {
    const response = await User.findAll();
    const usersInfo = response.data;
    if (!usersInfo.length) {
      return res.sendStatus(errorCode.NOTFOUND);
    }
    return res.status(successCode.OK).json(usersInfo);
  } catch (err) {
    logger.error(err.stack);
    return res.json({ message: err.message });
  }
};

// 아이디 찾기 컨트롤러
exports.findEmail = async function (req, res, next) {
  try {
    // 휴대폰 번호로 이메일 정보 가져오기
    const response = await User.getEmailByPhoneNumber({
      phone_number: req.body.phone_number,
    });
    const userEmail = response.data[0].email;

    // user 가 존재하지 않으면
    if (!userId) {
      return res.sendStatus(successCode.NOTFOUND);
    }

    return res.status(successCode.OK).json({ data: userEmail });
  } catch (err) {
    logger.error(err.stack);
    return res.json({
      message: err.message,
    });
  }
};

// 비밀번호 찾기 로직 상, 임시 비밀번호가 포함된 이메일 발송
const sendEmailForTemporaryPassword = async (email, newPassword) => {
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
    logger.error(err.stack);
    throw new Error(err.message);
  }
};
// 비밀번호 찾기 라우터 로직
exports.findPassword = async function (req, res) {
  try {
    const { phone_number, email } = req.body;
    const result = await User.getUserIdByPhoneNumberAndEmail({
      phone_number,
      email,
    });
    const userInfo = result.data[0];

    // 데이터베이스 조회 결과 사용자가 존재하지 않는다면
    if (!userInfo) {
      return res.sendStatus(errorCode.NOTFOUND);
    }

    // 8자리의 임시 비밀번호 생성
    const temporaryPassword = generateRandomPassword();
    // 비밀번호 암호화
    const hashedTemporaryPassword = encryptTemporaryPassword(temporaryPassword);
    // 데이터베이스로 전달할 사용자 객체의 비밀번호 값로 생성된 임시 비밀번호 저장
    userInfo.password = hashedTemporaryPassword;
    // 데이터베이스에 임시 비밀번호 저장
    const isUpdated = await User.updatePassword(userInfo);
    if (isUpdated.state) {
      // 임시 비밀번호가 포함된 이메일 발송
      await sendEmailForTemporaryPassword(email, temporaryPassword);
      return res.sendStatus(successCode.OK);
    }
  } catch (err) {
    logger.error(err.stack);
    return res.json({ message: err.message });
  }
};
// 사용자 프로필 정보 업데이트
exports.updateProfileInfo = async (req, res, next) => {
  const { userid } = req.session;
  req.body.id = userid;

  try {
    const user = new User(req.body);
    const result = await User.updateProfileInfo(user); // 데이터베이스에 업데이트하고 성공 여부를 받아온다.
    return res
      .status(successCode.CREATED)
      .json({ message: 'Profile_Info_Is_Updated' });
  } catch (err) {
    logger.error(err.stack);
    return res.json({ message: err.message }); // 에러 미들웨어에서 처리
  }
};
// 사용자 휴대폰 번호 정보 업데이트
exports.updatePhoneNumber = async (req, res, next) => {
  const { userid } = req.session;
  req.body.id = userid;

  try {
    const user = new User(req.body);
    const response = await User.updatePhoneNumber(user); // 데이터베이스에 업데이트하고 성공 여부를 받아온다.
    return res
      .status(successCode.CREATED)
      .json({ message: 'Phone_Number_Info_Is_Updated' });
  } catch (err) {
    logger.error(err.stack);
    return res.json({ message: err.message }); // 에러 미들웨어에서 처리
  }
};
exports.sendEmailForNewPassword = async function (req, res, next) {
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
    logger.error(err.message);
    res.json({ message: err.message });
  }
};
// 비밀번호 초기화 메일 발송
exports.sendPasswordInitMail = async function (req, res) {
  try {
    const { email } = req.body;
    // 토큰 생성 후 DB에 저장
    const { token, response } = await getTokenAfterDbSave(req);
    // 토큰 정보가 DB에 저장되면,
    if (response.state) {
      // 송신자에게 보낼 메시지 작성
      const message = {
        from: process.env.ACCOUNT_USER, // 송신자 이메일 주소
        to: email, // 수신자 이메일 주소
        subject: '☕ ZZINCAFE 비밀번호 초기화 메일',
        html: `
        <p>비밀번호 초기화를 위해서는 아래의 URL 을 클릭해 주세요.</p>
        <a href="http://localhost:3000/user/reset/password/${token}">👉클릭</a>
      `,
      };
      const isMailSent = await sendMailRun(message); // 메일 발송
      // 이메일 발송이 완료되면,
      if (isMailSent) return res.sendStatus(successCode.OK);
    }
  } catch (err) {
    logger.error(err.stack);
    return res.json({ message: err.message });
  }
};
const getTokenAfterDbSave = async function (req) {
  try {
    const token = generateRandomToken(); // 토큰 생성
    // auth 테이블에 저장할 토큰 정보 가공
    const data = {
      // 데이터 정리
      token_value: token,
      user_id: req.session.userid,
      time_to_live: 300, // 토큰 유효기한 설정(5분)
    };
    const response = await Auth.saveToken(data);
    return { token, response };
  } catch (err) {
    logger.error(err.stack);
    throw new Error(err.message);
  }
};
