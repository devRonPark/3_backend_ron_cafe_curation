const { body, check, validationResult } = require('express-validator');
const { errorCode } = require('../statusCode');
const Cafe = require('../models/cafe');
const Comment = require('../models/comment');
const logger = require('../config/logger');

exports.validateUsername = check('name')
  .exists({ checkFalsy: true })
  .withMessage('이름을 반드시 입력해주시기 바랍니다.')
  .isLength({ min: 3, max: 16 })
  .withMessage('이름은 최소 3자 이상 최대 16자 이하로 입력해주세요.');

exports.validateEmail = check('email')
  .exists({ checkFalsy: true })
  .withMessage(
    '이메일은 로그인 시 아이디로 사용되니 반드시 입력해주시기 바랍니다.',
  )
  .isEmail()
  .withMessage('example@example.com 의 이메일 형식으로 입력해주세요.');
exports.validatePassword = fieldName =>
  check(fieldName)
    .exists({ checkFalsy: true })
    .withMessage('비밀번호는 반드시 입력해주시기 바랍니다.')
    .matches(
      /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^*()\-_=+\\\|\[\]{};:\'",.<>\/?])*.{8,16}$/,
    )
    .withMessage(
      '비밀번호는 숫자, 문자, 특수문자를 반드시 포함하여 최소 8자 이상 최대 16자 이하로 입력해주세요.',
    );
exports.validatePasswordConfirmation = body('passwordConfirmation').custom(
  (value, { req }) => {
    if (!value) {
      throw new Error('비밀번호 다시 한 번 반드시 입력해주시기 바랍니다.');
    }
    if (value !== req.body.password) {
      throw new Error(
        '앞서 입력하신 비밀번호와 일치하지 않습니다. 다시 입력해주세요.',
      );
    }
    return true;
  },
);
exports.validatePhoneNumber = check('phone_number')
  .exists({ checkFalsy: true })
  .withMessage('휴대폰 번호를 반드시 입력해주시기 바랍니다.')
  .matches(/^\d{3}[-]{1}\d{4}[-]{1}\d{4}$/)
  .withMessage('휴대폰 번호는 반드시 000-0000-0000 의 형식으로 입력해주세요.');
exports.validateComment = check('content')
  .exists({ checkFalsy: true })
  .withMessage('CONTENT_REQUIRED')
  .isLength({ max: 60 })
  .withMessage('MAXIMUM_LENGTH_EXCEED');
// Req.query 로 전달되는 cafeId 유효성 검증
exports.isCafeIdValidate = async function (req, res, next) {
  try {
    const { cafeId } = req.query;
    // cafeId 입력되었는지 검증
    if (!cafeId)
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'CAFE_ID_REQUIRED' });
    // params로 전달된 id 형식 검증
    if (isNaN(parseInt(cafeId, 10)))
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'NUMBER_TYPE_REQUIRED' });
    const result = await Cafe.isCafeInfoExist({ cafeId });
    // 실제로 존재하는 카페 정보인지 검증
    if (!result)
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'CAFE_NOT_FOUND' });
    next();
  } catch (err) {
    logger.error(err.stack);
    return res.status(errorCode.INTERNALSERVERERROR);
  }
};
// Req.params 로 전달되는 commentId 유효성 검증
exports.isCommentIdValidate = async function (req, res) {
  try {
    const { id } = req.params;
    // commentId 입력되었는지 검증
    if (!id)
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'COMMENT_ID_REQUIRED' });
    // params로 전달된 id 형식 검증
    if (isNaN(parseInt(id, 10)))
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'NUMBER_TYPE_REQUIRED' });
    const result = await Comment.isCommentInfoExist({ id });
    // 실제로 존재하는 댓글 정보인지 검증
    if (!result)
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'COMMENT_NOT_FOUND' });
    next();
  } catch (err) {
    logger.error(err.stack);
    return res.status(errorCode.INTERNALSERVERERROR);
  }
};
// Req.body 로 전달되는 user_id 유효성 검증
exports.isUserIdValidate = function (req, res, next) {
  const { user_id } = req.body;
  // user_id 존재하는지 여부
  if (!user_id)
    return res
      .status(errorCode.BADREQUEST)
      .json({ message: 'USER_ID_REQUIRED' });
  // user_id 형식 검증
  if (isNaN(parseInt(user_id, 10)))
    return res
      .status(errorCode.BADREQUEST)
      .json({ message: 'NUMBER_TYPE_REQUIRED' });
  next();
};
// URL의 ID Parameter 유효성 검증
exports.isIdParamValidate = function (req, res, next) {
  const id = req.params.id;
  // param 존재하는지 여부
  if (!id)
    return res
      .status(errorCode.BADREQUEST)
      .json({ message: 'ID_PARAMETER_REQUIRED' });
  console.log('id type: ', typeof +id);
  // params로 전달된 id 형식 검증
  // id가 NaN이면 true
  if (isNaN(parseInt(id, 10)))
    return res
      .status(errorCode.BADREQUEST)
      .json({ message: 'NUMBER_TYPE_REQUIRED' });
  next();
};
// 유효성 검사 이후 에러 체크
exports.validateCallback = function (req, res, next) {
  // validate the data to be submitted
  const result = validationResult(req);
  const hasErrors = !result.isEmpty();
  console.log(hasErrors);
  if (hasErrors) {
    return res.status(400).json({
      fieldName: result.array()[0].param,
      message: result.array()[0].msg,
    });
  } else {
    next();
  }
};
