const logger = require('../../config/logger');
const pool = require('../../config/mysql');

class CafeService {
  static async getCafeList(pageNumber, itemCount) {
    const connection = await pool.getConnection();

    try {
      const queryString = `select id, name, image_path, jibun_address, road_address from cafes order by id desc limit ?, ?`;
      const queryParams = [(pageNumber - 1) * itemCount, itemCount];
      const [queryResult] = await connection.query(queryString, queryParams);
      printSqlLog(queryStringString, queryParams);

      if (queryResult.length === 0) return 404;

      console.log(queryResult);
      return queryResult;
    } catch (e) {
      console.log(error);
      throw new MySqlError(error.message);
    }
  }
  static async saveDataFromPublicApi(cafeData) {
    // 중부원점 좌표계의 x, y 좌표 값 제거
    cafeData.forEach(cafeInfo => {
      delete cafeInfo.xCoordinate;
      delete cafeInfo.yCoordinate;
    });

    const connection = await pool.getConnection();
    connection.beginTransaction();
    try {
      const queryString =
        'update cafes set latitude=?, longitude=? where name = ?';
      cafeData.forEach(async cafeInfo => {
        const queryParams = [
          cafeInfo.latitude,
          cafeInfo.longitude,
          cafeInfo.name,
        ];
        // 카페 정보 DB에 저장
        const result = await connection.execute(queryString, queryParams);
      });
      await connection.commit();
      return { state: true };
    } catch (err) {
      await connection.rollback();
      logger.error(err.stack);
      throw new Error(err.message);
    } finally {
      connection.release();
    }
  }
}
module.exports = CafeService;
