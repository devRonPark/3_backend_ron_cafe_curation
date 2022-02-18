const express = require('express');

const userRouter = express.Router();
const UserController = require('../controllers/user.controller');
const {
  validateUsername,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validatePhoneNumber,
  validateCallback,
} = require('../middlewares/validate');
const { passwordEncryption } = require('../middlewares/passwordEncryption');
const { uploadFile } = require('../middlewares/userProfileUpload');
const {
  checkEmailAlreadyExists,
} = require('../middlewares/checkEmailAlreadyExists');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares/middlewares');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');
const Auth = require('../models/auth');

// 사용자 정보 조회
userRouter.get('/', UserController.findAll);
// 사용자 회원가입 페이지 접근
userRouter.get('/register', isNotLoggedIn, (req, res) => {
  res.send('회원가입 페이지');
});
// 사용자 로그인 페이지 접근
userRouter.get('/login', isNotLoggedIn, (req, res) => {
  res.send('로그인 페이지');
});
// 사용자 회원가입
userRouter.post(
  '/register',
  uploadFile, // 이미지 파일 서버 폴더 업로드 및 파일 경로 req 객체에 추가
  [
    validateUsername,
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
    validatePhoneNumber,
    validateCallback,
    checkEmailAlreadyExists,
  ],
  passwordEncryption, // 비밀번호 암호화
  UserController.create,
);
// 사용자 로그인
userRouter.post(
  '/login',
  [validateEmail, validateCallback], // 입력 값 유효성 검사
  UserController.authenticate,
  (req, res) => res.sendStatus(200),
);
// 사용자 로그아웃
userRouter.get('/logout', (req, res, next) => {
  // 로그아웃
  req.logout();
  res.sendStatus(200);
});
// 사용자 아이디 찾기
// 1. req.body.phone_number 데이터에 접근
// 2. req.body.phone_number 가 공란이면 에러 메세지, 형식을 지키지 않아도 에러 메세지
// 3. 유효성 검사 통과 후 휴대폰 번호 기준으로 데이터베이스 조회
// 4. 사용자 이메일 주소 암호화해 전송
userRouter.post('/test', uploadFile, (req, res) => res.sendStatus(200));
userRouter.post(
  '/find/email',
  [validatePhoneNumber, validateCallback],
  UserController.findEmail,
);
// 사용자 비밀번호 찾기
// ✔ 1. req.body.phone_number, req.body.email 유효성 검사
// ✔ 2. 유효성 검사 통과 후 휴대폰 번호, 이메일 주소로 데이터베이스 조회
// ✔ 3. 사용자 정보 존재하면, 임시 비밀번호 생성
// ✔ 4. 생성한 임시 비밀번호 암호화해서 데이터베이스에 저장
// ✔ 5. 임시 비밀번호 사용자 이메일 주소로 발송
userRouter.post(
  '/find/password',
  [validatePhoneNumber, validateEmail, validateCallback],
  UserController.findPassword,
);

// 회원가입 시 이메일 인증
userRouter.post('/auth/email', UserController.authEmail);

