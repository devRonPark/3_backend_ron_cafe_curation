const express = require('express');
const CafeController = require('../controllers/cafe.controllers');
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
cafeRouter.patch('/', CafeController.updateCafeData);

module.exports = cafeRouter;
