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
      const query = 'insert into user_no_edit_cafes set ?';
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
  // 이름으로 카페 데이터 조회(검색 API에서 사용됨)
  static async findCafeDataByName(searchWord) {
    try {
      console.log('searchWord: ', searchWord);
      // 특정 문자가 포함되어 있는 데이터 검색 시 LIKE 연산자 사용
      const query =
        'select id, name, jibun_address from user_no_edit_cafes where name LIKE ?';
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
        'select id, name, jibun_address from user_no_edit_cafes where jibun_address LIKE ?';
      const params = `%${city} ${gu} ${dong}%`;
      const result = await DB('GET', query, params);
      console.log('Search Result: ', result);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 관리자에서 status 로 카페 데이터 조회
  // status: 등록 요청(RR), 등록 완료(RA), 삭제 요청(DR), 삭제 완료(DA)
  // 조회 데이터: user_no_edit_cafes 테이블에서 이름, 지번주소 + user_edit_cafes 테이블에서 전화번호, 배경 이미지
  // inner join 이용
  // 검색 조건 : user_no_edit_cafes.id와 user_edit_cafes.cafe_id 가 일치 && user_edit_cafes.status = 'RR'
  static async findCafeDataByStatus(data) {
    try {
      const query =
        'select C.name, C.jibun_address, U.tel, U.image_path from user_no_edit_cafes as C inner join user_edit_cafes as U on C.id = U.cafe_id where U.status = ?';
      const params = [data.status];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 관리자에서 카페 ID로 카페 정보 불러오기
  static async getCafeInfoById(data) {
    try {
      // 'RR' => 등록 요청된 데이터
      const query =
        'select C.name, C.jibun_address, C.road_address, C.latitude, C.longitude, C.tel, U.image_path from user_no_edit_cafes as C inner join user_edit_cafes as U on C.id = U.cafe_id where C.id = ? and U.status = RR order by U.created_at desc limit 1';
      const params = [data.id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 관리자에서 카페 ID로 카페 메뉴 정보 불러오기
  static async getMenuDataById(data) {
    try {
      const query =
        'select name, price from menus where cafe_id = ? and status = RR and created_at = (select max(created_at) from menus) order by created_at desc';
      const params = [data.id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 관리자에서 카페 ID로 카페 영업시간 정보 불러오기
  static async getOperHoursDataById(data) {
    try {
      const query =
        'select day, is_day_off, start_time, end_time from operating_hours where cafe_id = ? and status = RA and created_at = (select max(created_at) from operating_hours) order by created_at desc';
      const params = [data.id];
      const result = await DB('GET', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 메뉴 정보 등록
  static async updateMenuTbl(data) {
    const { user_id, cafe_id, menus } = data;
    let query, params, result;
    const resultList = [];
    for (let i = 0; i < menus.length; i++) {
      try {
        const { name, price } = menus[i];
        console.log(name, price);
        query =
          'insert into menus set user_id = ?, cafe_id = ?, name = ?, price = ?, status = ?';
        params = [user_id, cafe_id, name, price, 'RR']; // 'RR' => 등록 요청
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
  static async updateOperHoursTbl(data) {
    const { user_id, cafe_id, operating_hours } = data;
    let query, params, result;
    const resultList = [];
    for (let i = 0; i < operating_hours.length; i++) {
      try {
        const { day, is_day_off, start_time, end_time } = operating_hours[i];
        // 휴일이면 start_time, end_time은 기본값으로 0000 저장
        query =
          is_day_off === 'Y'
            ? 'insert into operating_hours set user_id = ?, cafe_id = ?, day = ?, is_day_off = ?, status = ?'
            : 'insert into operating_hours set user_id = ?, cafe_id = ?, day = ?, start_time = ?, end_time = ?, status = ?';
        params =
          is_day_off === 'Y'
            ? [user_id, cafe_id, day, is_day_off, 'RR'] // 'RR' => 등록 요청
            : [user_id, cafe_id, day, start_time, end_time, 'RR']; // 'RR' => 등록 요청
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
  static async registerCafeInfo(data) {
    // 입력받을 데이터 값 : 대표 이미지, 전화번호, 메뉴 데이터, 영업 시간 데이터
    // 대표 이미지, 전화번호 칼럼 이름 : image_path, tel
    // 메뉴, 영업 시간은 카페 테이블과 cafe_id를 외래키로 하여 결합되어 있음.
    // 대표 이미지는 첨부하지 않아도 업데이트 허용
    // 전화번호, 메뉴 데이터, 영업 시간 데이터는 필수값
    // 사용자의 등록 요청 시 반드시 status는 'N'으로
    // 성공 시 응답코드는 200 OK
    try {
      logger.info('data: ', data);
      const { user_id, cafe_id, tel, image_path } = data;
      let query, params, cafeTblResult, menuTblResult, operHoursTblResult;
      // 대표 이미지 없고 메뉴 데이터, 영업 시간 데이터만 있는 경우
      if (!image_path) {
        // 전화번호 업데이트
        query =
          'insert user_edit_cafes set user_id = ?, cafe_id = ?, tel = ?, status = ?';
        params = [user_id, cafe_id, tel, 'RR']; // 'RR' => 등록 요청
        cafeTblResult = await DB('POST', query, params);
        // 메뉴 정보 업데이트
        menuTblResult = await this.updateMenuTbl(data);
        // 영업시간 정보 업데이트
        operHoursTblResult = await this.updateOperHoursTbl(data);
        return { cafeTblResult, menuTblResult, operHoursTblResult };
      }
      // 대표 이미지, 메뉴 데이터, 영업 시간 데이터 다 있는 경우
      cafeTblQuery =
        'insert user_edit_cafes set user_id = ?, cafe_id = ?, image_path = ?, tel = ?, status = ?';
      cafeTblParams = [user_id, cafe_id, image_path, tel, 'RR']; // 'RR' => 등록 요청
      cafeTblResult = await DB('POST', query, params);
      // 메뉴 정보 업데이트
      menuTblResult = await this.updateMenuTbl(data);
      // 영업시간 정보 업데이트
      operHoursTblResult = await this.updateOperHoursTbl(data);

      return { cafeTblResult, menuTblResult, operHoursTblResult };
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 사용자의 카페 정보 수정 요청
  static async updateCafeInfo(data) {
    try {
      const { user_id, cafe_id, tel, image_path } = data;
      // 수정하고자 하는 데이터와 함께 하나의 튜플 새로 생성
      const query =
        'insert into user_edit_cafes set user_id = ?, cafe_id = ?, tel = ?, image_path = ?, status = ?';
      let params, result;
      // 대표 이미지만 수정
      if (!tel) {
        params = [user_id, cafe_id, null, image_path, 'RR']; // 'RR' => 등록 요청
        result = await DB('POST', query, params);
        return result;
      }
      // 전화번호만 수정
      if (!image_path) {
        // cafe_id 로 조회하여 변경되지 않는 데이터 가져오기
        params = [user_id, cafe_id, tel, null, 'RR']; // 'RR' => 등록 요청
        result = await DB('POST', query, params);
        return result;
      }
      // 전화번호, 대표 이미지 두 개 다 수정하는 경우
      params = [user_id, cafe_id, tel, image_path, 'RR']; // 'RR' => 등록 요청
      result = await DB('POST', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // 테이블에서 cafe_id 와 일치하는 튜플의 status 값 변경
  static async setStatusOfTbl(tblName, statusValue, cafe_id) {
    try {
      // cafes 테이블 데이터 status 'D'로 변경
      const query = `update ${tblName} set status = ? where cafe_id = ?, status = RA`;
      const params = [statusValue, cafe_id];
      const result = await DB('DELETE', query, params);
      return result;
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
  // id에 해당하는 카페 정보 삭제 요청
  static async deleteCafeInfo(data) {
    try {
      const { cafe_id } = data;
      // cafes 테이블, menus 테이블, operating_hours 테이블 데이터 status 'D'로 변경
      let cafeTblResult, menuTblResult, operHoursTblResult;
      cafeTblResult = await this.setStatusOfTbl(
        'user_edit_cafes',
        'DR',
        cafe_id,
      );
      menuTblResult = await this.setStatusOfTbl('menus', 'DR', cafe_id);
      operHoursTblResult = await this.setStatusOfTbl(
        'operating_hours',
        'DR',
        cafe_id,
      );
      return { cafeTblResult, menuTblResult, operHoursTblResult };
    } catch (err) {
      logger.error(err.stack);
      throw new Error(err.message);
    }
  }
}
module.exports = Cafe;
