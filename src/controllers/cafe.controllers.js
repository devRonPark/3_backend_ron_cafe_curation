const axios = require('axios');
const fs = require('fs');
const {
  convertLocationData,
  printSqlLog,
  printCurrentTime,
} = require('../lib/util');
const Cafe = require('../models/cafe');
const { successCode, errorCode } = require('../lib/statusCodes/statusCode');
const logger = require('../config/logger');
const pool = require('../config/mysql');
const NotFoundError = require('../lib/errors/not-found.error');
const MySqlError = require('../lib/errors/mysql.error');
const ClientError = require('../lib/errors/client.error.js');
const InternalServerError = require('../lib/errors/internal-sever.error');

class CafeController {
  // 페이지 별 카페 데이터 조회
  static getCafeDataByPage = async function (req, res, next) {
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
      console.log(error);
      await connection.rollback();
      throw new MySqlError(error.message);
    } finally {
      connection.release();
    }
  };
  // 오픈 API 호출해서 데이터 가져와 가공 후 응답으로 전달
  static getDataFromPublicAPI = async (req, res, next) => {
    try {
      const apiKey = process.env.OPEN_API_KEY;
      const absoluteBasePath =
        'C:\\Users\\User\\Documents\\3기_풀스택 교육_AdapterZ_\\3_backend_ron_cafe_curation\\public\\cafe_info_in_seoul';
      const cafeData = [];
      let startIndex = 1,
        endIndex = 999;
      // 오픈 API 115번 호출
      while (endIndex < 114885) {
        try {
          const response = await axios({
            method: 'get',
            url: `/json/LOCALDATA_072405/${startIndex}/${endIndex}`, // 요청에 사용될 서버 URL
            baseURL: `http://openapi.seoul.go.kr:8088/${apiKey}`, // URL 앞에 붙는다.
            responseType: 'json',
          });
          const cafeInfo = getDataFromResponse(response);
          cafeData.push(...cafeInfo);
        } catch (err) {
          console.error(err.stack);
        }
        startIndex += 999;
        endIndex += 999;
      }
      // 오픈 API 116번째 호출
      const lastResponse = await axios({
        method: 'get',
        url: `/json/LOCALDATA_072405/114885/115827`, // 요청에 사용될 서버 URL
        baseURL: `http://openapi.seoul.go.kr:8088/${apiKey}`, // URL 앞에 붙는다.
        responseType: 'json',
      });
      const cafeInfo = getDataFromResponse(lastResponse);
      cafeData.push(...cafeInfo);
      // JSON 형식으로 변환
      const cafeDataJson = JSON.stringify(cafeData);
      // 가공된 cafeData 현재 디렉토리에 JSON 파일로 저장
      fs.writeFileSync(`${absoluteBasePath}/cafe_data.json`, cafeDataJson);
      return res.status(successCode.OK).json({ data: cafeData });
    } catch (error) {
      console.error(error);
      return res
        .status(errorCode.INTERNALSERVERERROR)
        .json({ message: error.message });
    }
  };
  static getDataFromResponse = response => {
    return response.data['LOCALDATA_072405'].row
      .filter(elem => elem.UPTAENM === '커피숍' && elem.TRDSTATENM !== '폐업')
      .map(elem => {
        return {
          name: elem.BPLCNM,
          tel: elem.SITETEL,
          jibun_address: elem.SITEWHLADDR,
          road_address: elem.RDNWHLADDR,
          xCoordinate: elem.X,
          yCoordinate: elem.Y,
        };
      });
  };
  // public/cafe_info_in_seoul 디렉토리에 저장된 파일 읽어와 데이터 가공 후 req 객체에 저장
  static parseCafeDataRun = (req, res, next) => {
    try {
      const cafeData = [];
      const absoluteBasePath =
        'C:\\Users\\User\\Documents\\3기_풀스택 교육_AdapterZ_\\3_backend_ron_cafe_curation\\public\\cafe_info_in_seoul';
      // JSON 파일 읽어오기
      let rawData = fs.readFileSync(`${absoluteBasePath}/cafe_data.json`);
      // JSON => 객체로 데이터 파싱
      let parsedData = JSON.parse(rawData);
      parsedData.forEach(cafeData => {
        const { xCoordinate, yCoordinate } = cafeData;
        // x좌표, y좌표 값이 존재한다면
        if (xCoordinate && yCoordinate) {
          // X,Y 좌표를 위도, 경도로 변환
          const { latitude, longitude } = convertLocationData({
            // x좌표, y좌표 숫자로 변환
            x: +xCoordinate,
            y: +yCoordinate,
          });
          cafeData.latitude = latitude;
          cafeData.longitude = longitude;
          return; // 다음 요소로 넘어감.
        }
        cafeData.latitude = null;
        cafeData.longitude = null;
      });
      cafeData.push(...parsedData);
      req.cafeData = cafeData;
      next();
    } catch (err) {
      logger.error(err.stack);
      return res
        .status(errorCode.INTERNALSERVERERROR)
        .json({ message: err.message });
    }
  };
  // req 객체에 저장된 데이터 DB에 저장
  static saveDataToDb = async (req, res, next) => {
    try {
      const { cafeData } = req;
      const response = await Cafe.saveDataFromPublicApi(cafeData);
      logger.info('response: ', response);
      return res.sendStatus(successCode.CREATED);
    } catch (err) {
      logger.error(err.stack);
      return res
        .status(errorCode.INTERNALSERVERERROR)
        .json({ message: err.message });
    }
  };
  // 쿼리로 들어오는 검색 조건 값 검증
  // req.query.name | req.query.city, req.query.gu, req.query.dong
  static getCafeDataBySearch = async (req, res, next) => {
    let { name, city, gu, dong } = req.query;
    let queryString, queryParams, result;
    const connection = await pool.getConnection();

    try {
      // req.query.name 검증
      if (name) {
        name = name.trim(); // 앞뒤 공백 제거
        console.log('name: ', name);

        // 특정 문자가 포함되어 있는 데이터 검색 시 LIKE 연산자 사용
        queryString =
          'select id, name, jibun_address, image_path from cafes where name LIKE ?';
        queryParams = `%${name}%`;
        printSqlLog(queryString, queryParams);
        result = await connection.query(queryString, queryParams);
        if (result[0].length < 1) {
          return next(new NotFoundError('Cafe data not found'));
        }
        logger.info(`${result[0].length} cafe data is successfully searched.`);
        return res.status(successCode.OK).json({ data: result[0] });
      }

      if (city && gu && dong) {
        city = city.trim(); // 앞뒤 공백 제거
        gu = gu.trim(); // 앞뒤 공백 제거
        dong = dong.trim(); // 앞뒤 공백 제거

        // 특정 문자가 포함되어 있는 데이터 검색 시 LIKE 연산자 사용
        queryString =
          'select id, name, jibun_address, image_path from cafes where jibun_address LIKE ?';
        queryParams = `%${city} ${gu} ${dong}%`;
        printSqlLog(queryString, queryParams);
        result = await connection.query(queryString, queryParams);
        if (result[0].length < 1) {
          return next(new NotFoundError('Cafe data not found'));
        }
        logger.info(`${result[0].length} cafe data is successfully searched.`);
        return res.status(successCode.OK).json({ data: result[0] });
      }
    } catch (error) {
      throw new InternalServerError(error.message);
    } finally {
      connection.release();
    }
  };
  // 리뷰 등록
  static registerReview = async (req, res, next) => {
    // 이미 req 에 대한 유효성 검증은 끝남.
    // { userId: 24, mood: 5, light: 4, price: 3, taste: 5, comment: 분위기가 좋은 카페 }

    const reqObj = { ...req.body, ...req.params };
    const resObj = {};
    const { cafeId, userId, mood, light, price, taste, comment } = reqObj;

    const connection = await pool.getConnection();
    const queryString =
      'insert reviews (user_id, cafe_id, mood, light, price, taste, comment) values (?,?,?,?,?,?,?)';
    const queryParams = [userId, cafeId, mood, light, price, taste, comment];

    try {
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      // TODO DatabaseError 클래스 만들기
      if (result[0].affectedRows === 0)
        return next(new ClientError('Review data is not registered'));
      // reviews 테이블에 생성된 row 의 id
      const reviewId = result[0].insertId;
      // cafes 테이블에 성공적으로 정보 등록이 완료된다면,
      if (result[0].affectedRows === 1) {
        logger.info('successfully inserted into reviews table');
        logger.info(`registered reviewId: ${reviewId}`);
        // 응답 객체에 생성된 cafeId 추가
        resObj['reviewId'] = reviewId;
      }
      resObj['message'] = 'Review is successfully registered';
      // 등록 완료된 review 정보의 id와 함께 201 Created 응답
      res.status(successCode.CREATED).json(resObj);
    } catch (error) {
      throw new InternalServerError(error.message);
    } finally {
      connection.release();
    }
  };
  // 리뷰 수정
  static updateReview = async (req, res, next) => {
    const reqObj = { ...req.body, ...req.params };
    let { mood, light, price, taste, comment, cafeId, reviewId } = reqObj;
    // req.params 로 전달되는 숫자는 string으로 전달되므로 number 로 형식 변환
    reviewId = parseInt(reviewId, 10);
    cafeId = parseInt(cafeId, 10);

    const connection = await pool.getConnection();

    try {
      const updated_at = printCurrentTime();
      const queryString =
        'update reviews set mood=?, light=?, price=?, taste=?, comment=?, updated_at=? where id=? and cafe_id=?';
      const queryParams = [
        mood,
        light,
        price,
        taste,
        comment,
        updated_at,
        reviewId,
        cafeId,
      ];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);

      if (result[0].affectedRows === 0)
        next(new NotFoundError('Review data does not exist'));
      if (result[0].affectedRows === 1) {
        logger.info('successfully updated into reviews table');
      }
      return res.sendStatus(successCode.OK);
    } catch (error) {
      throw new InternalServerError(error.message);
    } finally {
      connection.release();
    }
  };
  // 리뷰 삭제
  static deleteReview = async (req, res, next) => {
    const reqObj = { ...req.params };
    let { cafeId, reviewId } = reqObj;
    // req.params 로 전달되는 숫자는 string으로 전달되므로 number 로 형식 변환
    cafeId = parseInt(cafeId, 10);
    reviewId = parseInt(reviewId, 10);

    const connection = await pool.getConnection();

    try {
      const deleted_at = printCurrentTime();
      const queryString =
        'update reviews set deleted_at=? where id=? and cafe_id=? and deleted_at is null';
      const queryParams = [deleted_at, reviewId, cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      if (result[0].affectedRows === 0) {
        return next(new MySqlError('affectedRows is zero where reviews table'));
      }
      if (result[0].affectedRows === 1) {
        logger.info('successfully deleted where reviews table');
      }
      return res.sendStatus(successCode.OK);
    } catch (error) {
      throw new InternalServerError(error.message);
    } finally {
      connection.release();
    }
  };
  // 카페 별 모든 리뷰 정보 조회
  static getCafeReviewsByCafeId = async (req, res, next) => {
    const reqObj = { ...req.params };
    const resObj = {};
    let { cafeId } = reqObj;
    // req.params 의 데이터는 string이므로 숫자로 변환해야 함
    cafeId = parseInt(cafeId, 10);
    const connection = await pool.getConnection();

    try {
      const queryString =
        'select mood, light, price, taste, comment from reviews where cafe_id = ? and deleted_at is null';
      const queryParams = [cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const reviewCount = result[0].length;
      if (reviewCount < 1) {
        return next(
          new NotFoundError(`[CafeId: ${cafeId}] Review does not exist`),
        );
      }
      logger.info(`[CafeId: ${cafeId}] ${reviewCount} reviews exist`);
      resObj.reviewCount = reviewCount;
      resObj.reviews = result[0];
      return res.status(successCode.OK).json(resObj);
    } catch (error) {
      throw new MySqlError(error.message);
    } finally {
      connection.release();
    }
  };
  // 카페 좋아요 활성화
  static likeCafe = async (req, res, next) => {
    const reqObj = { ...req.body, ...req.params };
    const { cafeId, userId } = reqObj;

    const connection = await pool.getConnection();
    try {
      const queryString = 'insert likes (user_id, cafe_id) values (?,?)';
      const queryParams = [userId, cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      if (result[0].affectedRows === 0) {
        return next(new NotFoundError('User like is not activated'));
      }
      if (result[0].affectedRows === 1) {
        logger.info(`[userId ${userId}'s like is inserted where likes table`);
      }
      return res.sendStatus(successCode.CREATED);
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  };
  // 카페 좋아요 해제
  static disableCafeLike = async (req, res, next) => {
    const reqObj = { ...req.params };
    let { cafeId, userId } = reqObj;

    // req.params 의 데이터는 string 이므로 숫자로 변환해줘야 함.
    cafeId = parseInt(cafeId, 10);
    userId = parseInt(userId, 10);

    const connection = await pool.getConnection();
    try {
      const deleted_at = printCurrentTime();
      const queryString =
        'update likes set deleted_at = ? where cafe_id = ? and user_id = ? and deleted_at is null';
      const queryParams = [deleted_at, cafeId, userId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      if (result[0].affectedRows === 0) {
        return next(
          new NotFoundError('User like does not exist so cannot disable.'),
        );
      }
      if (result[0].affectedRows === 1) {
        logger.info(`[userId ${userId}'s like is disabled from now on`);
      }
      return res.sendStatus(successCode.OK);
    } catch (error) {
      throw new InternalServerError(error.message);
    } finally {
      connection.release();
    }
  };
  // 카페 별 좋아요 수 조회
  static getCafeLikeCount = async (req, res, next) => {
    const reqObj = { ...req.params };
    const resObj = {};
    const { cafeId } = reqObj;

    const connection = await pool.getConnection();
    try {
      const queryString =
        'select count(0) from likes where cafe_id=? and deleted_at is null';
      const queryParams = [cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      if (result[0].length < 1) {
        throw NotFoundError(
          `Like data about [cafeId: ${cafeId}] does not exist`,
        );
      }
      const reviewCount = result[0]['count(0)'];
      logger.info(`[CafeId: ${cafeId}] ${reviewCount} reviews exist`);
      resObj.reviewCount = reviewCount;
      return res.status(successCode.OK).json(resObj);
    } catch (error) {
      throw new MySqlError(error.message);
    } finally {
      connection.release();
    }
  };

  // 요청 URL의 Parameter로 들어온 id 값을 기준으로 카페 정보 조회
  static getCafeInfoById = async function (req, res) {
    const reqObj = { ...req.params };
    const resObj = {};
    const { cafeId } = reqObj;
    const queryString = {
      cafes: 'select name, jibun_address, road_address from cafes where id=?',
      menus:
        'select name, price from menus where cafe_id=? and deleted_at is null',
      operating_hours:
        'select day, start_time, end_time, is_day_off from operating_hours where cafe_id=? and deleted_at is null',
      reviews:
        'select R.mood, R.light, R.price, R.taste, R.comment, U.profile_image_path, U.name from reviews as R inner join users as U on R.user_id = U.id where R.cafe_id = ?',
    };
    const queryParams = [cafeId];
    const connection = await pool.getConnection();
    connection.beginTransaction();

    try {
      // cafes, menus, operating_hours 테이블 조회(inner join)
      printSqlLog(queryString.cafes, queryParams);
      const resultOfCafes = await connection.query(
        queryString.cafes,
        queryParams,
      );
      if (resultOfCafes[0].length === 0) {
        throw new NotFoundError(`[CafeId ${cafeId}]Cafe info does not exist`);
      }
      logger.info(`[CafeId ${cafeId}] Cafe info exists`);
      resObj.cafeData = resultOfCafes[0];

      printSqlLog(queryString.menus, queryParams);
      const resultOfMenus = await connection.query(
        queryString.menus,
        queryParams,
      );
      if (resultOfMenus[0].length === 0) {
        throw new NotFoundError(`[CafeId ${cafeId}] Menu info does not exist`);
      }
      logger.info(`[CafeId ${cafeId}] Menu info exists`);
      resObj.menuData = resultOfMenus[0];

      printSqlLog(queryString.operating_hours, queryParams);
      const resultOfOperHours = await connection.query(
        queryString.operating_hours,
        queryParams,
      );
      if (resultOfOperHours[0].length === 0) {
        throw new NotFoundError(
          `[CafeId ${cafeId}] Operating_hours info does not exist`,
        );
      }
      logger.info(`[CafeId ${cafeId}] Opertaing_hours info exists`);
      resObj.operHoursData = resultOfOperHours[0];

      // comments, users 테이블 조회(inner join)
      printSqlLog(queryString.reviews, queryParams);
      const resultOfReviews = await connection.query(
        queryString.reviews,
        queryParams,
      );
      if (resultOfReviews[0].length === 0) {
        throw new NotFoundError(
          `[CafeId ${cafeId}] Review info does not exist`,
        );
      }
      logger.info(`[CafeId ${cafeId}] Cafe review data exist`);
      resObj.reviewData = resultOfReviews[0];

      return res.status(successCode.OK).json(resObj);
    } catch (error) {
      await connection.rollback();
      throw new MySqlError(error.message);
    } finally {
      connection.release();
    }
  };
}

module.exports = CafeController;
