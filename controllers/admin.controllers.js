const Cafe = require('../models/cafe');
const { successCode, errorCode } = require('../statusCode');
const logger = require('../config/logger');
const Admin = require('../models/admin');

exports.getCafeDataIsAlreadyApproved = async function (req, res) {
  try {
    logger.info('관리자 승인이 완료된 카페 데이터 불러오는 중...');
    const response = await Cafe.findCafeDataByStatus({ status: 'RA' }); // 'RA' => 등록 완료
    logger.info('관리자 승인이 완료된 카페 데이터 조회 완료');
    return res.status(successCode.OK).json(response);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 현재 관리자의 승인 요청 대기 중(status = 'N')인 카페 데이터 가져오기
exports.getCafeDataIsWaitingPosted = async function (req, res) {
  try {
    logger.info('현재 승인 요청 대기 중인 카페 데이터 불러오는 중...');
    const response = await Cafe.findCafeDataByStatus({ status: 'RR' }); // 'RR' => 등록 요청
    logger.info('현재 승인 요청 대기 중인 카페 데이터 조회 완료');
    return res.status(successCode.OK).json(response);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};

// 현재 관리자의 삭제 요청 대기 중(status = 'D')인 카페 데이터 가져오기
exports.getCafeDataIsWaitingDeleted = async function (req, res) {
  try {
    logger.info('현재 삭제 요청 대기 중인 카페 데이터 불러오는 중...');
    const response = await Cafe.findCafeDataByStatus({ status: 'DR' }); // 'DR' => 삭제 요청
    logger.info('현재 삭제 요청 대기 중인 카페 데이터 조회 완료');
    return res.status(successCode.OK).json(response);
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 관리자가 정보 등록, 수정 승인 여부 결정
// 전달 가능한 데이터 : user_edit_cafes 테이블의 tel, image_path | menus 테이블의 name, price | operating_hours 테이블의 day, is_day_off, start_time, end_time
// 클라이언트의 바디 데이터 전달 형태 :
// { "data": { "register": true || false, "user_id": 24, menus: [], is_day_off: []}}
exports.isRegisteredOrNot = async function (req, res) {
  try {
    const { id } = req.params;
    const { tblName, data } = req.body;
    // register: 관리자의 등록 승인 여부, created_at: 등록 요청 데이터의 식별자 역할
    const { register, user_id, created_at } = data;
    if (register) {
      // set status to 'RA'
      // menus 테이블의 데이터 status 를 'RA'로
      // 클라이언트로부터 전달받은 데이터를 menus 테이블에서 조회할 때 어떤 기준으로 빠르게 찾아낼 수 있을까?
      // menus 테이블에 user_id 칼럼을 추가하여 외래키로 지정 후 클라이언트로부터 데이터를 전달받을 때 user_id 를 포함하도록 한다.
      // operating_hours 테이블의 데이터 status 를 'RA'로
      // operating_hours 테이블에도 user_id 칼럼 추가
      const data = { user_id, cafe_id: id, created_at, tblName };
      const response = await Admin.approveUserRequest(data);
      return res.status(successCode.OK).json({ message: 'REGISTER_APPROVED' });
    }
    return res.status(successCode).json({ message: 'REGISTER_REJECTED' });
  } catch (err) {
    logger.error(err.stack);
    return res
      .status(errorCode.INTERNALSERVERERROR)
      .json({ message: err.message });
  }
};
// 관리자가 정보 등록, 수정 승인 여부 결정
// exports.isDeletedOrNot = async function (req, res) {
//   try {
//     const { id } = req.params;
//     // register: 관리자의 등록 승인 여부, created_at: 등록 요청 데이터의 식별자 역할
//     const { register, user_id, created_at } = data;
//   } catch (err) {
//     logger.error(err.stack);
//     return res
//       .status(errorCode.INTERNALSERVERERROR)
//       .json({ message: err.message });
//   }
// };
