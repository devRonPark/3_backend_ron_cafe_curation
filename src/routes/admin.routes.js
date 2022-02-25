const express = require('express');
const adminRouter = express.Router();
const AdminController = require('../controllers/admin.controllers');
const {
  validateCafeName,
  validateJibunAddr,
  validateRoadAddr,
  validateCafeIdParam,
  validateLat,
  validateLong,
  validateMenus,
  validateOperatingHours,
  validateTel,
  validatePageQuery,
  validateCallback,
  isCafeInfoExistById,
} = require('../lib/middlewares/CafeValidate');
const { uploadImage } = require('../lib/middlewares/ImageUpload');

// 관리자 카페 데이터 조회(1페이지당 10개의 카페 정보)
// http://localhost:3000/api/admin/cafes?page=${page}
adminRouter.get(
  '/cafes',
  [validatePageQuery, validateCallback], // page query 검증
  AdminController.getCafeDataByPage,
);

// 카페 정보 등록 API
// POST /api/admin/cafes
adminRouter.post(
  '/cafes',
  [
    validateCafeName,
    validateTel,
    validateJibunAddr,
    validateRoadAddr,
    validateLat,
    validateLong,
    validateMenus,
    validateOperatingHours,
    validateCallback,
    uploadImage,
  ],
  AdminController.registerCafeInfo,
);

// 카페 정보(카페 이름, 전화번호, 지번 주소, 도로명 주소, 위도, 경도) 수정 API
// PATCH /api/admin/cafes/:cafeId
// TODO 이미지 파일 서버에 업로드 및 유효성 검증 로직 추가 필요
// TODO cafeName 검증할 때 DB에서 먼저 조회 후 Already In Use Validation Error 발생 없애기
adminRouter.patch(
  '/cafes/:cafeId',
  isCafeInfoExistById,
  [
    validateCafeIdParam,
    validateCafeName,
    validateTel,
    validateJibunAddr,
    validateRoadAddr,
    validateLat,
    validateLong,
    validateCallback,
  ],
  AdminController.updateCafeInfo,
);
// 카페 대표 이미지 수정 API
// PATCH /api/admin/cafes/:cafeId/image
adminRouter.patch(
  '/cafes/:cafeId/image',
  isCafeInfoExistById,
  [validateCafeIdParam, validateCallback, uploadImage],
  AdminController.updateCafeImage,
);

// 메뉴 정보 수정 API
// PATCH /api/admin/cafes/:cafeId/menus
adminRouter.patch(
  '/cafes/:cafeId/menus',
  isCafeInfoExistById,
  [validateCafeIdParam, validateMenus, validateCallback],
  AdminController.updateMenus,
);
// 운영시간 정보 수정 API
// PATCH /api/admin/cafes/:cafeId/operating-hours
adminRouter.patch(
  '/cafes/:cafeId/operating-hours',
  isCafeInfoExistById,
  [validateCafeIdParam, validateOperatingHours, validateCallback],
  AdminController.updateCafeOperHours,
);

// 카페 정보 삭제 API
// DELETE /api/cafes/:cafeId
// TODO cafeId param 유효성 검증 및 카페 정보 존재 여부 조회
adminRouter.delete(
  '/cafes/:cafeId',
  isCafeInfoExistById,
  [validateCafeIdParam, validateCallback],
  AdminController.deleteCafeInfo,
);

module.exports = adminRouter;
