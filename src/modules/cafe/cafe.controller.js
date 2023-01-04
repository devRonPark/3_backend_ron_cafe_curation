const { printSqlLog, printCurrentTime } = require('../../common/utils/util');
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
const { errorMsgKor } = require('../../common/constants');

class CafeController {
  // 페이지 별 카페 데이터 조회
  static getCafeDataByPage = async (req, res, next) => {
    const result = await CafeService.getCafeList(req.query.page.trim(), 10);
    if (result === 404) return next(new NotFoundError(errorMsgKor.NOT_FOUND));
    else if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));
    return res.status(successCode.OK).json(result);
  };
  // 쿼리로 들어오는 검색 조건 값 검증
  // req.query.name | req.query.city, req.query.gu, req.query.dong
  static getCafeDataBySearch = async (req, res, next) => {
    let { name, city, gu, dong, page } = req.query;
    const currentPage = page.trim(); // 현재 페이지
    const countPage = 10; // 요청 한 번 당 보여줄 카페 정보 수
    let result;

    // 검색 옵션에 따라 실행되는 서비스 로직이 다름.
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

    if (result === 404) return next(new NotFoundError(errorMsgKor.NOT_FOUND));
    else if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));
    return res.status(successCode.OK).json(result);
  };

  // 요청 URL의 Parameter로 들어온 id 값을 기준으로 카페 정보 조회
  static getCafeInfoById = async (req, res, next) => {
    const result = await CafeService.getCafeDetailById(req.params.cafeId);
    logger.info('getCafeDetailById 결과 : ', result);
    if (result === 404) return next(new NotFoundError(errorMsgKor.NOT_FOUND));
    else if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));

    const resObj = CafeService.makeCafeDetailRes(result);
    return res.status(successCode.OK).json(resObj);
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
  // 카페 별 모든 리뷰 정보 조회
  static getCafeReviewsByCafeId = async (req, res, next) => {
    const result = await CafeService.getCafeReviewsById(
      parseInt(req.params.cafeId, 10),
    );
    if (result === 404) return res.status(successCode.OK).json({});
    else if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));
    return res.status(successCode.OK).json(result);
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

  // 카페 별 평균 평점 조회
  static getCafeAverageRatings = async (req, res, next) => {
    const result = await CafeService.getAverageRatingsById(
      parseInt(req.params.cafeId, 10),
    );
    if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));
    return res.status(successCode.OK).json({ ratings: result ?? 0 });
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
    const result = await CafeService.getLikeCountById(
      parseInt(req.params.cafeId, 10),
    );
    if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));
    const resObj = { likeCount: result ?? 0 };

    return res.status(successCode.OK).json(resObj);
  };
  // 카페 별 조회 수 조회
  static getCafeViewCount = async (req, res, next) => {
    const result = await CafeService.getViewCountById(
      parseInt(req.params.cafeId, 10),
    );
    if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));

    return res.status(successCode.OK).json(result);
  };

  // 카페 별 조회 수 조회
  static increaseCafeViewCount = async (req, res, next) => {
    const result = await CafeService.increaseViewCountById(
      parseInt(req.params.cafeId, 10),
      req.body.viewCount,
    );
    if (result === 500)
      return next(new InternalServerError(errorMsgKor.INTERNAL_SERVER_ERROR));
    const resObj = { viewCount: result };
    return res.status(successCode.OK).json(resObj);
  };
}

module.exports = CafeController;
