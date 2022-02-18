// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const logger = require('../config/logger');
const DB = require('../config/mysql');
const { printCurrentTime } = require('./util');

class Stars {
  static async registerStars(data) {
    try {
      const {
        user_id,
        cafe_id,
        stars_about_talk,
        stars_about_book,
        stars_about_work,
        stars_about_coffee,
        created_at,
      } = data;
      // 평점 데이터 4개 동시에 추가
      const query =
        'insert into stars (user_id, cafe_id, name, value, created_at) values (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)';
      const params = [
        user_id,
        cafe_id,
        'stars_about_talk',
        stars_about_talk,
        created_at,
        user_id,
        cafe_id,
        'stars_about_book',
        stars_about_book,
        created_at,
        user_id,
        cafe_id,
        'stars_about_work',
        stars_about_work,
        created_at,
        user_id,
        cafe_id,
        'stars_about_coffee',
        stars_about_coffee,
        created_at,
      ];
      // {data: {affectedRows, changedRows, ...}, state: true}
      const result = await DB('POST', query, params);
      console.log('result: ', result);
      const affectedRows = result.data.affectedRows;
      return { affectedRows, state: result.state };
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
}

module.exports = Stars;
