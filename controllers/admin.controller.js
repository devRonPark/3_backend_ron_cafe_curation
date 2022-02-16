const Cafe = require('../models/cafe');
const { successCode, errorCode } = require('../statusCode');
const logger = require('../config/logger');

// 현재 관리자의 승인 요청 대기 중인 카페 데이터 가져오기
exports.getCafeDataIsWaitingPosted = async function (req, res) {
  try {
    logger.info('현재 승인 요청 대기 중인 카페 데이터 불러오는 중...');
    const response = await Cafe.findCafeDataByStatus({ status: 'N' });
    logger.info('현재 승인 요청 대기 중인 카페 데이터 조회 완료');
    return res.status(successCode.OK).json(response);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
