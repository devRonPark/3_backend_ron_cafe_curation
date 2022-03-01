const express = require('express');

const userRouter = express.Router();
const UserController = require('../controllers/user.controller');
const { isLoggedIn, isLoginUserInfo } = require('../lib/util');
const {
  validateUserInfo,
  validatePhoneNumber,
  validateEmail,
  validatePassword,
  validatePhoneNumberInQuery,
  validateUserIdParam,
  validateCallback,
} = require('../lib/middlewares/UserValidate');
const { uploadImage } = require('../lib/middlewares/ImageUpload');

// 사용자 아이디 찾기
// GET /api/users/email?phone-number=${phone-number}
userRouter.get(
  '/email',
  [validatePhoneNumberInQuery, validateCallback],
  UserController.findEmail,
);

// 사용자 비밀번호 찾기(임시 비밀번호 생성)
// POST /api/users/password
userRouter.post(
  '/password',
  [validatePhoneNumber, validateEmail, validateCallback],
  UserController.findPassword,
);

// 현재 로그인되어 있는 사용자 조회
// api/users/:userId
userRouter.get(
  '/:userId',
  isLoggedIn, // 사용자 로그인 여부 검증
  [validateUserIdParam, validateCallback], // userId 형식 검증
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.getUserData,
);

// User 회원정보 변경
// 1. 프로필 이미지 변경
// PATCH /api/users/:userId/profile
userRouter.patch(
  '/:userId/profile',
  isLoggedIn, // 사용자 로그인 여부 검증
  [validateUserIdParam, validateCallback], // userId 형식 검증
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  uploadImage,
  UserController.updateProfileImage,
);
// 2. 회원 정보 변경(닉네임, 휴대폰 번호)
// PATCH /api/users/:userId
userRouter.patch(
  '/:userId',
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  [validateUserIdParam, validateUserInfo, validateCallback],
  UserController.updateNameAndPhoneNumber,
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
  '/:userId/password/new',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.sendPasswordInitMail,
);
// -> 현재 비밀번호, 새로 변경할 비밀번호 입력 후 업데이트 요청
userRouter.patch(
  '/:userId/password/reset/:token',
  [
    validatePassword('currentPassword'),
    validatePassword('password'),
    validateCallback,
  ], // 유효성 검증
  UserController.updateNewPassword,
);
// 회원 탈퇴
//   - req.session.userid 가 존재하는 경우에만 동작함.
// 탈퇴 요청 들어올 시 회원 상태를 비활성화로 변경시켜준다.
userRouter.delete(
  '/:userId',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.deleteUser,
);

// 현재 로그인한 사용자가 작성한 모든 댓글 목록 조회
// GET /api/users/:id/comments
userRouter.get(
  '/:userId/comments',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.getReviewsByUserId,
);

// 현재 로그인한 사용자가 좋아요 버튼을 누른 카페 목록 조회
// GET /api/users/:id/likes
userRouter.get(
  '/:userId/likes',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.getUserLikeCafesByUserId,
);

module.exports = userRouter;
