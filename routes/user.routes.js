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
const { upload, uploadCallback } = require('../middlewares/userProfileUpload');
const {
  checkEmailAlreadyExists,
} = require('../middlewares/checkEmailAlreadyExists');
const {
  isAuthenticated,
  isNotAuthenticated,
} = require('../middlewares/middlewares');

// 사용자 정보 조회
userRouter.get('/', UserController.findAll);
// 사용자 회원가입 페이지 접근
userRouter.get('/register', isNotAuthenticated, (req, res) => {
  res.send('회원가입 페이지');
});
// 사용자 로그인 페이지 접근
userRouter.get('/login', isNotAuthenticated, (req, res) => {
  res.send('로그인 페이지');
});
// 사용자 회원가입
userRouter.post(
  '/register',
  [upload.single('profile'), uploadCallback], // 이미지 파일 서버 폴더 업로드 및 파일 경로 req 객체에 추가
  [
    validateUsername,
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
    validatePhoneNumber,
    validateCallback,
  ], // 입력 값 유효성 검사
  checkEmailAlreadyExists,
  passwordEncryption, // 비밀번호 암호화
  UserController.create,
);
// 사용자 로그인
userRouter.post(
  '/login',
  [validateEmail, validatePassword, validateCallback], // 입력 값 유효성 검사
  UserController.authenticate,
  (req, res) => res.status(200).json({ success: true }),
);
// 사용자 로그아웃
userRouter.get('/logout', (req, res, next) => {
  // 로그아웃
  req.logout();

  res.status(200).json({ success: true });
});
// 사용자 아이디 찾기
// 1. req.body.phone_number 데이터에 접근
// 2. req.body.phone_number 가 공란이면 에러 메세지, 형식을 지키지 않아도 에러 메세지
// 3. 유효성 검사 통과 후 휴대폰 번호 기준으로 데이터베이스 조회
// 4. 사용자 이메일 주소 암호화해 전송
userRouter.post(
  '/find/email',
  [validatePhoneNumber, validateCallback],
  UserController.findEmail,
);
// 사용자 비밀번호 찾기
// ✔ 1. req.body.phone_number, req.body.email 유효성 검사
// ✔ 2. 유효성 검사 통과 후 휴대폰 번호, 이메일 주소로 데이터베이스 조회
// ✔ 3. 사용자 정보 존재하면, 임시 비밀번호 생성
// 4. 생성한 임시 비밀번호 암호화해서 데이터베이스에 저장
// 5. 임시 비밀번호 사용자 이메일 주소로 발송
userRouter.post(
  '/find/password',
  [validatePhoneNumber, validateEmail, validateCallback],
  UserController.findPassword,
);

// 회원가입 시 이메일 인증
userRouter.post('/auth/email', UserController.authEmail);

module.exports = userRouter;
