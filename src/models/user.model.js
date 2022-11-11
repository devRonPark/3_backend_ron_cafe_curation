const logger = require('../config/logger');
const pool = require('../config/mysql');

class UserModel {
  // option: {id: , name: }
  static findUserByType = async (type, value) => {
    let result, connection;
    try {
      connection = await pool.getConnection();
      const queryString = `select name, email, profile_image_path from users where ${type} = ?`;
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

  static findPasswordById = async userId => {
    let result, connection;
    try {
      connection = await pool.getConnection();

      const queryString =
        'select password from users where id = ? and deleted_at is null';
      const queryParams = [userId];
      printSqlLog(queryString, queryParams);
      const [resultOfQuery] = await connection.query(queryString, queryParams);
      if (!resultOfQuery[0]) result = 404;
      else result = resultOfQuery[0];
      return result;
    } catch (err) {
      result = 500;
      return result;
    } finally {
      connection.release();
    }
  };
}

module.exports = UserModel;