// User 회원정보 변경 (PUT /user/edit)
// 1. 프로필 변경(프로필 이미지, 닉네임)
//   - req.session.userid 가 존재하는 경우에만 동작함.
//   - 사용자가 이미지를 변경한다, 닉네임을 변경한다
//   - 클라이언트로부터 전달 받은 데이터의 유효성 검사 : req.body.nickname 이 존재하면 validateUsername
//   - req.session.userid 를 기준으로 데이터베이스 업데이트
userRouter.put(
  '/edit/profile',
  isLoggedIn,
  uploadFile,
  [validateUsername, validateCallback], // 입력 값 유효성 검사
  UserController.updateProfileInfo,
);
// 2. 휴대전화 변경
//   - req.session.userid 가 존재하는 경우에만 동작함.
//   - 사용자가 휴대폰 번호를 변경한다
//   - 클라이언트로부터 전달 받은 데이터의 유효성 검사 : req.body.phone_number 이 존재하면 validatePhoneNumber
//   - req.session.userid 를 기준으로 데이터베이스 업데이트
userRouter.put(
  '/edit/phone_number',
  isLoggedIn,
  [validatePhoneNumber, validateCallback],
  UserController.updatePhoneNumber,
);
// 3. 비밀번호 변경
//   - 비밀번호 변경을 요청한 회원이 데이터베이스에 존재하는지 확인(findOne)
//   - 서버에서 세션 객체에 생성하여 데이터베이스에 저장
//   - nodemailer 를 통해 회원 이메일로 링크 전송
//   - 회원은 링크에 접속하여 새로운 비밀번호 설정하고(여기서 유효성 검사 실시?) 서버로 전송
//   - 서버에서는 사용자가 입력한 현재 비밀번호와 데이터베이스에 저장된 비밀번호가 일치하는지 확인
//   - update 쿼리문으로 비밀번호 재설정 완료
//   - (비밀번호가 변경된 경우)데이터베이스 업데이트 후 현재 로그인 된 세션 삭제
// -> 비밀번호 초기화 이메일 발송 API
userRouter.post(
  '/edit/password',
  isLoggedIn,
  UserController.sendPasswordInitMail,
);
// -> 현재 비밀번호, 새로 변경할 비밀번호 입력 후 업데이트 요청
userRouter.post(
  '/reset/password/:token',
  [
    validatePassword('currentPassword'),
    validatePassword('password'),
    validateCallback,
  ], // 유효성 검증
  async (req, res, next) => {
    const { token } = req.params;
    const { currentPassword } = req.body;

    try {
      const tokenInDb = await Auth.getTokenByValue({ token_value: token });
      const tokenInfo = tokenInDb.data[0];
      const isTokenExist = tokenInfo ?? false;
      // 비밀번호 변경 메일 발송 시 발급된 토큰 값이 존재하면,
      if (isTokenExist) {
        // 마지막 handler 에서 user_id 접근 가능하도록 req에 저장.
        req.body.userId = tokenInfo.user_id;
        // 입력된 현재 비밀번호가 맞는지 확인 => 데이터베이스 조회 동작
        const passwordInDb = await User.getPasswordById({
          id: req.body.userId,
        });
        // 입력받은 비밀번호와 데이터베이스 비밀번호 비교
        const isMatch = await bcrypt.compare(
          currentPassword,
          passwordInDb.data[0].password,
        );
        // 입력된 현재 비밀번호가 일치한다면
        if (isMatch) {
          next();
        } else {
          // 클라이언트의 잘못된 비밀번호 입력에 따른 오류 처리
          return res.status(404).json({ message: 'Password_Is_Wrong' });
        }
        // 암호화된 newPassword 데이터베이스에 저장
        // => User.updatePassword 호출
      }
    } catch (err) {
      logger.error(err.stack);
      return res.json({ message: err.message });
    }
  },
  passwordEncryption, // 입력된 newPassword 암호화
  async (req, res) => {
    try {
      const response = await User.updatePassword({
        id: req.body.userId,
        password: req.body.password,
      });
      if (response.state) {
        req.logout(); // 세션 데이터 삭제
        return res.status(201).json({ message: 'Password_Is_Updated' });
      }
    } catch (err) {
      logger.error(err.stack);
      return res.json({ message: err.message });
    }
  },
);
// 회원 탈퇴
//   - req.session.userid 가 존재하는 경우에만 동작함.
// 탈퇴 요청 들어올 시 회원 상태를 비활성화로 변경시켜준다.
userRouter.delete('/delete', isLoggedIn, async (req, res) => {
  try {
    const response = await User.disable(req.session.userid);
    if (response.state) {
      // 사용자 탈퇴에 따른 현재 활성화된 로그인 세션 삭제
      req.logout();
      return res.sendStatus(204);
    }
  } catch (err) {
    logger.error(err.stack);
    return res.json({ message: err.message });
  }
});

module.exports = userRouter;
