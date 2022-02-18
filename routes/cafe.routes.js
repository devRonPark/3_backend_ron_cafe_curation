const express = require('express');
const CafeController = require('../controllers/cafe.controllers');
const {
  isCafeIdValidate,
  isCafeInfoExistById,
  isStarsDataValidate,
  isIdParamValidate,
  isUserIdValidate,
} = require('../middlewares/validate');
const StarsController = require('../controllers/stars.controllers');
const cafeRouter = express.Router();
// 공공 API에 요청을 보내 서울시 내 카페 데이터 받아오기
// cafeRouter.get('/', CafeController.getDataFromPublicAPI);
// id 값에 해당하는 카페 정보 불러오기
cafeRouter.get('/:id', CafeController.getCafeInfoById);
// 공공 API로부터 받아온 데이터 가공하여 DB에 저장
cafeRouter.post(
  '/data-from-api',
  CafeController.parseCafeDataRun,
  CafeController.saveDataToDb,
);
// 카페 검색(검색 기준: 이름 혹은 지번 주소)
cafeRouter.get('/search', (req, res) => {
  if (req.query.name) {
    return CafeController.getCafeDataByName(req, res);
  }
  if (req.query.city && req.query.gu && req.query.dong) {
    return CafeController.getCafeDataByJibunAddr(req, res);
  }
});
// 이미 클라이언트에서 이름 혹은 지번 주소로 GET 요청(검색)을 통해 응답받은 데이터를 전달해준다.
// 카페 정보 등록 요청 API
cafeRouter.patch('/', CafeController.registerCafeInfo);
// 카페 정보(휴대폰 번호, 이미지) 수정 요청 API
cafeRouter.patch(
  '/:id/edit/cafeInfo',
  [isCafeIdValidate, isCafeInfoExistById],
  CafeController.updateCafeInfo,
);
// 메뉴 정보 수정 요청 API
cafeRouter.patch(
  '/:id/edit/menus',
  [isCafeIdValidate, isCafeInfoExistById],
  CafeController.updateCafeMenus,
);
// 운영시간 정보 수정 요청 API
cafeRouter.patch(
  '/:id/edit/operating-hours',
  CafeController.updateCafeOperHours,
);
cafeRouter.delete(
  '/:id/delete',
  [isCafeIdValidate, isCafeInfoExistById],
  CafeController.deleteCafeInfo,
);

// * stars 에 대한 Route 구성
// 그 카페에 대한 모든 사람들의 평점 조회
// GET /cafes/:id/stars
// 그 카페에 대해 내가 매긴 평점 조회
// GET /cafes/:id/stars?userId=userId
cafeRouter.get('/:id/stars', [isCafeIdValidate, isCafeInfoExistById]);

// 그 카페에 대한 평점 매기기
// POST /cafes/:id/stars
// req.body 데이터
// { "user_id": 24,star_about_talk": 3, "star_about_book": 5, "star_about_work": 4, "star_about_coffee": 4 }
// ✔ 1. req.params.id 유효성 검증(id 값 존재 여부, 숫자 형식 여부, id 에 해당하는 카페 정보 존재 여부)
// ✔ 2. req.body 데이터 유효성 검증(4개의 값 존재 여부, 숫자 형식 여부)
// ✔ 3. DB에 차례로 값 등록(INSERT 쿼리)
cafeRouter.post(
  '/:id/stars',
  [
    isIdParamValidate,
    isCafeInfoExistById,
    isUserIdValidate,
    isStarsDataValidate,
  ],
  StarsController.registerStars,
);
// 그 카페에 대한 평점 수정하기
// PUT /cafes/:id/stars?userId=userId
// req.body 데이터
// { "user_id": 24,star_about_talk": 3, "star_about_book": 5, "star_about_work": 4, "star_about_coffee": 4 }
// ✔ 1. req.params.id 유효성 검증(id 값 존재 여부, 숫자 형식 여부, id 에 해당하는 카페 정보 존재 여부)
// ✔ 2. req.body 데이터 유효성 검증(4개의 값 존재 여부, 숫자 형식 여부)
// 3. DB에 차례로 값 등록(UPDATE 쿼리)
cafeRouter.put(
  '/:id/stars',
  [isIdParamValidate, isCafeInfoExistById, isStarsDataValidate],
  StarsController.editStars,
);
// 그 카페에 대한 평점 삭제하기
// DELETE /cafes/:id/stars?userId=userId
cafeRouter.delete('/:id/stars', [isIdParamValidate, isCafeInfoExistById]);

module.exports = cafeRouter;
