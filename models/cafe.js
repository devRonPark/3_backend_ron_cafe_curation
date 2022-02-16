const logger = require('../config/logger');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const DB = require('../config/mysql');
const mysql = require('mysql2/promise');

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
  static async findCafeDataByName(searchWord) {
    try {
      console.log('searchWord: ', searchWord);
      // 특정 문자가 포함되어 있는 데이터 검색 시 LIKE 연산자 사용
      const query = 'select name from cafes where name LIKE ?';
      const params = `%${searchWord}%`;
      const result = await DB('GET', query, params);
      console.log('Search Result: ', result);
      return result;
    } catch (err) {
      logger.error(err.stack);
    }
  }
  static async findCafeDataByJibunAddr(addrObj) {
    try {
      const { city, gu, dong } = addrObj;
      // 특정 문자가 포함되어 있는 데이터 검색 시 LIKE 연산자 사용
      const query = 'select name from cafes where jibun_address LIKE ?';
      const params = `%${city} ${gu} ${dong}%`;
      const result = await DB('GET', query, params);
      console.log('Search Result: ', result);
      return result;
    } catch (err) {
      logger.error(err.stack);
    }
  }
}
module.exports = Cafe;
