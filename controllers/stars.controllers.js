const { successCode, errorCode } = require('../statusCode');
const logger = require('../config/logger');
const Stars = require('../models/stars');
const { printCurrentTime } = require('../models/util');

// 평점 등록 컨트롤러
exports.registerStars = async function (req, res) {
  try {
    const data = req.body;
    // 등록 성공 시 클라이언트에 전달할 평점 데이터
    const starsData = { ...data };
    starsData['cafe_id'] = req.params.id;
    const created_at = printCurrentTime();
    starsData['created_at'] = created_at;
    const response = await Stars.registerStars(starsData);
    // DB에 INSERT 쿼리를 날렸는데도 실패하는 경우
    if (response.affectedRows < 1) throw new Error('STARS_REGISTER_FAILURE');
    return res.status(successCode.CREATED).json({ data: starsData });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
