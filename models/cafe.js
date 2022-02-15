const logger = require('../config/logger');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const DB = require('../config/mysql');

class Cafe {
  static async saveDataFromPublicApi(cafeData) {
    // 중부원점 좌표계의 x, y 좌표 값 제거
    cafeData.forEach(cafeInfo => {
      delete cafeInfo.xCoordinate;
      delete cafeInfo.yCoordinate;
    });
    try {
      const query = 'insert into cafes set ?';
      cafeData.forEach(async cafeInfo => {
        const params = cafeInfo;
        // 카페 정보 DB에 저장
        await DB('POST', query, params);
      });
      return { state: true };
    } catch (err) {
      logger.error(err.stack);
    }
  }
}
module.exports = Cafe;
