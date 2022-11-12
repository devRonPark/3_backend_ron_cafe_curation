const logger = require('../config/logger');
const pool = require('../config/mysql');
const { changeOptionToWhereCond, printSqlLog } = require('../lib/util');

class UserModel {
  // option: {id: , name: }
  static findUserByType = async (type, value) => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      const queryString = `select id, name, email, profile_image_path from users where ${type} = ? and deleted_at is null`;
      const queryParams = [value];
      const [resultOfQuery] = await connection.query(queryString, queryParams);
      if (!resultOfQuery[0]) result = 404;
      else result = resultOfQuery[0];
      return result;
    } catch (err) {
      logger.error(err);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };

  static findUserByOptions = async options => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      const queryString = `select id, name, email, profile_image_path from users where ${changeOptionToWhereCond(
        options,
      )} and deleted_at is null`;
      const [resultOfQuery] = await connection.query(queryString);
      if (!resultOfQuery[0]) result = 404;
      else result = resultOfQuery[0];
      return result;
    } catch (err) {
      logger.error(err);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };

  static findPasswordById = async userId => {
    let result, connection;
    logger.info(userId);
    try {
      connection = await pool.getConnection();
      logger.info('connection 생성');
      const queryString =
        'select id, password from users where id = ? and deleted_at is null';
      const queryParams = [userId];
      const [resultOfQuery] = await connection.query(queryString, queryParams);
      logger.info(resultOfQuery);
      if (!resultOfQuery[0]) result = 404;
      else result = resultOfQuery[0];
      logger.info(result);
      return result;
    } catch (err) {
      logger.error(err.stack);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };
}

module.exports = UserModel;
