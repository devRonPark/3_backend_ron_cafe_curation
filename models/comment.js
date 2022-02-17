const logger = require('../config/logger');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const DB = require('../config/mysql');
const { printCurrentTime } = require('./util');

class Comment {
  // 댓글 등록
  static async createComment(data) {
    try {
      const { user_id, cafe_id, content } = data;
      const query =
        'insert into comments set user_id = ?, cafe_id = ?, content = ?';
      const params = [user_id, cafe_id, content];
      const result = await DB('POST', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 댓글 수정
  static async updateComment(data) {
    try {
      const { comment_id, content } = data;
      const timestamp = printCurrentTime();
      const query =
        'update into comments set content = ?, edited_at = ? where id = ?';
      const params = [content, timestamp, comment_id];
      const result = await DB('PUT', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
}

module.exports = Comment;
