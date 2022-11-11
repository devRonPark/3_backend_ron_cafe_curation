class UserModel {
  static findUserById = async userId => {
    let result, connection;
    try {
      connection = await pool.getConnection();

      const queryString =
        'select name, email, phone_number, profile_image_path from users where id = ?';
      const queryParams = [userId];
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

  static find;
}

module.exports = UserModel;
