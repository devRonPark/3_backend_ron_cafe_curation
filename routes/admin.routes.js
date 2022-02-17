const express = require('express');

const adminRouter = express.Router();
const AdminController = require('../controllers/admin.controllers');
const {
  isLoggedIn,
  hasNoPermission,
  isWhichTblData,
} = require('../middlewares/middlewares');
// 관리자 승인 완료된 카페 데이터 조회
adminRouter.get(
  '/cafes',
  isLoggedIn,
  hasNoPermission,
  AdminController.getCafeDataIsAlreadyApproved,
);
// 등록 및 수정 요청 대기 중인 카페 데이터 조회
adminRouter.get(
  '/cafes/wait/register',
  isLoggedIn,
  hasNoPermission,
  AdminController.getCafeDataIsWaitingPosted,
);
// 삭제 요청 대기 중인 카페 데이터 조회
adminRouter.get(
  '/cafes/wait/delete',
  isLoggedIn,
  hasNoPermission,
  AdminController.getCafeDataIsWaitingDeleted,
);
// 사용자가 등록 및 수정 요청한 카페 정보(전화번호, 배경 이미지) 승인 여부 결정
adminRouter.post(
  '/cafes/:id/register/cafeInfo',
  isWhichTblData,
  AdminController.isRegisteredOrNot,
);
// 사용자가 등록 및 수정 요청한 메뉴 정보 승인 여부 결정
cafeRouter.post(
  '/cafes/:id/register/menus',
  isWhichTblData,
  AdminController.isRegisteredOrNot,
);
// 사용자가 등록 및 수정 요청한 운영시간 정보 승인 여부 결정
cafeRouter.post(
  '/cafes/:id/register/operating-hours',
  isWhichTblData,
  AdminController.isRegisteredOrNot,
);
// cafeRouter.delete('/cafes/:id/delete', AdminController.deleteCafeInfo);
module.exports = adminRouter;
