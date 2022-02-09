const express = require('express');
const { check } = require('express-validator');

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
const {
  isAuthenticated,
  isNotAuthenticated,
} = require('../middlewares/middlewares');
const res = require('express/lib/response');

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
  [validateEmail, validatePassword, validateCallback], // 입력 값 유효성 검사
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
  isAuthenticated,
  uploadFile,
  [validateUsername, validateCallback], // 입력 값 유효성 검사
  UserController.updateProfileInfo,
);
// 2. 휴대전화 변경
userRouter.put('/edit/phone_number', isAuthenticated, [
  validatePhoneNumber,
  validateCallback,
]);
// 3. 비밀번호 변경

// 클라이언트 로직
// 1. 로그인한 사용자가 마이페이지에서 '회원정보 수정' 버튼을 클릭한다.
// 2. 회원정보 수정 페이지로 넘어가서 바꾸고 싶은 정보를 입력한다.
// 3. '제출하기' 버튼을 누른다.
// 서버 로직
// ✔ 1. 사용자 로그인 여부 먼저 체크 (req.session.userid 존재 여부로 체크)
// ✔ 2. 클라이언트로부터 전달 받은 데이터의 유효성 검사
// 3. 유효성 검사 통과 시 사용자 객체 생성
// 4. 데이터베이스 업데이트
// 5. (비밀번호가 변경된 경우) 데이터베이스 업데이트 후 현재 세션 삭제

// 사용자 비밀번호 변경 (PATCH /user/edit/password)
// 클라이언트 로직
// 1. 비밀번호 찾기를 통해 새로
module.exports = userRouter;
