const Comment = require('../models/comment');
const { successCode, errorCode } = require('../statusCode');
const logger = require('../config/logger');
const Cafe = require('../models/cafe');

// 한줄평 작성 컨트롤러
exports.createComment = async function (req, res) {
  try {
    const { user_id, cafe_id, content } = req.body.data;
    const data = { user_id, cafe_id, content };
    // 데이터베이스에 한줄평 저장
    const response = await Comment.createComment(data);
    return res.sendStatus(successCode.CREATED);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
exports.editComment = async function (req, res) {
  try {
    const comment_id = req.params.id;
    // params로 전달된 comment_id 유효성 검증
    if (typeof +comment_id !== 'number' || !comment_id)
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'NUMBER_TYPE_REQUIRED' });
    const { content } = req.body.data;
    const data = { comment_id, content };
    const response = await Cafe.updateComment(data);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
