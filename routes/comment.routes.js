const express = require('express');
const CommentController = require('../controllers/comment.controllers');
const commentRouter = express.Router();
const {
  validateComment,
  isCafeIdExist,
  isUserIdExist,
} = require('../middlewares/middlewares');

// 사용자 한줄평 작성
commentRouter.post(
  '/comments',
  [isUserIdExist, isCafeIdExist, validateComment, validateCallback],
  CommentController.createComment,
);
// 사용자 한줄평 수정
commentRouter.put('/comments/:id', CommentController.editComment);
