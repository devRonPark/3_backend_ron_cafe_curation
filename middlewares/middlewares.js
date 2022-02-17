const User = require('../models/user');
const { errorCode } = require('../statusCode');

// 로그인 여부 판단
exports.isLoggedIn = function (req, res, next) {
  // 로그인하지 않은 경우
  if (!req.session.userid) {
    return res
      .status(errCode.UNAUTHORIZED)
      .json({ message: 'PLEASE_LOGIN_FIRST' });
  }
  // 현재 로그인한 상태라면
  next();
};
// 로그인하지 않았는지
exports.isNotLoggedIn = function (req, res, next) {
  // 로그인하지 않은 경우
  if (req.session.userid) {
    return res.status(errCode.FORBIDDEN).json({ message: 'ALREADY_LOGGED_IN' });
  }
  // 현재 로그인 안 한 상태라면(로그인 페이지, 회원가입 페이지 접근 가능)
  next();
};
// 접근 가능 여부 판단
exports.hasNoPermission = function (req, res, next) {
  // 사용자가 로그인 시
  if (req.session.userid && req.session.role === 'user') {
    return res.status(errCode.FORBIDDEN).json({ message: 'NO_PERMISSION' });
  }
  // 관리자 로그인 시
  next();
};
// 로그인 안 한 상태인지 체크
exports.isNotAuthorized = function (req, res, next) {
  // session 객체가 존재하지 않으면,
  if (!req.session) return res.send(err);

  // 현재 로그인한 상태라면,
  if (req.session && req.session.userid) {
    return res.sendStatus(errorCode.FORBIDDEN);
  }
  // userid 가 없을 경우에만 다음 미들웨어 실행
  next();
};
// 클라이언트에 저장된 세션 ID 로 사용자 정보 불러오기
exports.loadUserData = function () {
  return async function (req, res, next) {
    try {
      // 로그인한 사용자가 존재한다면,
      if (req.session.userid) {
        const response = await User.findById({ id: req.session.userid });
        const userInfo = response.data[0];

        if (!userInfo) {
          return next(new Error('User_Not_Found'));
        }
        // req 객체에 userInfo 추가
        req.userInfo = userInfo;
        next();
      } else {
        // 로그인한 사용자가 존재하지 않는다면,
        next();
      }
    } catch (err) {
      next(err);
    }
  };
};
// req 객체에 logout 메소드 추가
exports.addLogout = function () {
  return function (req, res, next) {
    req.logout = function () {
      req.session.destroy(); // 세션 삭제
    };

    next();
  };
};
// 8글자의 패스워드 랜덤 생성
exports.generateRandomPassword = () => {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz!@#$%^&*';
  const stringLength = 8;

  var randomString = '';
  for (let i = 0; i < stringLength; i++) {
    let randomNum = Math.floor(Math.random() * chars.length);
    randomString += chars.substring(randomNum, randomNum + 1);
  }

  return randomString;
};
// 관리자 API 에서 어떤 데이터인지 검사하고 req.body에 tblName 값을 저장해주는 미들웨어
exports.isWhichTblData = function (req, res, next) {
  const { tel, image_path, menus, operating_hours } = req.body.data;
  if (tel || image_path) {
    req.body.tblName = 'user_edit_cafes';
  } else if (menus) {
    req.body.tblName = 'menus';
  } else if (operating_hours) {
    req.body.tblName = 'operating_hours';
  } else {
    return res.status(errorCode.BADREQUEST).json({ message: 'NO_DATA_EXISTS' });
  }
  next();
};
