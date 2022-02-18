const logger = require('../config/logger');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const DB = require('../config/mysql');
const { printCurrentTime } = require('./util');

class Comment {
  // 모든 댓글 조회
  static async getAllComments() {
    try {
      const query =
        'select user_id, cafe_id, content, created_at from comments';
      const result = await DB('GET', query);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // cafe_id 로 카페 별 작성된 댓글 조회
  static async getCommentsByCafeId(data) {
    try {
      const { cafe_id } = data;
      const query =
        'select user_id, content, created_at from comments where cafe_id = ?';
      const params = [cafe_id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 댓글 등록
  static async createComment(data) {
    try {
      const { user_id, cafe_id, content, created_at } = data;
      const query =
        'insert into comments set user_id = ?, cafe_id = ?, content = ?, created_at = ?';
      const params = [user_id, cafe_id, content, created_at];
      const result = await DB('POST', query, params);
      const insertId = result.data.insertId;
      return { comment_id: insertId, state: result.state };
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 댓글 수정
  static async updateComment(data) {
    try {
      const { comment_id, content, edited_at } = data;
      const query =
        'update comments set content = ?, edited_at = ? where id = ?';
      const params = [content, edited_at, comment_id];
      // {data: {"affectedRows": 1, "changedRows": 1, ...}, state: true}
      const result = await DB('PUT', query, params);
      const affectedRows = result.data.affectedRows;
      return { affectedRows, state: result.state };
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 댓글 삭제
  static async deleteComment(data) {
    try {
      const { comment_id, deleted_at } = data;
      const query = 'update comments set deleted_at = ? where id = ?';
      const params = [deleted_at, comment_id];
      // {data: {"affectedRows": 1, "changedRows": 1, ...}, state: true}
      const result = await DB('DELETE', query, params);
      const affectedRows = result.data.affectedRows;
      return { affectedRows, state: result.state };
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // comment_id 로 실제로 존재하는 댓글 정보인지 판단
  static async isCommentInfoExist(data) {
    try {
      // comment_id와 값이 일치하고 deleted_at 이 null인 데이터 조회
      const query =
        'select id, content from comments where id = ? and deleted_at is NULL';
      const params = [data.id];
      // {"data": [{}], "state": true}
      const result = await DB('GET', query, params);
      const commentData = result.data[0];
      return commentData;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
}

module.exports = Comment;
