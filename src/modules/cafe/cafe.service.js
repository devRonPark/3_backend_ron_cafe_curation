const MySqlError = require('../../common/errors/mysql.error');
const { printSqlLog } = require('../../common/util');
const logger = require('../../config/logger');
const pool = require('../../config/mysql');

class CafeService {
  static async getCafeList(pageNumber, itemCount) {
    const connection = await pool.getConnection();

    try {
      const queryString = `select id, name, image_path, jibun_address, road_address from cafes order by id desc limit ?, ?`;
      const queryParams = [(pageNumber - 1) * itemCount, itemCount];
      const [queryResult] = await connection.query(queryString, queryParams);
      printSqlLog(queryString, queryParams);

      if (queryResult.length === 0) return 404;

      console.log(queryResult);
      return queryResult;
    } catch (error) {
      console.error(error);
      throw new MySqlError(error.message);
    } finally {
      await connection.release();
    }
  }
  static getQueryParams(searchOption) {
    if (searchOption.type === 'name') {
      return [];
    } else if (searchOption.type === 'address') {
    }
  }
  static async getCafeListByName(pageNumber, itemCount, name) {
    const connection = await pool.getConnection();

    try {
      const queryString =
        'select id, name, image_path, road_address, jibun_address from cafes where name LIKE ? limit ?, ?';
      const queryParams = [
        `%${name}%`,
        (pageNumber - 1) * itemCount,
        itemCount,
      ];
      const [queryResult] = await connection.query(queryString, queryParams);
      printSqlLog(queryString, queryParams);

      if (queryResult.length === 0) return 404;

      console.log(queryResult);
      return queryResult;
    } catch (error) {
      console.error(error);
      throw new MySqlError(error.message);
    } finally {
      await connection.release();
    }
  }
  static async getCafeListByAddress(pageNumber, itemCount, { gu, dong }) {
    const connection = await pool.getConnection();

    try {
      const queryString =
        'select id, name, road_address, jibun_address, image_path from cafes where jibun_address LIKE ? and road_address LIKE ? limit ?, ?';
      const queryParams = [
        `%${dong}%`,
        `%${gu}%`,
        (pageNumber - 1) * itemCount,
        itemCount,
      ];
      const [queryResult] = await connection.query(queryString, queryParams);
      printSqlLog(queryString, queryParams);

      if (queryResult.length === 0) return 404;

      console.log(queryResult);
      return queryResult;
    } catch (error) {
      console.error(error);
      throw new MySqlError(error.message);
    } finally {
      await connection.release();
    }
  }
  static async getCafeDetailById(cafeId) {
    const connection = await pool.getConnection();
    try {
      // cafes, menus, operating_hours 테이블 동시에 Inner Join
      const queryString =
        'select c.name, c.image_path, c.jibun_address, c.road_address, c.latitude, c.longitude, c.tel, c.created_at, c.views, m.name as menu_name, m.price from cafes as c left join menus as m on c.id = m.cafe_id where c.id = ?';
      const queryParams = [cafeId];
      const [queryResult] = await connection.execute(queryString, queryParams);

      if (queryResult.length === 0) return 404;
      return queryResult;
    } catch (error) {
      console.error(error);
      throw new MySqlError(error.message);
    } finally {
      await connection.release();
    }
  }
  static makeCafeDetailRes(queryResult) {
    const resObj = { cafeData: {}, menuData: [] };
    console.log(queryResult[0]);
    for (const [key, value] of Object.entries(queryResult[0])) {
      if (key === 'menu_name' || key === 'price') continue;
      console.log(key, value);
      resObj.cafeData[key] = value;
    }
    console.log(resObj);

    for (const obj of queryResult) {
      if (obj.menu_name !== null && obj.price !== null) {
        resObj.menuData.push({ name: obj.menu_name, price: obj.price });
      }
    }
    console.log(resObj);
    return resObj;
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
