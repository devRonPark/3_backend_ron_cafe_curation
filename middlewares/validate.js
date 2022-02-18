const { body, check, validationResult } = require('express-validator');
const { errorCode } = require('../statusCode');
const Cafe = require('../models/cafe');
const Comment = require('../models/comment');
const logger = require('../config/logger');
const res = require('express/lib/response');

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
exports.validatePassword = check('password')
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
  .matches(/^\d{3}[-]{1}\d{4}[-]{1}\d{4}$/) // TODO 휴대폰 검증 형식 수정 필요
  .withMessage('휴대폰 번호는 반드시 000-0000-0000 의 형식으로 입력해주세요.');
exports.validateComment = check('content')
  .exists({ checkFalsy: true })
  .withMessage('CONTENT_REQUIRED')
  .isLength({ max: 60 })
  .withMessage('MAXIMUM_LENGTH_EXCEED');
// Req.query 로 전달되는 cafeId 유효성 검증
exports.isCafeIdByQueryValidate = async function (req, res, next) {
  try {
    // const cafeId = req.query.cafeId || req.params.id;
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
// Req.query 로 전달되는 id 유효성 검증
exports.isIdInQueryValidate = function (req, res, next) {
  try {
    const { id } = req.query;
    // id 입력되었는지 검증
    if (!id)
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'ID_IN_QUERY_REQUIRED' });
    // query로 전달된 id 형식 검증
    if (isNaN(parseInt(id, 10)))
      return res
        .status(errorCode.BADREQUEST)
        .json({ message: 'ID_IN_QUERY_NUMBER_TYPE_REQUIRED' });
    next();
  } catch (err) {
    logger.error(err.stack);
    return res.status(errorCode.INTERNALSERVERERROR);
  }
};
// 실제로 존재하는 카페 정보인지 검증
exports.isCafeInfoExistById = async function (req, res, next) {
  try {
    const cafeId = req.params.id;
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
// 실제로 존재하는 댓글 정보인지 검증
exports.isCommentInfoExistById = async function (req, res, next) {
  try {
    const id = req.params.id;
    const result = await Comment.isCommentInfoExist({ id });
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
// 평점 데이터 유효성 검증
exports.isStarsDataValidate = function (req, res, next) {
  const {
    stars_about_talk,
    stars_about_book,
    stars_about_work,
    stars_about_coffee,
  } = req.body;
  console.log(
    stars_about_talk,
    stars_about_book,
    stars_about_work,
    stars_about_coffee,
  );
  // 총 4개의 평점 데이터가 존재하는지 검증
  if (
    !(
      stars_about_talk &&
      stars_about_book &&
      stars_about_work &&
      stars_about_coffee
    )
  )
    return res
      .status(errorCode.BADREQUEST)
      .json({ message: 'STARS_OF_4_REQUIRED' });
  // 평점 데이터 타입이 숫자인지 검증
  if (
    isNaN(parseInt(stars_about_talk, 10)) ||
    isNaN(parseInt(stars_about_book, 10)) ||
    isNaN(parseInt(stars_about_work, 10)) ||
    isNaN(parseInt(stars_about_coffee, 10))
  )
    return res
      .status(errorCode.BADREQUEST)
      .json({ message: 'NUMBER_TYPE_REQUIRED' });
  next();
};
exports.isEmail = function (emailVal) {
  const emailRegex =
    /^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i;
  return emailRegex.test(emailVal);
};
