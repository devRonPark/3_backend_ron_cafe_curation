const { errorMsgKor } = require('../../common/constants');
const MySqlError = require('../../common/errors/mysql.error');
const { select, selectOne } = require('../../common/utils/queries');
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
    try {
      const queryResult = await select(
        'select c.name, c.image_path, c.jibun_address, c.road_address, c.latitude, c.longitude, c.tel, c.created_at, m.name as menu_name, m.price from cafes as c left join menus as m on c.id = m.cafe_id where c.id = ?',
        [cafeId],
      );
      if (queryResult.length === 0) return 404;
      return queryResult;
    } catch (error) {
      logger.error(error);
      return 500;
    }
  }
  static async getCafeReviewsById(cafeId) {
    try {
      const queryResult = await select(
        'select r.id, r.user_id, r.ratings, r.comment, r.created_at, r.updated_at, u.name, u.profile_image_path from reviews as r left join users as u on r.cafe_id = ? and r.deleted_at is null and r.user_id = u.id',
        [cafeId],
      );
      if (queryResult.length === 0) return 404;
      return queryResult;
    } catch (error) {
      logger.error(error);
      return 500;
    }
  }
  static async getAverageRatingsById(cafeId) {
    try {
      const queryResult = await select(
        'select avg(ratings) from reviews where cafe_id = ? and deleted_at is null',
        [cafeId],
      );
      logger.info(queryResult);
      return queryResult[0]['avg(ratings)'];
    } catch (error) {
      logger.error(error.message);
      return 500;
    }
  }
  static makeCafeDetailRes(queryResult) {
    const resObj = { cafeData: {}, menuData: [] };
    for (const [key, value] of Object.entries(queryResult[0])) {
      if (key === 'menu_name' || key === 'price') continue;
      resObj.cafeData[key] = value;
    }

    for (const obj of queryResult) {
      resObj.menuData.push({ name: obj.menu_name, price: obj.price });
    }
    return resObj;
  }
  static async getLikeCountById(cafeId) {
    try {
      const queryResult = await select(
        'select count(0) from likes where cafe_id = ? and deleted_at is null',
        [cafeId],
      );
      logger.info(queryResult);
      return queryResult[0]['count(0)'];
    } catch (error) {
      logger.error(error.message);
      return 500;
    }
  }
  static async getViewCountById(cafeId) {
    try {
      const queryResult = await select('select views from cafes where id = ?', [
        cafeId,
      ]);
      return queryResult[0];
    } catch (error) {
      logger.error(error.message);
      return 500;
    }
  }
}
module.exports = CafeService;
