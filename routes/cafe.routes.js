const express = require('express');
const CafeController = require('../controllers/cafe.controllers');
const cafeRouter = express.Router();
cafeRouter.get('/', CafeController.getDataFromPublicAPI);
// 공공 API로부터 받아온 데이터 가공하여 DB에 저장
cafeRouter.post(
  '/data-from-api',
  CafeController.parseCafeDataRun,
  CafeController.saveDataToDb,
);
cafeRouter.get('/search', (req, res) => {
  if (req.query.name) {
    return CafeController.getCafeDataByName(req, res);
  }
  if (req.query.city && req.query.gu && req.query.dong) {
    return CafeController.getCafeDataByJibunAddr(req, res);
  }
});
module.exports = cafeRouter;
