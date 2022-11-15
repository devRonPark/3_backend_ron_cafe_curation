const express = require('express');
const authRouter = express.Router();
const {
  validateUsername,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateCallback,
} = require('../../common/middlewares/UserValidate');
const {
  passwordEncryption,
} = require('../../common/middlewares/passwordEncryption');
const AuthController = require('./auth.controller');
const { uploadImage } = require('../../common/middlewares/ImageUpload');

// 사용자 로그인 여부 검증
authRouter.get('/session-check', AuthController.checkUserLoggedIn);

// 사용자 회원가입 라우트
// POST /api/auth/local/new-user
authRouter.post(
  '/local/new-user',
  uploadImage, // 이미지 파일 서버 폴더 업로드 및 파일 경로 req 객체에 추가
  [
    validateUsername,
    validateEmail,
    validatePassword('password'),
    validatePasswordConfirmation('password_confirmation'),
    validateCallback,
  ],
  passwordEncryption, // 비밀번호 암호화
  AuthController.createUser,
);

// 회원가입 시 이메일 중복 체크
// POST /api/auth/local/property/email
authRouter.post(
  '/local/property/email',
  [validateEmail, validateCallback],
  AuthController.checkEmailAlreadyInUse,
);

// 회원가입 시 닉네임 중복 체크
// POST /api/auth/local/property/name
authRouter.post(
  '/local/property/name',
  [validateUsername, validateCallback],
  AuthController.checkNameAlreadyInUse,
);

// 사용자 로그인 라우트
// POST /api/auth/local
authRouter.post(
  '/local',
  [validateEmail, validatePassword('password'), validateCallback], // 입력 값 유효성 검사
  AuthController.authenticate,
);

// 사용자 로그아웃 라우트
// DELETE /api/auth/local
authRouter.delete('/local', AuthController.logout);

// 회원가입 시 이메일 인증 라우트
// POST /api/auth/email
authRouter.post(
  '/email',
  [validateEmail, validateCallback], // 입력 값 유효성 검사
  AuthController.authEmail,
);
// 회원가입 시 이메일 인증번호 확인 라우트
// POST /api/auth/email-verify
authRouter.post('/email-verify', AuthController.checkIsVerifyNumberSame);

module.exports = authRouter;
