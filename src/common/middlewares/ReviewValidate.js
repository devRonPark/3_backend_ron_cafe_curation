const { check, param, query, validationResult } = require('express-validator');
const ValidationError = require('../errors/validation.error');
const NotFoundError = require('../errors/not-found.error');
const AlreadyInUseError = require('../errors/already-in-use.error');
const pool = require('../../config/mysql');
const { printSqlLog } = require('../utils/util');
const logger = require('../../config/logger');

class ReviewValidate {
  static isReviewExistById = async (req, res, next) => {
    const { reviewId } = req.params;

    const connection = await pool.getConnection();
    try {
      // reviewId 에 해당하는 리뷰 정보 존재 여부 검증
      const queryString = 'select count(0) from reviews where id = ?';
      const queryParams = [reviewId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] < 1)
        throw new NotFoundError('Review info does not exist');
      logger.info('Review info exists');
      next();
    } catch (err) {
      throw err;
    } finally {
      connection.release();
    }
  };
}

module.exports = ReviewValidate;
