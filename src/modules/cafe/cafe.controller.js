const axios = require('axios');
const fs = require('fs');
const {
  convertLocationData,
  printSqlLog,
  printCurrentTime,
} = require('../../common/utils/util');
const CafeService = require('./cafe.service');
const {
  successCode,
  errorCode,
} = require('../../common/statusCodes/statusCode');
const logger = require('../../config/logger');
const pool = require('../../config/mysql');
const NotFoundError = require('../../common/errors/not-found.error');
const MySqlError = require('../../common/errors/mysql.error');
const ClientError = require('../../common/errors/client.error.js');
const InternalServerError = require('../../common/errors/internal-sever.error');
const config = require('../../config/config');

class CafeController {
  // 페이지 별 카페 데이터 조회
  static getCafeDataByPage = async (req, res, next) => {
    const currentPage = req.query.page.trim(); // 현재 페이지
    const countPage = 10; // 요청 한 번 당 보여줄 카페 정보 수

    const result = await CafeService.getCafeList(currentPage, countPage);
    if (result === 404) return next(new NotFoundError('Cafe data not found'));
    return res.status(successCode.OK).json(result);
  };
  // 오픈 API 호출해서 데이터 가져와 가공 후 응답으로 전달
  static getDataFromPublicAPI = async (req, res, next) => {
    try {
      const apiKey = config.openApiKey;
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
        '/Users/a1234/Desktop/3기_AdapterZ_풀스택/backend-server-for-local/public/cafe_info_in_seoul';
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
      const response = await CafeService.saveDataFromPublicApi(cafeData);
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
    let { name, city, gu, dong, page } = req.query;
    const currentPage = page.trim(); // 현재 페이지
    const countPage = 10; // 요청 한 번 당 보여줄 카페 정보 수
    let result;

    if (name) {
      result = await CafeService.getCafeListByName(
        currentPage,
        countPage,
        name.trim(),
      );
    } else if (city && gu && dong) {
      result = await CafeService.getCafeListByAddress(currentPage, countPage, {
        gu: gu.trim(),
        dong: dong.trim(),
      });
    }

    if (result === 404) return next(new NotFoundError('Cafe data not found'));
    return res.status(successCode.OK).json(result);
  };

  // 리뷰 등록
  static registerReview = async (req, res, next) => {
    // 이미 req 에 대한 유효성 검증은 끝남.
    // { userId: 24, ratings: 5, comment: 분위기가 좋은 카페 }

    const reqObj = { ...req.body, ...req.params };
    // const resObj = {};
    const { cafeId, userId, ratings, comment } = reqObj;

    const connection = await pool.getConnection();
    const queryString =
      'insert reviews (user_id, cafe_id, ratings, comment) values (?,?,?,?)';
    const queryParams = [userId, cafeId, ratings, comment];

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
        // resObj['reviewId'] = reviewId;
      }
      // resObj['message'] = 'Review is successfully registered';
      // 등록 완료된 review 정보의 id와 함께 201 Created 응답
      return res.sendStatus(successCode.CREATED);
    } catch (error) {
      throw new InternalServerError(error.message);
    } finally {
      connection.release();
    }
  };
  // 리뷰 수정
  static updateReview = async (req, res, next) => {
    const reqObj = { ...req.body, ...req.params };
    let { ratings, comment, cafeId, reviewId } = reqObj;
    // req.params 로 전달되는 숫자는 string으로 전달되므로 number 로 형식 변환
    reviewId = parseInt(reviewId, 10);
    cafeId = parseInt(cafeId, 10);

    const connection = await pool.getConnection();

    try {
      const updated_at = printCurrentTime();
      const queryString =
        'update reviews set ratings=?, comment=?, updated_at=? where id=? and cafe_id=?';
      const queryParams = [ratings, comment, updated_at, reviewId, cafeId];
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
      // inner join
      const queryString =
        'select r.id, r.user_id, r.ratings, r.comment, r.created_at, r.updated_at, u.name, u.profile_image_path from reviews as r join users as u on r.cafe_id = ? and r.deleted_at is null and r.user_id = u.id';
      const queryParams = [cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const reviewCount = result[0].length;
      if (reviewCount < 1) {
        // FIXME 200 OK { message: 'REVIEW_DATA_NOT_FOUND" }
        resObj.message = 'CAFE_REVIEW_DATA_NOT_EXIST';
      } else {
        logger.info(`[CafeId: ${cafeId}] ${reviewCount} reviews exist`);
        resObj.reviewCount = reviewCount;
        resObj.reviews = result[0];
      }
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (error) {
      throw new InternalServerError(error.message);
    }
  };
  // 카페 별 평균 평점 조회
  static getCafeAverageRatings = async (req, res) => {
    const reqObj = { ...req.params };
    const resObj = {};
    const { cafeId } = reqObj;

    const connection = await pool.getConnection();
    try {
      const queryString =
        'select avg(ratings) from reviews where cafe_id = ? and deleted_at is null';
      const queryParams = [cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      console.log('result: ', result[0].length < 1);
      if (result[0].length < 1) {
        resObj.message = 'CAFE_RATINGS_NOT_EXIST';
      } else {
        const avgRatings = result[0][0]['avg(ratings)'];
        resObj.avgRatings = avgRatings;
      }
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (error) {
      throw new InternalServerError(error.message);
    }
  };
  // 카페 별 사용자 좋아요 조회
  static getCafeLike = async (req, res) => {
    const reqObj = { ...req.params };
    const resObj = {};
    let { userId, cafeId } = reqObj;

    // req.params 의 데이터는 string 이므로 숫자로 변환해줘야 함.
    cafeId = parseInt(cafeId, 10);
    userId = parseInt(userId, 10);

    const connection = await pool.getConnection();
    try {
      const queryString =
        'select count(0) from likes where user_id = ? and cafe_id = ? and deleted_at is null';
      const queryParams = [userId, cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      if (result[0][0]['count(0)'] < 1) {
        resObj.message = 'USER_DISLIKE_CAFE';
      } else {
        logger.info('USER LIKE THIS CAFE');
        resObj.message = 'USER_LIKE_CAFE';
      }
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      throw new InternalServerError(err.message);
    }
  };
  // 카페 좋아요 활성화
  static likeCafe = async (req, res, next) => {
    const reqObj = { ...req.params };
    let { cafeId } = reqObj;

    // req.params 의 데이터는 string 이므로 숫자로 변환해줘야 함.
    cafeId = parseInt(cafeId, 10);

    const userId = req.session.userid;
    const connection = await pool.getConnection();
    try {
      const queryString = 'insert likes (user_id, cafe_id) values (?,?)';
      const queryParams = [userId, cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      if (result[0].affectedRows === 0) {
        // FIXME 서버 에러임
        return next(new NotFoundError('User like is not activated'));
      }
      if (result[0].affectedRows === 1) {
        logger.info(`[userId ${userId}'s like is inserted where likes table`);
      }
      // 커넥션이 pool로 돌아갈 수 있도록 해줌.
      connection.release();
      return res.sendStatus(successCode.CREATED);
    } catch (error) {
      throw error;
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
      // 커넥션이 pool로 돌아갈 수 있도록 해줌.
      connection.release();
      return res.sendStatus(successCode.NOCONTENT);
    } catch (error) {
      throw new InternalServerError(error.message);
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
        'select count(0) from likes where cafe_id = ? and deleted_at is null';
      const queryParams = [cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.execute(queryString, queryParams);
      const likeCount = result[0][0]['count(0)'];

      if (likeCount < 1) {
        resObj.message = 'CAFE_LIKE_COUNT_ZERO';
      }
      logger.info(`[CafeId: ${cafeId}] ${likeCount} likes exist`);
      resObj.likeCount = likeCount;
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (error) {
      throw new InternalServerError(error.message);
    }
  };

  // 요청 URL의 Parameter로 들어온 id 값을 기준으로 카페 정보 조회
  static getCafeInfoById = async (req, res) => {
    const reqObj = { ...req.params };
    const { cafeId } = reqObj;

    const result = await CafeService.getCafeDetailById(cafeId);
    if (result === 404) next(new InternalServerError('Cafe Info Not Found'));

    const resObj = CafeService.makeCafeDetailRes(result);
    return res.status(successCode.OK).json(resObj);
  };
  // 카페 별 조회 수 조회
  static getCafeViewCount = async (req, res) => {
    const reqObj = { ...req.params };
    const resObj = {};

    let { cafeId } = reqObj;
    cafeId = parseInt(cafeId, 10);

    const connection = await pool.getConnection();

    try {
      const queryString = 'select views from cafes where id = ?';
      const queryParams = [cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const cafeInfo = result[0][0];
      console.log('cafeInfo: ', cafeInfo);

      resObj.views = cafeInfo.views;
      connection.release();
      return res.status(successCode.OK).json(resObj);
    } catch (err) {
      logger.info(err.message);
      throw new InternalServerError(err.message);
    }
  };

  // 카페 별 조회 수 조회
  static increaseCafeViewCount = async (req, res) => {
    const reqObj = { ...req.params, ...req.body };
    const resObj = {};

    let { cafeId, views } = reqObj;
    cafeId = parseInt(cafeId, 10);

    // 조회 수 증가
    const viewCount = views + 1;

    const connection = await pool.getConnection();

    try {
      const queryString = 'update cafes set views = ? where id = ?';
      const queryParams = [viewCount, cafeId];
      printSqlLog(queryString, queryParams);
      const result = await connection.query(queryString, queryParams);
      const isCafeViewCountUpdated = result[0].affectedRows > 0;

      connection.release();
      if (isCafeViewCountUpdated) {
        resObj.viewCount = viewCount;
        return res.status(successCode.OK).json(resObj);
      }
    } catch (err) {
      logger.info(err.message);
      throw new InternalServerError(err.message);
    }
  };
}

module.exports = CafeController;
