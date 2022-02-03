const User = require('../models/user');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// 사용자 정보 조회
exports.findAll = function (req, res) {
  User.findAll(function (err, user) {
    if (err) res.status(400).send(err);
    res.status(200).send(user);
  });
};
exports.findByValue = function (req, res) {
  let value = req.params.value;
  const emailRegex = /^[A-Za-z0-9_\.\-]+@[A-Za-z0-9\-]+\.[A-Za-z0-9\-]+/; // 이메일 형식 유효성 검사
  if (emailRegex.test(value)) {
    // path variable 이 이메일 형식이면
    User.findByEmail(value, function (err, user) {
      if (err) res.status(400).send(err);
      res.status(200).send(user);
    });
  } else {
    // path variable 이 그냥 문자열 형식이면
    User.findByName(value, function (err, user) {
      if (err) res.status(400).send(err);
      res.status(200).send(user);
    });
  }
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
exports.login = function (req, res) {
  const emailValue = req.body.email;
  const passwordValue = req.body.password;
  let userInfo;
  User.findByEmail(emailValue, function (err, user) {
    if (!user.length) {
      // user 가 존재하지 않으면
      return res
        .status(400)
        .send({ message: '해당 이메일은 등록되어 있지 않습니다.' });
    } else {
      userInfo = user[0];
      // 비밀번호 일치 여부 검사
      const check = bcrypt.compareSync(passwordValue, userInfo.password);

      if (check) {
        console.log('로그인 성공');
        // 로그인 성공 후 메인 페이지로 이동
        res.status(200);
      } else {
        res.status(400).send({
          message:
            '비밀번호를 잘못  입력하셨습니다. 다시 입력해주시기 바랍니다.',
        });
      }
    }
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
