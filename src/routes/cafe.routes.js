const express = require('express');
const CafeController = require('../controllers/cafe.controllers');

const {
  isCafeInfoExistById,
  isCafeLikeActivated,
  validateCafeIdParam,
  validateCallback,
  validateQueryForSearch,
  validatePageQuery,
} = require('../lib/middlewares/CafeValidate');
const { isReviewExistById } = require('../lib/middlewares/ReviewValidate');
const cafeRouter = express.Router();

// 카페 데이터 조회(1페이지당 10개의 카페 정보)
// http://localhost:3000/api/cafes?page=${page}
cafeRouter.get(
  '/',
  [validatePageQuery, validateCallback], // page query 검증
  CafeController.getCafeDataByPage,
);

// 공공 API에 요청을 보내 서울시 내 카페 데이터 받아오기
// GET /api/cafes
// cafeRouter.get('/', CafeController.getDataFromPublicAPI);
// id 값에 해당하는 카페 정보 불러오기
// 공공 API로부터 받아온 데이터 가공하여 DB에 저장
// cafeRouter.post(
//   '/data-from-api',
//   CafeController.parseCafeDataRun,
//   CafeController.saveDataToDb,
// );
// 카페 상세 페이지
// GET /api/cafes/:cafeId
cafeRouter.get(
  '/:cafeId',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  CafeController.getCafeInfoById,
);

// 카페 검색(검색 기준: 이름 혹은 지번 주소)
// GET /api/cafes/search?name=${name}
// GET /api/cafes/search?city=${city}&gu=${gu}&dong=${dong}
cafeRouter.get(
  '/search',
  [validateQueryForSearch, validateCallback],
  CafeController.getCafeDataBySearch,
);

// * reviews 에 대한 Route 구성
// 그 카페에 대한 모든 사람들의 리뷰 조회
// GET /api/cafes/:cafeId/reviews
cafeRouter.get(
  '/:cafeId/reviews',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  CafeController.getCafeReviewsByCafeId,
);

// 그 카페에 대한 리뷰 등록
// POST /api/cafes/:cafeId/reviews
// TODO Review 데이터 검증 필요(mood, light, price, taste, comment)
// comment 는 글자 수 제한
// mood,light, price, taste 는 1자리 수 실수인지 검사
cafeRouter.post(
  '/:cafeId/reviews',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  CafeController.registerReview,
);
// 그 카페에 대한 리뷰 수정하기
// PUT /api/cafes/:cafeId/reviews/:reviewId
cafeRouter.put(
  '/:cafeId/reviews/:reviewId',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  isReviewExistById,
  CafeController.updateReview,
);
// 그 카페에 대한 리뷰 삭제하기
// DELETE /api/cafes/:cafeId/reviews/:reviewId
cafeRouter.delete(
  '/:cafeId/reviews/:reviewId',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  isReviewExistById,
  CafeController.deleteReview,
);

// likes
// 한 카페에 대한 좋아요 수 조회
// GET /api/cafes/:cafeId/likes
cafeRouter.get(
  '/:cafeId/likes',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  CafeController.getCafeLikeCount,
);

// 현재 로그인한 사용자가 카페 좋아요 승인 요청
// POST /api/cafes/:cafeId/likes
cafeRouter.post(
  '/:cafeId/likes',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  isCafeLikeActivated,
  CafeController.likeCafe,
);

// 현재 로그인한 사용자가 카페 좋아요 해제 요청
// DELETE /api/cafes/:cafeId/likes/:userId
cafeRouter.delete(
  '/:cafeId/likes/:userId',
  [validateCafeIdParam, validateCallback],
  isCafeInfoExistById,
  CafeController.disableCafeLike,
);

module.exports = cafeRouter;
