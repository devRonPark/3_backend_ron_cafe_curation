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
      throw new Error(err.message);
    }
  }
  // 이름으로 카페 데이터 조회
  static async findCafeDataByName(searchWord) {
    try {
      console.log('searchWord: ', searchWord);
      // 특정 문자가 포함되어 있는 데이터 검색 시 LIKE 연산자 사용
      const query =
        'select id, name, jibun_address from cafes where name LIKE ?';
      const params = `%${searchWord}%`;
      const result = await DB('GET', query, params);
      console.log('Search Result: ', result);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 지번 주소로 카페 데이터 조회
  static async findCafeDataByJibunAddr(addrObj) {
    try {
      const { city, gu, dong } = addrObj;
      // 특정 문자가 포함되어 있는 데이터 검색 시 LIKE 연산자 사용
      const query =
        'select id, name, jibun_address from cafes where jibun_address LIKE ?';
      const params = `%${city} ${gu} ${dong}%`;
      const result = await DB('GET', query, params);
      console.log('Search Result: ', result);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // status 로 카페 데이터 조회
  // status: 사용자 등록 전(NULL), 사용자의 등록 요청('N'), 관리자 승인 완료('Y')
  static async findCafeDataByStatus(status) {
    try {
      const query = 'select name, status from cafes where status = ?';
      const params = [status];
      const result = await DB('GET', query, params);
      console.log('Search Result: ', result);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 카페 ID로 카페 정보(이름, 주소, 전화번호) 불러오기
  static async getCafeInfoById(cafeInfo) {
    try {
      const query =
        'select name, jibun_address, road_address, tel from cafes where id = ?';
      const params = [cafeInfo.id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 카페 ID로 카페 메뉴 정보 불러오기
  static async getMenuDataById(cafeInfo) {
    try {
      const query = 'select name, price from menus where cafe_id = ?';
      const params = [cafeInfo.id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 카페 ID로 카페 영업시간 정보 불러오기
  static async getOperHoursDataById(cafeInfo) {
    try {
      const query =
        'select day, is_day_off, start_time, end_time from operating_hours where cafe_id = ?';
      const params = [cafeInfo.id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 메뉴 정보 등록
  static async updateMenuTbl(cafeInfo) {
    const { id, menus } = cafeInfo;
    let query, params, result;
    const resultList = [];
    for (let i = 0; i < menus.length; i++) {
      try {
        const { name, price } = menus[i];
        console.log(name, price);
        query = 'insert into menus set name = ?, price = ?, cafe_id = ?';
        params = [name, price, id];
        result = await DB('POST', query, params);
        resultList.push(result);
      } catch (err) {
        logger.error(err.stack);
        throw new Error(err.message);
      }
    }
    return result;
  }
  // 영업 시간 정보 등록
  static async updateOperHoursTbl(cafeInfo) {
    const { id, operating_hours } = cafeInfo;
    let query, params, result;
    const resultList = [];
    for (let i = 0; i < operating_hours.length; i++) {
      try {
        const { day, is_day_off, start_time, end_time } = operating_hours[i];
        // 휴일이면 start_time, end_time은 기본값으로 0000 저장
        query =
          is_day_off === 'Y'
            ? 'insert into operating_hours set day = ?, is_day_off = ?, cafe_id = ?'
            : 'insert into operating_hours set day = ?, start_time = ?, end_time = ?, cafe_id = ?';
        params =
          is_day_off === 'Y'
            ? [day, is_day_off, id]
            : [day, start_time, end_time, id];
        result = await DB('POST', query, params);
        resultList.push(result);
      } catch (err) {
        logger.error(err.stack);
        throw new Error(err.message);
      }
    }
    return resultList;
  }
  // 사용자의 카페 정보 등록 요청
  static async updateCafeData(cafeInfo) {
    // 입력받을 데이터 값 : 대표 이미지, 전화번호, 메뉴 데이터, 영업 시간 데이터
    // 대표 이미지, 전화번호 칼럼 이름 : image_path, tel
    // 메뉴, 영업 시간은 카페 테이블과 cafe_id를 외래키로 하여 결합되어 있음.
    // 대표 이미지는 첨부하지 않아도 업데이트 허용
    // 전화번호, 메뉴 데이터, 영업 시간 데이터는 필수값
    // 사용자의 등록 요청 시 반드시 status는 'N'으로
    // 성공 시 응답코드는 200 OK
    try {
      logger.info('cafeInfo: ', cafeInfo);
      const { id, tel, image_path } = cafeInfo;
      let query, params, cafeTblResult, menuTblResult, operHoursTblResult;
      // 대표 이미지 없고 메뉴 데이터, 영업 시간 데이터만 있는 경우
      if (!image_path) {
        // 전화번호 업데이트
        query = 'update cafes set tel = ?, status = ? where id = ?';
        params = [tel, 'N', id];
        cafeTblResult = await DB('PATCH', query, params);
        // 메뉴 정보 업데이트
        menuTblResult = await this.updateMenuTbl(cafeInfo);
        // 영업시간 정보 업데이트
        operHoursTblResult = await this.updateOperHoursTbl(cafeInfo);
        return { cafeTblResult, menuTblResult, operHoursTblResult };
      }
      // 대표 이미지, 메뉴 데이터, 영업 시간 데이터 다 있는 경우
      cafeTblQuery =
        'update cafes set image_path = ?, tel = ?, status = ? where cafe_id = ?';
      cafeTblParams = [image_path, tel, 'N', id];
      cafeTblResult = await DB('PATCH', query, params);
      // 메뉴 정보 업데이트
      menuTblResult = await this.updateMenuTbl(cafeInfo);
      // 영업시간 정보 업데이트
      operHoursTblResult = await this.updateOperHoursTbl(cafeInfo);

      return { cafeTblResult, menuTblResult, operHoursTblResult };
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
}
module.exports = Cafe;
