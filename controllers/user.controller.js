const User = require('../models/user');
const { generateRandomPassword } = require('../middlewares/middlewares');
const {
  encryptTemporaryPassword,
} = require('../middlewares/passwordEncryption');
const smtpTransporter = require('../config/smtpTransporter');

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
    } else {
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
    }
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
exports.findPassword = (req, res) => {
  User.getPassword;
};

// min ~ max 까지 랜덤으로 숫자 생성
const generateRandom = function (min, max) {
  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNumber;
};
// 이메일 인증을 위한 6자리 인증번호를 포함한 메일 발송
exports.authEmail = async function (req, res) {
  try {
    // 회원가입 시 사용자가 입력한 이메일 주소
    const { email } = req.body;
    // 이메일 인증을 위해 랜덤한 6자리 인증번호 생성
    const authenticationNumber = generateRandom(111111, 999999);

    // SMTP 연결 설정 검증
    smtpTransporter.verify(function (error, success) {
      if (error) console.log(error);
      else {
        console.log('Service is ready to take our messages.');
      }
    });

    // 송신자에게 보낼 메시지 작성
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

    const result = await smtpTransporter.sendMail(message, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(400);
      } else {
        console.log(info.response);
        return res.status(200).send({ success: true, authenticationNumber });
      }
    });
    smtpTransporter.close();
  } catch (err) {
    res.send(err);
  }
};
const sendEmailForNewPassword = (email, newPassword) => {
  return new Promise((resolve, reject) => {
    try {
      // SMTP 연결 설정 검증
      smtpTransporter.verify(function (error, success) {
        if (error) reject(error);
        else {
          console.log('Service is ready to take our messages.');
        }
      });

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
      smtpTransporter
        .sendMail(message)
        .then(response => {
          console.log('.then handler is called');
          resolve(true);
        })
        .catch(console.log);
    } catch (err) {
      reject(err);
    }
  });
};
// 비밀번호 찾기 라우터 로직
exports.findPassword = function (req, res) {
  let isMailSent = false;
  const userInfo = {
    phone_number: req.body.phone_number,
    email: req.body.email,
  };
  User.getUserIdByPhoneNumberAndEmail(userInfo, function (err, user) {
    if (err) return res.send(err);
    const userInfo = JSON.parse(JSON.stringify(user[0]));

    // 데이터베이스 조회 결과 사용자가 존재하지 않는다면
    if (!userInfo) {
      return res.status(404).json({
        success: false,
        message: '제공된 휴대폰 번호 및 이메일에 해당하는 사용자가 없습니다.',
      });
    }
    console.log('사용자 정보 존재함.');

    // 8자리의 임시 비밀번호 생성
    const temporaryPassword = generateRandomPassword();
    // 비밀번호 암호화
    const hashedTemporaryPassword = encryptTemporaryPassword(temporaryPassword);
    console.log('hashedTemporaryPassword: ', hashedTemporaryPassword);
    // 데이터베이스로 전달할 사용자 객체의 비밀번호 값로 생성된 임시 비밀번호 저장
    userInfo.password = hashedTemporaryPassword;
    // 데이터베이스에 임시 비밀번호 저장
    User.updatePassword(userInfo, function (err, success) {
      if (err) return res.send(err);
      // 데이터베이스에 임시 비밀번호 저장 성공 시
      if (success) {
        // 임시 비밀번호가 포함된 이메일 발송
        sendEmailForNewPassword('jspark9236@naver.com', temporaryPassword)
          .then(result => {
            console.log('success');
            res.status(200).json({ message: 'The Mail is Sent.' });
          })
          .catch(err => {
            console.log('error');
            res.status(500).send(err);
          });
      }
    });
  });
};
exports.updateProfileInfo = async (req, res, next) => {
  const { userid } = req.session;
  req.body.id = userid;

  try {
    const user = new User(req.body);
    const result = await User.save(user); // 데이터베이스에 업데이트하고 성공 여부를 받아온다.
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message }); // 에러 미들웨어에서 처리
  }
};
exports.updatePhoneNumber = async (req, res, next) => {
  const { userid } = req.session;
  req.body.id = userid;

  try {
    const user = new User(req.body);
    const result = await User.updatePhoneNumber(user); // 데이터베이스에 업데이트하고 성공 여부를 받아온다.
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message }); // 에러 미들웨어에서 처리
  }
};
