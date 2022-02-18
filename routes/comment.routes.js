const express = require('express');
const CommentController = require('../controllers/comment.controllers');
const commentRouter = express.Router();
const {
  validateComment,
  validateCallback,
  isCafeIdValidate,
  isUserIdValidate,
  isIdParamValidate,
  isCafeInfoExistById,
  isCommentInfoExistById,
} = require('../middlewares/validate');
// 모든 사용자 한줄평 조회
commentRouter.get('/', CommentController.getAllComments);
// 카페 별 사용자 한줄평 조회
// /comments?cafeId=cafeId
commentRouter.get(
  '/:id',
  isCafeIdValidate,
  isCafeInfoExistById,
  CommentController.getCommentsOfCafe,
);
// 사용자 한줄평 작성
// /comments?cafeId=cafeId
commentRouter.post(
  '/',
  [
    isCafeIdValidate,
    isCafeInfoExistById,
    isUserIdValidate,
    validateComment,
    validateCallback,
  ],
  CommentController.createComment,
);
// 사용자 한줄평 수정
// /comments/3
commentRouter.put(
  '/:id',
  [
    isIdParamValidate,
    isCommentInfoExistById,
    validateComment,
    validateCallback,
  ],
  CommentController.editComment,
);
// 사용자 한줄평 삭제
// /comments/3
commentRouter.delete(
  '/:id',
  [isIdParamValidate, isCommentInfoExistById],
  CommentController.deleteComment,
);
module.exports = commentRouter;
