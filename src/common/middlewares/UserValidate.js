const {
  body,
  query,
  check,
  param,
  validationResult,
} = require('express-validator');
const pool = require('../../config/mysql');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const AlreadyInUseError = require('../errors/already-in-use.error');
const { printSqlLog } = require('../utils/util');
const logger = require('../../config/logger');

class UserInfoValidator {
  static validateUsername = check('name')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - name')
    .isLength({ min: 3, max: 16 })
    .withMessage('Name must be at least 3, less than 16');

  static isUsernameExist = check('name').custom(async nameVal => {
    const connection = await pool.getConnection();

    try {
      // name 에 해당하는 사용자 정보 존재 여부 검증
      const queryString = 'select count(0) from users where name = ?';
      const queryParams = [nameVal];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] > 0)
        return Promise.resolve(new ValidationError('Name is already in use'));
      logger.info('Name is not in use');
      return true;
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  });

  static validateEmail = check('email')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - email')
    .isEmail()
    .withMessage('The type of example@example.com is required');
  static isEmailExist = check('email').custom(async emailVal => {
    const connection = await pool.getConnection();

    try {
      // email 에 해당하는 사용자 정보 존재 여부 검증
      const queryString = 'select count(0) from users where email = ?';
      const queryParams = [emailVal];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] > 0)
        return Promise.resolve(
          new AlreadyInUseError('Email you submitted is already in use'),
        );
      logger.info('Email is not in use');
      return true;
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  });
  static validatePassword = fieldName =>
    check(fieldName)
      .exists({ checkFalsy: true })
      .withMessage('Missing required attribute - password')
      .matches(
        /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^*()\-_=+\\\|\[\]{};:\'",.<>\/?])*.{8,16}$/,
      )
      .withMessage(
        'Password is at least 8 and less than 16. number, letter, special character must be required.',
      );
  static validatePasswordConfirmation = fieldName =>
    body(fieldName).custom((value, { req }) => {
      if (!value)
        throw new ValidationError(
          'Missing required attribute - password_confirmation',
        );

      if (value !== req.body.password)
        throw new ValidationError(
          'passwordConfirmation field must have the same value as the password field',
        );
      return true;
    });
  static validateNewPasswordCheck = fieldName =>
    body(fieldName).custom((value, { req }) => {
      if (!value)
        throw new ValidationError(
          'Missing required attribute - new_password_check',
        );

      if (value !== req.body['new_password'])
        throw new ValidationError(
          'newPasswordCheck field must have the same value as the newPassword field',
        );
      return true;
    });
  static validatePhoneNumber = check('phone_number')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - phone_number')
    .matches(/^01([0|1|6|7|8|9])-([0-9]{3,4})-([0-9]{4})$/)
    .withMessage('The type of 000-0000-0000 is required');
  static validateUserId = check('id')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - id')
    .isInt()
    .withMessage('Number type required');
  static validateUserIdParam = param('userId')
    .exists({ checkFalsy: true })
    .isInt()
    .withMessage('Number type required');
  static validateUserInfo = async (req, res, next) => {
    const { name, phone_number } = req.body;

    if (name && phone_number) {
      await UserInfoValidator.validateUsername.run(req);
      await UserInfoValidator.validatePhoneNumber.run(req);
    } else if (!phone_number) {
      await UserInfoValidator.validateUsername.run(req);
    } else if (!name) {
      await UserInfoValidator.validatePhoneNumber.run(req);
    } else {
      throw new ValidationError('name || phone_number info required');
    }
    next();
  };
  static validateReviewIdParam = param('reviewId')
    .exists({ checkFalsy: true })
    .isInt()
    .withMessage('Number type required');

  static validateComment = check('content')
    .exists({ checkFalsy: true })
    .withMessage('CONTENT_REQUIRED')
    .isLength({ max: 60 })
    .withMessage('MAXIMUM_LENGTH_EXCEED');

  static checkUserInfoExistById = async (req, res, next) => {
    let { userId } = req.params;
    userId = parseInt(userId, 10);

    const connection = await pool.getConnection();
    try {
      // userId 에 해당하는 사용자 정보 존재 여부 검증
      const queryString =
        'select count(0) from users where id = ? and deleted_at is null';
      const queryParams = [userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] < 1)
        throw new NotFoundError('User info does not exist');
      logger.info('User info exists');
      next();
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  };

  // 유효성 검사 이후 에러 체크
  static validateCallback = (req, res, next) => {
    console.log('It is executed!!!');
    // validate the data to be submitted
    const result = validationResult(req);
    const hasErrors = !result.isEmpty();
    const validationErrors = result.errors.map(error => {
      return {
        location: error.location,
        param: error.param,
        message: error.msg,
      };
    });
    if (hasErrors) {
      next(new ValidationError('Validation Error', validationErrors));
    }
    next();
  };
}

module.exports = UserInfoValidator;
