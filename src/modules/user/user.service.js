const logger = require('../../config/logger');
const pool = require('../../config/mysql');
const {
  changeOptionToWhereCond,
  printSqlLog,
  printCurrentTime,
} = require('../../common/util');

class UserService {
  // option: {id: , name: }
  static findUserByType = async (type, value) => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      const queryString = `select id, name, email, profile_image_path from users where ${type} = ? and deleted_at is null`;
      const queryParams = [value];
      printSqlLog(queryString, queryParams);
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
      printSqlLog(queryString);
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
      printSqlLog(queryString, queryParams);
      const [resultOfQuery] = await connection.query(queryString, queryParams);

      if (!resultOfQuery[0]) result = 404;
      else result = resultOfQuery[0];

      return result;
    } catch (err) {
      logger.error(err.stack);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };

  // @params data: {password, id, email}
  static updatePassword = async data => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      connection.beginTransaction();
      const queryString =
        'update users set password = ? where id = ? and email = ? and deleted_at is null';
      const queryParams = [data.password, data.id, data.email];
      const [resultOfQuery] = await connection.query(queryString, queryParams);
      const isPwdUpdated = resultOfQuery[0].affectedRows > 0;
      if (!isPwdUpdated) result = 500;
      else result = 200;

      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      logger.error(err.stack);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };

  // @params data: {password, id}
  static updateNewPassword = async data => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      connection.beginTransaction();

      const updatedAt = printCurrentTime();
      const queryString =
        'update users set password = ?, updated_at = ? where id = ? and email = ? and deleted_at is null';
      const queryParams = [data.password, updatedAt, data.id];
      const [resultOfQuery] = await connection.query(queryString, queryParams);
      const isPwdUpdated = resultOfQuery[0].affectedRows > 0;
      if (!isPwdUpdated) result = 500;
      else result = 200;

      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      logger.error(err.stack);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };

  // @params data: {imagePath, updatedAt, id}
  static updateProfile = async data => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      connection.beginTransaction();
      const queryString =
        'update users set profile_image_path = ?, updated_at = ? where id = ?';
      const queryParams = [data.profilePath, data.updatedAt, data.id];
      const [resultOfQuery] = await connection.query(queryString, queryParams);
      const isProfileUpdated = resultOfQuery[0].affectedRows > 0;
      if (!isProfileUpdated) result = 500;
      else result = 200;

      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      logger.error(err.stack);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };
  // @params data: {name, updatedAt, id}
  static updateNickname = async data => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      connection.beginTransaction();
      const queryString =
        'update users set name = ?, updated_at = ? where id = ?';
      const queryParams = [data.name, data.updatedAt, data.id];
      const [resultOfQuery] = await connection.query(queryString, queryParams);
      const isNicknameUpdated = resultOfQuery[0].affectedRows > 0;
      if (!isNicknameUpdated) result = 500;
      else result = 200;

      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      logger.error(err.stack);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };

  static deleteUser = async userId => {
    let result, connection;
    const queryString = {
      users:
        'update users set deleted_at = ? where id = ? and deleted_at is null',
      likes:
        'update likes set deleted_at = ? where user_id = ? and deleted_at is null',
      reviews:
        'update reviews set deleted_at = ? where user_id = ? and deleted_at is null',
    };
    const deletedAt = printCurrentTime();
    const commonQueryParams = [deletedAt, userId];

    try {
      connection = await pool.getConnection();
      connection.beginTransaction();

      const [resultOfDeleteUser] = await connection.query(
        queryString.users,
        commonQueryParams,
      );
      if (resultOfDeleteUser[0].affectedRows < 0) throw err;
      const [resultOfDeleteUserLikes] = await connection.query(
        queryString.likes,
        commonQueryParams,
      );
      if (resultOfDeleteUserLikes[0].affectedRows < 0) throw err;
      const [resultOfDeleteUserReviews] = await connection.query(
        queryString.reviews,
        commonQueryParams,
      );
      if (resultOfDeleteUserReviews[0].affectedRows < 0) throw err;

      result = deletedAt;

      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      logger.error(err.stack);
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };
}

module.exports = UserService;
