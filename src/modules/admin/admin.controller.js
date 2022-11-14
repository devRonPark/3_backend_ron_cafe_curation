const { successCode } = require('../../common/statusCodes/statusCode');
const logger = require('../../config/logger');
const pool = require('../../config/mysql');
const { printSqlLog } = require('../../common/util');
const MySqlError = require('../../common/errors/mysql.error');
const NotFoundError = require('../../common/errors/not-found.error');

class AdminController {
  // 페이지 별 카페 데이터 조회
  static getCafeDataByPage = async (req, res, next) => {
    const currentPage = req.query.page.trim(); // 현재 페이지
    const countPage = 10; // 한 페이지에 보여줄 카페 정보 수
    const queryString = {
      totalRows: '',
      cafeDataAtCurrPage: '',
    };
    const result = {
      totalRows: '',
      cafeDataAtCurrPage: '',
    };

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // cafes 테이블 전체 rows 수 조회
      queryString.totalRows = `select TABLE_ROWS from INFORMATION_SCHEMA.TABLES where TABLE_SCHEMA = 'curation_project_db' and TABLE_NAME = 'cafes'`;
      printSqlLog(queryString.totalRows);
      result.totalRows = await connection.query(queryString.totalRows);
      if (!result.totalRows[0][0].TABLE_ROWS) {
        throw new NotFoundError('TotalRows is not selected where cafes table');
      }
      if (result.totalRows[0].length > 0) {
        logger.info('TotalRows successfully selected where cafes table');
      }
      const totalCount = result.totalRows[0][0].TABLE_ROWS; // 총 카페 데이터 수

      queryString.cafeDataAtCurrPage = `select id, name, jibun_address, road_address, latitude, longitude from cafes order by id desc limit ${
        (currentPage - 1) * countPage
      }, ${countPage}  `;
      printSqlLog(queryString.cafeDataAtCurrPage);
      result.cafeDataAtCurrPage = await connection.query(
        queryString.cafeDataAtCurrPage,
      );
      if (result.cafeDataAtCurrPage[0].length === 0) {
        throw new NotFoundError('Cafe into not found');
      }
      if (result.cafeDataAtCurrPage[0].length > 0) {
        logger.info('successfully selected where cafes table');
      }

      await connection.commit();
      return res
        .status(successCode.OK)
        .json({ totalCount: totalCount, data: result.cafeDataAtCurrPage[0] });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };
  // 관리자의 카페 정보 등록 컨트롤러
  static registerCafeInfo = async (req, res, next) => {
    const reqObj = { ...req.body, image_path: req.file.path };
    // 응답으로 전달할 객체
    const resObj = {};
    const queryString = {
      cafeInfo: '',
      menus: '',
      operating_hours: '',
    };
    const queryParams = {
      cafeInfo: [],
      menus: [],
      operating_hours: [],
    };
    const bindVariables = {
      menus: '',
      operating_hours: '',
    };
    const resultObj = {
      cafeInfo: {},
      menus: {},
      operating_hours: {},
    };
    const {
      name,
      tel,
      jibun_address,
      road_address,
      latitude,
      longitude,
      image_path,
      menus,
      operating_hours,
    } = reqObj;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      queryString.cafeInfo =
        'insert into cafes (name, tel, jibun_address, road_address, latitude, longitude, image_path) values (?,?,?,?,?,?,?)';
      queryParams.cafeInfo = [
        name,
        tel,
        jibun_address,
        road_address,
        latitude,
        longitude,
        image_path,
      ];
      printSqlLog(queryString.cafeInfo, queryParams.cafeInfo);
      resultObj.cafeInfo = await connection.execute(
        queryString.cafeInfo,
        queryParams.cafeInfo,
      );
      if (resultObj.cafeInfo[0].affectedRows === 0)
        throw new MySqlError('Cafe info register fail');
      // cafes 테이블에 생성된 row 의 id
      const cafeId = result01[0].insertId;
      // cafes 테이블에 성공적으로 정보 등록이 완료된다면,
      if (resultObj.cafeInfo[0].affectedRows === 1) {
        logger.info('successfully inserted into cafes table');
        logger.info(`registered cafeId: ${cafeId}`);
        // 응답 객체에 생성된 cafeId 추가
        resObj['cafeId'] = cafeId;
      }

      // menus: [{name: "아메리카노", price: 2500}, {name: "카페라떼", price: 4000}]
      menus.forEach((menu, index) => {
        queryParams.menus.push([cafeId, menu.name, menu.price]);
        if (menus.length === index + 1) {
          bindVariables.menus += '(?, ?, ?)';
        } else {
          bindVariables.menus += '(?, ?, ?), '; // 입력하려는 컬럼 수와 같아야 함.
        }
      });
      queryString.menus = `insert into menus (cafe_id, name, price) values ${bindVariables01}`;
      // [[1, "아메리카노", 2500],[1, "카페라떼", 3000]] => [1, "아메리카노", 2500, 1, "카페라떼", 3000]
      queryParams.menus = queryParams.menus.flat();
      printSqlLog(queryString.menus, queryParams.menus);
      resultObj.menus = await connection.execute(queryString.menus, [
        ...queryParams.menus,
      ]);
      if (resultObj.menus[0].affectedRows === 0)
        throw new MySqlError('Menu info register fail');
      if (resultObj.menus[0].affectedRows === 1) {
        logger.info('successfully inserted into menus table');
      }

      operating_hours.forEach((item, index) => {
        // (cafe_id, day, start_time, end_time, is_day_off)
        queryParams.operating_hours.push([
          cafeId,
          item.day,
          !item.is_day_off ? item.start_time : '0000',
          !item.is_day_off ? item.end_time : '0000',
          item.start_time ? 'N' : 'Y',
        ]);
        if (operating_hours.length === index + 1) {
          bindVariables.operating_hours += '(?, ?, ?, ?, ?)';
        } else {
          bindVariables.operating_hours += '(?, ?, ?, ?, ?), '; // 입력하려는 컬럼 수와 같아야 함.
        }
      });
      queryString.operating_hours = `insert operating_hours (cafe_id, day, start_time, end_time, is_day_off) values ${bindVariables02}`;

      queryParams.operating_hours = queryParams.operating_hours.flat();
      printSqlLog(queryString.operating_hours, queryParams.operating_hours);
      resultObj.operating_hours = await connection.execute(
        queryString.operating_hours,
        [...queryParams.operating_hours],
      );
      if (resultObj.operating_hours[0].affectedRows === 0)
        throw new MySqlError('Operating hours info register fail');
      if (resultObj.operating_hours[0].affectedRows === 1) {
        logger.info('successfully inserted into operating_hours table');
      }
      await connection.commit();

      resObj['message'] =
        'Cafe info, menus, operating-hours is successfully registered';
      // 등록 완료된 cafe 정보의 id와 함께 201 Created 응답
      res.status(successCode.CREATED).json(resObj);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };
  static updateCafeImage = async (req, res) => {
    const imagePath = req.file.path;
    const cafeId = req.params.cafeId;

    const connection = await pool.getConnection();

    try {
      const queryString = 'update cafes set image_path=? where id=?';
      const queryParams = [imagePath, cafeId];

      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      if (result[0].affectedRows === 0) {
        throw new MySqlError('Cafe image update fail');
      }
      if (result[0].affectedRows === 1) {
        logger.info(
          `[CafeId : ${cafeId}] image successfully updated where cafes table`,
        );
      }

      return res.sendStatus(successCode.OK);
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  };
  // 카페 정보(카페 이름, 전화번호, 지번 주소, 도로명 주소, 위도, 경도) 업데이트
  static updateCafeInfo = async (req, res) => {
    const reqObj = { ...req.body, cafeId: req.params.cafeId };
    const connection = await pool.getConnection();
    const {
      cafeId,
      name,
      tel,
      jibun_address,
      road_address,
      latitude,
      longitude,
    } = reqObj;
    const updated_at = printCurrentTime();

    try {
      const queryString =
        'update cafes set name=?, tel=?, jibun_address=?, road_address=?, latitude=?, longitude=?, updated_at=? where id=?';
      const queryParams = [
        name,
        tel,
        jibun_address,
        road_address,
        latitude,
        longitude,
        updated_at,
        cafeId,
      ];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);

      if (result[0].affectedRows === 0)
        throw new MySqlError('affectedRows is zero where cafes table');
      if (result[0].affectedRows === 1) {
        logger.info('successfully updated into operating_hours table');
      }
      return res.sendStatus(successCode.OK);
    } finally {
      connection.release(); // 사용한 커넥션 반환
    }
  };
  // 카페 메뉴 정보 수정 요청
  static updateMenus = async (req, res, next) => {
    const reqObj = { ...req.body, cafeId: req.params.cafeId };
    const { menus, cafeId } = reqObj;

    const connection = await pool.getConnection();
    // 트랜잭션 작업 시작
    connection.beginTransaction();
    try {
      const updated_at = printCurrentTime();
      // menus: [{name: "아메리카노", price: 2500}, {name: "카페라떼", price: 4000}]
      for (let i = 0; i < menus.length; i++) {
        const queryString = `update menus set price=?, updated_at=? where cafe_id=? and name=?`;
        const queryParams = [menus[i].price, updated_at, cafeId, menus[i].name];
        printSqlLog(queryString, queryParams);
        const result = await connection.execute(queryString, queryParams);
        if (result[0].affectedRows === 0)
          throw new MySqlError('affectedRows is zero where menus table');
        if (result[0].affectedRows === 1) {
          logger.info(
            `[CafeId: ${cafeId}, MenuName: ${menus[i].name}] is successfully updated into menus table`,
          );
        }
      }

      await connection.commit();

      return res.sendStatus(successCode.OK);
    } catch (error) {
      await connection.rollback();
      throw new MySqlError(error.message);
    } finally {
      connection.release();
    }
  };
  // 카페 운영 시간 정보 수정 요청
  static updateCafeOperHours = async (req, res) => {
    const reqObj = { ...req.body, cafeId: req.params.cafeId };
    const { operating_hours, cafeId } = reqObj;

    const connection = await pool.getConnection();

    // 트랜잭션 작업 시작
    connection.beginTransaction();
    try {
      const updated_at = printCurrentTime();

      for (let i = 0; i < operating_hours.length; i++) {
        const elem = operating_hours[i];
        const queryString =
          'update operating_hours set start_time=?, end_time=?, is_day_off=?, updated_at=? where cafe_id=? and day=?';
        const queryParams = [
          elem.start_time,
          elem.end_time,
          elem.is_day_off,
          updated_at,
          cafeId,
          elem.day,
        ];
        printSqlLog(queryString, queryParams);
        const result = await connection.execute(queryString, queryParams);
        if (result[0].affectedRows === 0)
          throw new MySqlError(
            'affectedRows is zero where operating_hours table',
          );
        if (result[0].affectedRows === 1) {
          logger.info(
            `[CafeId: ${cafeId}, Day: ${elem.day}] is successfully updated into menus table`,
          );
        }
      }

      await connection.commit();

      return res.sendStatus(successCode.OK);
    } catch (error) {
      await connection.rollback();
      throw new MySqlError(error.message);
    } finally {
      connection.release();
    }
  };
  // 관리자 카페 정보 삭제 컨트롤러
  // cafe_id와 일치하는 모든 데이터(카페 정보, 메뉴, 영업시간) 삭제
  // cafe_id와 일치하는 모든 데이터 row에 deleted_at 데이터 추가
  static deleteCafeInfo = async (req, res) => {
    const cafeId = req.params.cafeId;
    const queryString = {
      cafeInfo: 'update cafes set deleted_at=? where id=?',
      menus: 'update menus set deleted_at=? where cafe_id=?',
      operating_hours:
        'update operating_hours set deleted_at=? where cafe_id=?',
    };
    const deleted_at = printCurrentTime();
    const queryParams = [deleted_at, cafeId];
    const resultObj = {
      cafeInfo: {},
      menus: {},
      operating_hours: {},
    };

    const connection = await pool.getConnection();
    // 트랜잭션 작업 시작
    connection.beginTransaction();

    try {
      // cafes 테이블 접근
      resultObj.cafeInfo = await connection.execute(
        queryString.cafeInfo,
        queryParams,
      );
      if (resultObj.cafeInfo[0].affectedRows === 0) {
        throw new MySqlError('affectedRows is zero where cafes table');
      }
      if (resultObj.cafeInfo[0].affectedRows === 1) {
        logger.info('successfully deleted where cafes table');
      }
      // menus 테이블 접근
      resultObj.menus = await connection.execute(
        queryString.menus,
        queryParams,
      );
      if (resultObj.menus[0].affectedRows === 0) {
        throw new MySqlError('affectedRows is zero where menus table');
      }
      if (resultObj.menus[0].affectedRows === 1) {
        logger.info('successfully deleted where menus table');
      }
      // operating_hours 테이블 접근
      resultObj.operating_hours = await connection.execute(
        queryString.operating_hours,
        queryParams,
      );
      if (resultObj.operating_hours[0].affectedRows === 0) {
        throw new MySqlError(
          'affectedRows is zero where operating_hours table',
        );
      }
      if (resultObj.operating_hours[0].affectedRows === 1) {
        logger.info('successfully deleted where operating_hours table');
      }

      await connection.commit();
      return res.sendStatus(successCode.OK);
    } catch (error) {
      await connection.rollback();
      throw MySqlError(error.message);
    } finally {
      connection.release();
    }
  };
}

module.exports = AdminController;
