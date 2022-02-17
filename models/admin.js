const logger = require('../config/logger');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const DB = require('../config/mysql');

class Admin {
  // 카페 정보 등록, 수정 요청 승인
  static approveUserRequest(data) {
    try {
      const { user_id, cafe_id, created_at, tblName } = data;
      // tblName 에 따라 접근 테이블 달라지며, status를 'Y'로 변경
      const query = `update ${tblName} set status = ? where user_id = ?, cafe_id = ?, created_at = ?`;
      // user_id, cafe_id, created_at 을 기준으로 row 조회
      const params = ['RA', user_id, cafe_id, created_at];
      const result = await DB('PATCH', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
}

module.exports = Admin;
