const { check, param, query, validationResult } = require('express-validator');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const AlreadyInUseError = require('../errors/already-in-use.error');
const pool = require('../../config/mysql');
const { guListInSeoul } = require('../constants');
const { printSqlLog } = require('../utils/util');
const logger = require('../../config/logger');
const InternalServerError = require('../errors/internal-sever.error');

class CafeInfoValidator {
  static validateCafeName = check('name')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - name');
  static isCafeInfoExistByName = async (req, res, next) => {
    const { name } = req.body;

    try {
      // name 에 해당하는 카페 정보 존재 여부 검증
      const queryString = 'select count(0) from cafes where name = ?';
      const queryParams = [name];
      const connection = await pool.getConnection();
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] > 0)
        next(new AlreadyInUseError('Name is already in use'));
      logger.info('Name is not in use');
      next();
    } catch (err) {
      throw new InternalServerError(err.message);
    } finally {
      connection.release();
    }
  };
  static validateJibunAddr = check('jibun_address')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - jibun_address');
  static validateRoadAddr = check('road_address')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - road_address');
  static validateCafeIdParam = param('cafeId')
    .exists({ checkFalsy: true })
    .withMessage('Missing required parameter - cafeId')
    .toInt()
    .isInt()
    .withMessage('Number type required');
  static isCafeInfoExistById = async (req, res, next) => {
    const { cafeId } = req.params;

    const connection = await pool.getConnection();
    try {
      // cafeId 에 해당하는 카페 정보 존재 여부 검증
      const queryString = 'select count(0) from cafes where id = ?';
      const queryParams = [cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] < 1)
        next(new NotFoundError('Cafe info does not exist'));
      logger.info('Cafe info exists');
      connection.release();
      next();
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
  // 사용자가 이미 좋아요를 눌렀는지 체크
  static isCafeLikeActivated = async (req, res, next) => {
    const { cafeId } = req.params;
    const { userId } = req.body;

    const connection = await pool.getConnection();
    try {
      // cafeId 에 해당하는 카페 정보 존재 여부 검증
      const queryString =
        'select count(0) from likes where cafe_id = ? and user_id = ? and deleted_at is null';
      const queryParams = [cafeId, userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] > 0)
        throw new AlreadyInUseError('You already liked this cafe');
      logger.info('User like is not activated about this cafe');
      connection.release();
      next();
    } catch (err) {
      throw err;
    } finally {
    }
  };
  // 사용자가 좋아요 해제했는지 체크
  static isCafeLikeDisabled = async (req, res, next) => {
    const { cafeId, userId } = req.params;

    const connection = await pool.getConnection();
    try {
      // cafeId 에 해당하는 카페 정보 존재 여부 검증
      const queryString =
        'select count(0) from likes where cafe_id = ? and user_id = ? and deleted_at is not null';
      const queryParams = [cafeId, userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] > 0)
        throw new AlreadyInUseError('You already disabled');
      logger.info('User like is activated about this cafe now');
      connection.release();
      next();
    } catch (err) {
      throw err;
    } finally {
    }
  };
  static validateTel = check('tel')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - tel')
    .matches(/^\d{2,3}-\d{3,4}-\d{4}$/)
    .withMessage('Tel you submitted is not valid');
  // TODO 위도, 경도 한꺼번에 검증할 지 고민
  static validateLat = check('latitude')
    .exists({ checkFalsy: true })
    .custom(value => {
      const regExp = new RegExp('^-?([1-8]?[1-9]|[1-9]0)\\.{1}\\d{1,6}');
      if (!regExp.test(value))
        return Promise.reject(
          new ValidationError('Latitude you submitted is not valid'),
        );
      return true;
    });
  static validateLong = check('longitude')
    .exists({ checkFalsy: true })
    .custom(value => {
      const regExp = new RegExp('^-?([1-8]?[1-9]|[1-9]0)\\.{1}\\d{1,6}');
      if (!regExp.test(value))
        return Promise.reject(
          new ValidationError('Longitude you submitted is not valid'),
        );
      return true;
    });
  // 메뉴 정보 유효성 검사
  static validateMenus = async (req, res, next) => {
    // 메뉴 배열 유효성 검사
    await check('menus')
      .exists({ checkFalsy: true })
      .withMessage('Missing required attribute - menus')
      .isArray({ min: 1 })
      .withMessage('At least 1 menu data is required')
      .run(req);
    // 메뉴 요소 name 프로퍼티 유효성 검사
    await check('menus.*.name')
      .exists({ checkFalsy: true })
      .withMessage('Missing required attribute - name of menu element')
      .run(req);
    // 메뉴 요소 price 프로퍼티 유효성 검사
    await check('menus.*.price')
      .exists({ checkFalsy: true })
      .withMessage('Missing required attribute - name of menu element')
      .isInt({ min: 1000, max: 100000 })
      .withMessage('Integer type is required')
      .run(req);
    next();
  };
  // 영업 시간 정보 유효성 검사
  static validateOperatingHours = async (req, res, next) => {
    //  영업시간 배열 유효성 검사
    await check('operating_hours')
      .exists({ checkFalsy: true })
      .withMessage('Missing required attribute - operating_hours')
      .isArray({ min: 1, max: 7 })
      .withMessage('At least 1, less then 6 operating_hours data is required')
      .run(req);
    // 영업시간 요소 day 프로퍼티 유효성 검사
    // 월, 화, 수, 목, 금, 토, 일 중 하나
    await check('operating_hours.*.day')
      .exists({ checkFalsy: true })
      .withMessage(
        'Missing required attribute - day of operating_hours element',
      )
      .isIn(['월', '화', '수', '목', '금', '토', '일'])
      .withMessage('Day value is not valid value')
      .run(req);
    // 영업시간 요소 start_time 프로퍼티 유효성 검사
    // 앞에 2자리 00 => 최대 24까지, 뒤에 2자리 00 => 최대 60까지
    await check('operating_hours.*.start_time')
      .exists({ checkFalsy: true })
      .withMessage(
        'Missing required attribute - start_time of operating_hours element',
      )
      .isLength({ min: 4, max: 4 })
      .withMessage('The length of start_time must be 4')
      .run(req);
    // 영업시간 요소 end_time 프로퍼티 유효성 검사
    // 앞에 2자리 00 => 최대 24까지, 뒤에 2자리 00 => 최대 60까지
    await check('operating_hours.*.end_time')
      .exists({ checkFalsy: true })
      .withMessage(
        'Missing required attribute - end_time of operating_hours element',
      )
      .isLength({ min: 4, max: 4 })
      .withMessage('The length of start_time must be 4')
      .run(req);

    next();
  };
  // 쿼리에서 페이지 유효성 검증
  static validatePageQuery = query('page')
    .exists({ checkFalsy: true })
    .withMessage('Missing required attribute - query variable page ')
    .isInt()
    .withMessage('Number Type Required');
  static validateQueryForSearch = async (req, res, next) => {
    const { name, city, gu, dong } = req.query;
    // req.query에 name, city, gu, dong 값이 다 존재하지 않을 경우
    if (!name && !(city && gu && dong))
      throw new ValidationError(
        'Query variable for search is required(name || city, gu, dong)',
      );

    if (name) {
      await query('name')
        .trim()
        .matches(/^[가-힣]+$/)
        .withMessage('Only hangeul is allowed')
        .run(req);
    }

    if (city && gu && dong) {
      await query('city')
        .trim()
        .matches(/^[가-힣]+$/)
        .withMessage('Only hangeul is allowed')
        .isIn(['서울'])
        .run(req);

      await query('gu')
        .trim()
        .matches(/^[가-힣]+$/)
        .withMessage('Only hangeul is allowed')
        .isIn(guListInSeoul)
        .run(req);
      // TODO 동 리스트 가공해서 배열로 만들어 유효성 검증 시 사용
      await query('dong')
        .trim()
        .matches(/^[가-힣]+$/)
        .withMessage('Only hangeul is allowed')
        .run(req);
    }

    next();
  };
  // 유효성 검사 이후 에러 체크
  static validateCallback = (req, res, next) => {
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
    if (hasErrors)
      next(new ValidationError('Validation Error', validationErrors));
    next();
  };
}

module.exports = CafeInfoValidator;
