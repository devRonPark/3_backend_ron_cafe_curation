const User = require('../models/user');

// 로그인한 상태인지 체크
exports.isAuthorized = function (req, res, next) {
  // 현재 로그인한 상태가 아니라면,
  if (req.session && !req.session.userid) {
    console.log('현재 로그인한 사용자가 없음!');
    // 상태 코드 401: Unauthorized
    return res.status(401).json({ isLoggedIn: false });
  } else {
    // userid 가 있을 경우에만 다음 미들웨어 실행
    next();
  }
};
// 로그인 안 한 상태인지 체크
exports.isNotAuthenticated = function (req, res, next) {
  console.log(req.session, req.session.userid);
  // session 객체가 존재하지 않으면,
  if (!req.session) return res.send(err);

  // 현재 로그인한 상태라면,
  if (req.session && req.session.userid) {
    console.log('현재 로그인한 사용자 존재함!');
    // 상태 코드 403: Forbidden
    return res.status(403).json({ isLoggedIn: true });
  }
  // userid 가 없을 경우에만 다음 미들웨어 실행
  next();
};
// 클라이언트에 저장된 세션 ID 로 사용자 정보 불러오기
exports.loadUserData = function () {
  return async function (req, res, next) {
    try {
      console.log('req.session.userid: ', req.session.userid);
      // 로그인한 사용자가 존재한다면,
      if (req.session.userid) {
        const response = await User.findById({ id: req.session.userid });
        const userInfo = response.data[0];
        console.log('userInfo: ', userInfo);

        if (!userInfo) {
          return next(new Error('제공된 이메일에 해당하는 사용자가 없습니다.'));
        }

        req.userInfo = userInfo;
        next();
      } else {
        // 로그인한 사용자가 존재하지 않는다면,
        console.log('login user does not exist');
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
      req.session.destroy();
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
