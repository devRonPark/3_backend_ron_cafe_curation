const Comment = require('../models/comment');
const { successCode, errorCode } = require('../statusCode');
const logger = require('../config/logger');
const User = require('../models/user');
const { printCurrentTime } = require('../models/util');

// 모든 한줄평 조회 컨트롤러
exports.getAllComments = async function (req, res) {
  try {
    const response = await Comment.getAllComments();
    const comments = response.data;
    // 조회된 한줄평이 없을 경우
    if (!comments.length) return res.sendStatus(errorCode.NOTFOUND);
    return res.status(successCode.OK).json({ data: comments });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 카페 별 한줄평 조회 컨트롤러
exports.getCommentsOfCafe = async function (req, res) {
  try {
    const { id } = req.params;
    const response = await Comment.getCommentsByCafeId({ cafe_id: id });
    const comments = response.data;
    // 조회된 한줄평이 없을 경우
    if (!comments.length) return res.sendStatus(errorCode.NOTFOUND);
    return res.status(successCode.OK).json({ data: comments });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 한줄평 작성 컨트롤러
// 요청으로 전달받은 데이터
// req.query => cafeId
// req.body => {user_id, content }
// 응답으로 전달 시 필요한 데이터
// {user: {name, profile_image}, comment: {user_id, cafe_id, content, created_at}}}
exports.createComment = async function (req, res) {
  try {
    const { cafeId } = req.query;
    const { user_id, content } = req.body;
    // user email로 user 정보 조회
    // => user id, name과 profile_image_path를 가져옴.
    const { name, profile_image_path } = await User.findById({ id: user_id });
    const created_at = printCurrentTime();
    const comment = { user_id, cafe_id: cafeId, content, created_at };
    // 데이터베이스에 한줄평 저장
    const response = await Comment.createComment(comment);

    // DB로 INSERT 쿼리 날렸음에도 등록된 comment_id가 없는 경우
    if (!response.comment_id) throw new Error('REGISTER_COMMENT_FAILURE');

    comment.id = response.comment_id;
    const responseData = {
      user: {
        name,
        profile_image_path,
      },
      comment,
    };
    return res.status(successCode.CREATED).json(responseData);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 댓글 수정 컨트롤러
exports.editComment = async function (req, res) {
  try {
    const comment_id = req.params.id;
    const { content } = req.body;
    const edited_at = printCurrentTime();
    const comment = { comment_id, content, edited_at };
    const response = await Comment.updateComment(comment);
    // DB로 UPDATE 쿼리 날렸음에도 영향을 받은 affectedRows가 하나도 없는 경우
    if (response.affectedRows < 1) throw new Error('COMMENT_UPDATE_FAILURE');
    return res
      .status(successCode.OK)
      .json({ message: 'COMMENT_CONTENT_UPDATED' });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 댓글 삭제 컨트롤러
exports.deleteComment = async function (req, res) {
  try {
    const comment_id = req.params.id;
    const deleted_at = printCurrentTime();
    const comment = { comment_id, deleted_at };
    const response = await Comment.deleteComment(comment);
    // DB로 UPDATE 쿼리 날렸음에도 영향을 받은 affectedRows가 하나도 없는 경우
    if (response.affectedRows < 1) throw new Error('COMMENT_DELETE_FAILURE');
    return res.status(successCode.OK).json({ message: 'COMMENT_DELETED' });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
