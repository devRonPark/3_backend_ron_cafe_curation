const User = require('../models/user');
const { generateRandomPassword } = require('../middlewares/middlewares');
const {
  encryptTemporaryPassword,
} = require('../middlewares/passwordEncryption');
const { generateRandomNumber, generateRandomToken } = require('../models/util');
const { sendMailRun } = require('../config/smtpTransporter');
const logger = require('../config/logger');

// 사용자 정보 조회
exports.findAll = async function (req, res) {
  try {
    const response = await User.findAll();
    const userInfo = JSON.parse(JSON.stringify(response[0]));
    if (!userInfo) {
      return res.status(404).json({ message: 'Users_Not_Found' });
    }
    return res.status(200).json(userInfo);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: err.message });
  }
};
// 회원가입 컨트롤러
exports.create = async function (req, res, next) {
  // 사용자 객체 생성
  const newUser = new User(req.body);
  try {
    // 데이터베이스에 사용자 정보 저장
    const result = await User.create(newUser);
    return res.status(201).json({
      data: result,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ message: err.message });
  }
};
exports.authenticate = async function (req, res, next) {
  try {
    // 요청된 이메일을 데이터베이스에서 있는지 찾는다.
    const response = await User.findByEmail({ email: req.body.email });
    // user[0] => rowDataPacket
    // convert from rowDataPacket to plain object
    const userInfo = JSON.parse(JSON.stringify(response[0]));

    // user 가 존재하지 않거나 현재 user 가 탈퇴했다면,
    if (!userInfo || userInfo.status === 'N') {
      return res.status(404).json({
        message: 'User_Not_Found',
      });
    }
    // 요청된 이메일이 데이터베이스에 있다면 비밀번호가 맞는 비밀번호인지 확인.
    const isMatch = await User.comparePassword(
      req.body.password,
      userInfo.password,
    );

    // 비밀번호가 일치하지 않는다면,
    if (!isMatch) {
      return res.status(401).json({
        message: 'Password_Is_Wrong',
      });
    }
    // 사용자를 찾으면 세션에 userId 저장.
    req.session.userid = userInfo.id;
    console.log(req.session.userid);
    next();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({
      message: 'Internal_Server_Error',
    });
  }
};
exports.findEmail = async function (req, res, next) {
  try {
    const response = await User.getEmailByPhoneNumber({
      phone_number: req.body.phone_number,
    });
    const userInfo = JSON.parse(JSON.stringify(response[0]));

    // user 가 존재하지 않으면
    if (!userInfo) {
      return res.status(404).json({
        message: 'User_Not_Found',
      });
    }

    return res.status(200).json({ data: userInfo });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({
      message: 'Internal_Server_Error',
    });
  }
};

// 이메일 인증을 위한 6자리 인증번호를 포함한 메일 발송
exports.authEmail = async function (req, res) {
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
    return res.status(200).send({ authenticationNumber });
  } catch (err) {
    logger.error(err.message);
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
    logger.error(`sendEmailForTemporaryPassword Caught Error: ${err.message}`);
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
      return res.status(404).json({
        success: false,
        message: '제공된 휴대폰 번호 및 이메일에 해당하는 사용자가 없습니다.',
      });
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
      return res.status(200).json({ message: 'The_Mail_Is_Sent' });
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
    const result = await User.save(user); // 데이터베이스에 업데이트하고 성공 여부를 받아온다.
    return res.status(201).json({ message: 'Profile_Info_Is_Updated' });
  } catch (err) {
    return res.status(500).json({ message: err.message }); // 에러 미들웨어에서 처리
  }
};
// 사용자 휴대폰 번호 정보 업데이트
exports.updatePhoneNumber = async (req, res, next) => {
  const { userid } = req.session;
  req.body.id = userid;

  try {
    const user = new User(req.body);
    const result = await User.updatePhoneNumber(user); // 데이터베이스에 업데이트하고 성공 여부를 받아온다.
    return res.status(201).json({ message: 'Phone_Number_Info_Is_Updated' });
  } catch (err) {
    return res.status(500).json({ message: err.message }); // 에러 미들웨어에서 처리
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
    return res.json({ message: 'EMAIL_SENT_SUCCESS' });
  } catch (err) {
    logger.error(err.message);
    res.json({ message: err.message });
  }
};
