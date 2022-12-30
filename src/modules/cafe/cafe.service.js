const MySqlError = require('../../common/errors/mysql.error');
const { select } = require('../../common/utils/queries');
const logger = require('../../config/logger');
const pool = require('../../config/mysql');

class CafeService {
  static async getCafeList(pageNumber, itemCount) {
    try {
      const queryResult = await select(
        'select id, name, image_path, jibun_address, road_address from cafes order by id desc limit ?, ?',
        [(pageNumber - 1) * itemCount, itemCount],
      );

      if (queryResult.length === 0) return 404;
      return queryResult;
    } catch (error) {
      logger.error(error);
      return 500;
    }
  }
  static async getCafeListByName(pageNumber, itemCount, name) {
    try {
      const queryResult = await select(
        'select id, name, image_path, road_address, jibun_address from cafes where name LIKE ? limit ?, ?',
        [`%${name}%`, (pageNumber - 1) * itemCount, itemCount],
      );

      if (queryResult.length === 0) return 404;
      return queryResult;
    } catch (error) {
      logger.error(error);
      throw 500;
    }
  }
  static async getCafeListByAddress(pageNumber, itemCount, { gu, dong }) {
    try {
      const queryResult = await select(
        'select id, name, road_address, jibun_address, image_path from cafes where jibun_address LIKE ? and road_address LIKE ? limit ?, ?',
        [`%${dong}%`, `%${gu}%`, (pageNumber - 1) * itemCount, itemCount],
      );

      if (queryResult.length === 0) return 404;
      return queryResult;
    } catch (error) {
      logger.error(error);
      return 500;
    }
  }
  static async getCafeDetailById(cafeId) {
    const connection = await pool.getConnection();
    try {
      // cafes, menus, operating_hours 테이블 동시에 Inner Join
      const queryString =
        'select c.name, c.image_path, c.jibun_address, c.road_address, c.latitude, c.longitude, c.tel, c.created_at, m.name as menu_name, m.price from cafes as c inner join menus as m on c.id = m.cafe_id where c.id = ?';
      const queryParams = [cafeId];
      const [queryResult] = await connection.query(queryString, queryParams);
      console.log(queryResult);
      if (queryResult.length === 0) return 404;
      return queryResult;
    } catch (error) {
      console.error(error);
      throw new MySqlError(error.message);
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
      resObj.menuData.push({ name: obj.menu_name, price: obj.price });
    }
    console.log(resObj);
    return resObj;
  }
}
module.exports = CafeService;
