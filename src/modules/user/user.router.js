const express = require('express');

const userRouter = express.Router();
const UserController = require('./user.controller');
const { isLoggedIn, isLoginUserInfo } = require('../../common/utils/util');
const {
  validateUserInfo,
  validateUserId,
  validateEmail,
  validatePassword,
  validateNewPasswordCheck,
  validateUserIdParam,
  validateCallback,
  validateUsername,
} = require('../../common/middlewares/UserValidate');
const { uploadImage } = require('../../common/middlewares/ImageUpload');

userRouter.get(
  '/logged-in/name',
  isLoggedIn,
  UserController.getLoggedInUsername,
);

// userId로 현재 로그인한 사용자 정보 응답으로 전달
// GET /api/users/:userId
// req.params {userId}
// res.body {id, name, email, phone_number, profile_image_path}
userRouter.get(
  '/:userId',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 사용자 로그인 여부 검증
  isLoginUserInfo, // 조회하려는 사용자 id와 현재 로그인한 사용자 id 일치 여부 검증
  UserController.getUserInfoById,
);

// GET /api/users/:userId/email
// req.params {userId}
// select email from users where id = ? and deleted_at is null
// res.body : {email}
userRouter.get(
  '/:userId/email',
  [validateUserIdParam, validateCallback],
  UserController.getEmailByUserId,
);

// 회원 정보 수정 페이지
// userId와 입력받은 비밀번호를 통해 현재 로그인한 사용자 검증
// POST /api/users/:userId
// req.params {userId}, req.body {password}
// select id, password from users where id = ? and deleted_at is null
// res.body {userId}
userRouter.post(
  '/:userId',
  [validateUserIdParam, validatePassword('password'), validateCallback], // 데이터 유효성 검증
  isLoggedIn, // 사용자 로그인 여부 검증
  isLoginUserInfo, // 조회하려는 사용자 id와 현재 로그인한 사용자 id 일치 여부 검증
  UserController.validateUserWithPasswordCheck, // 비밀번호 일치 여부 확인
);

// POST /api/users/:userId/password
// req.params {userId}
// req.body {password}
// select password from users where id = ? and deleted_at is null
// res.body : {isPwdSame: boolean}
userRouter.post(
  '/:userId/password',
  [validateUserIdParam, validateCallback],
  UserController.checkIsPasswordSame,
);

// 사용자 아이디 찾기
// POST /api/users/find-email
// req.body {name}
// select email from users where name = ? and deleted_at is null
// res.body : {email}
userRouter.post(
  '/find-email',
  [validateUsername, validateCallback],
  UserController.getEmailByName,
);

// 사용자 비밀번호 찾기
// 사용자 존재 여부 확인 후 사용자 조회 결과 페이지 렌더링
// POST /api/users/find-user
// req.body : {name, email}
// select id, name, email where name = ? and email = ? and phone_number = ? and deleted_at is null
// res.body : { user: {id, name, email} }
userRouter.post(
  '/find-user',
  [validateUsername, validateEmail, validateCallback],
  UserController.getUserInfo,
);

// 이메일 발송 클릭 -> 아이디 풀 정보 발송
// POST /api/users/forget-email/send
// req.body : { email }
// res : 200 OK
userRouter.post(
  '/forget-email/send',
  [validateEmail, validateCallback],
  UserController.sendEmailWithAccountInfo,
);
// 이메일 발송 클릭 -> 임시 비밀번호 생성 후 이메일 발송
// POST /api/users/forget-password/send
// req.body : {id, email}
// res : 200 OK
userRouter.post(
  '/forget-password/send',
  [validateUserId, validateEmail, validateCallback],
  UserController.sendEmailWithNewPassword,
);

// User 회원정보 변경
// 1. 프로필 이미지 변경
// PATCH /api/users/:userId/profile
// req.params {userId}, req.body {image: File}
// update users set profile_image_path = ?, updated_at = ? where id = ?
// res 200 OK
userRouter.patch(
  '/:userId/profile',
  [validateUserIdParam, validateCallback], // userId 형식 검증
  isLoggedIn, // 사용자 로그인 여부 검증
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  uploadImage,
  UserController.updateProfileImage,
);
// 2. 회원 정보 변경(닉네임, 휴대폰 번호)
// PATCH /api/users/:userId
// req.params {userId}, req.body {phone_number}
// res 200 OK
userRouter.patch(
  '/:userId',
  [validateUserIdParam, validateUserInfo, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.updateNickname,
);

// 3. 비밀번호 변경
// 비밀번호 초기화 메일 발송
// req.params {userId} req.body {email}
// POST /api/users/reset-password/send
// res 200 OK
userRouter.post(
  '/:userId/reset-password/send',
  [validateUserIdParam, validateEmail, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.sendPasswordInitMail,
);
// 비밀번호 변경
//-> 현재 비밀번호, 새로 변경할 비밀번호 입력 후 업데이트 요청
// req.params: {userId, token} req.body: {current_password, new_password, new_password_again}
// PATCH /api/users/:userId/reset-password/:token
// res 200 OK
userRouter.patch(
  '/:userId/password/:token',
  [
    validatePassword('current_password'),
    validatePassword('new_password'),
    validateNewPasswordCheck('new_password_check'),
    validateCallback,
  ], // 유효성 검증
  UserController.updateNewPassword,
);
// 회원 탈퇴
// DELETE /api/users/:userId
// req.params {userId}
// update users set deleted_at = ? where id = ? and deleted_at is null
// res 200 OK
// 탈퇴 요청 들어올 시 회원 상태를 비활성화로 변경시켜준다.
userRouter.delete(
  '/:userId',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.deleteUser,
);

// 현재 로그인한 사용자가 작성한 모든 댓글 목록 조회
// GET /api/users/:userId/reviews
// req.params {userId}
// res.body {reviews: [{}, ...]}
userRouter.get(
  '/:userId/reviews',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.getReviewsByUserId,
);

// 현재 로그인한 사용자가 좋아요 버튼을 누른 카페 목록 조회
// GET /api/users/:userId/likes
// req.params {userId}
// res.body {likes: [{cafe_id: }, ...], cafes: [{cafe_id, name, jibun_address, image_path}, ...]}
userRouter.get(
  '/:userId/likes',
  [validateUserIdParam, validateCallback],
  isLoggedIn, // 로그인 여부 파악
  isLoginUserInfo, // req.session.userid와 req.params.userId 일치 여부 검증
  UserController.getUserLikeCafesByUserId,
);

module.exports = userRouter;
