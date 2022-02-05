const User = require('../models/user');
const nodemailer = require('nodemailer');

// 사용자 정보 조회
exports.findAll = function (req, res) {
  User.findAll(function (err, user) {
    if (err) res.status(400).send(err);
    res.status(200).send(user);
  });
};
// 회원가입 컨트롤러
exports.create = function (req, res, next) {
  // 사용자 객체 생성
  const newUser = new User(req.body);

  // 데이터베이스에 사용자 정보 저장
  User.create(newUser, function (err, user) {
    if (err) next(err);
    return res.status(201).json({
      data: user,
    });
  });
};
exports.authenticate = function (req, res, next) {
  let userInfo;
  // 요청된 이메일을 데이터베이스에서 있는지 찾는다.
  User.findByEmail(req.body.email, function (err, user) {
    // 데이터베이스 조회 중 오류 발생
    if (err) return res.status(400).json(err);
    // user[0] => rowDataPacket
    // convert from rowDataPacket to plain object
    userInfo = JSON.parse(JSON.stringify(user[0]));
    // user 가 존재하지 않으면
    if (!userInfo) {
      return res.status(404).json({
        success: false,
        message: '제공된 이메일에 해당하는 사용자가 없습니다.',
      });
    }

    // 요청된 이메일이 데이터베이스에 있다면 비밀번호가 맞는 비밀번호인지 확인.
    User.comparePassword(
      req.body.password,
      userInfo.password,
      (err, isMatch) => {
        // bcrypt compare 함수 동작 중 오류 발생
        if (err) return res.status(401).json(err);
        // 비밀번호가 일치하지 않는다면,
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: '비밀번호가 틀렸습니다.',
          });
        }
        // 사용자를 찾으면 세션에 userId 저장.
        req.session.userid = userInfo.id;
        console.log(req.session.userid);
        next();
      },
    );
  });
};
exports.sendLoginPage = function (req, res) {
  const output = `
    <h1>Login</h1>
    <form action="/users/login" method="POST">
      <p>
        <input type="text" name="email" placeholder="ID" />
      </p>
      <p>
        <input type="password" name="password" placeholder="Password" />
      </p>
      <p>
        <input type="submit" />
      </p>
    </form>
  `;

  res.send(output);
};
exports.findEmail = function (req, res, next) {
  User.getEmailByPhoneNumber(req.body.phone_number, function (err, user) {
    if (err) return next(err);

    const userInfo = JSON.parse(JSON.stringify(user[0]));

    // user 가 존재하지 않으면
    if (!userInfo) {
      return res.status(404).json({
        success: false,
        message: '제공된 휴대폰 번호에 해당하는 사용자가 없습니다.',
      });
    }

    res.status(200).json({ data: userInfo });
  });
};

// min ~ max 까지 랜덤으로 숫자 생성
const generateRandom = function (min, max) {
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNumber;
};

exports.authEmail = async function (req, res) {
  // 입력 받아온 이메일 주소로 6자리 인증번호 발송
  const { email } = req.body;
  // 이메일 인증을 위해 랜덤한 6자리 인증번호 생성
  const verificationNumber = generateRandom(111111, 999999);

  // 이메일 서버 옵션
  const smtpOption = {
    host: 'smtp.mailtrap.io',
    port: 2525,
    secure: false,
    auth: {
      user: '66028f91230169',
      pass: '34bafb33d8225a',
    },
  };

  const smtpTransport = nodemailer.createTransport(smtpOption);

  // 유효한 이메일 주소인지 확인하기 위해 이메일 인증 메일 발송
  const emailInfo = {
    from: 'admin@zzincafe.com',
    to: email,
    subject: '이메일 인증 안내',
    text:
      '이 메일은 이메일이 유효한 지 확인하기 위한 인증 메일입니다. 아래 6자리 숫자를 기억해뒀다 회원가입 시 입력해주세요 : ' +
      verificationNumber,
  };

  const result = await smtpTransport.sendMail(emailInfo, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(400);
    } else {
      console.log(info.response);
      return res.status(200).send({ verificationNumber });
    }
  });
  smtpTransport.close();
};
