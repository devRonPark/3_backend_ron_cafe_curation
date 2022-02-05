const User = require('../models/user');

// 로그인한 상태인지 체크
exports.isAuthenticated = function (req, res, next) {
  // session 객체가 존재하지 않으면,
  if (!req.session) return res.send(err);

  // 현재 로그인한 상태가 아니라면,
  if (req.session && !req.session.userid) {
    console.log('현재 로그인한 사용자가 없음!');
    // 상태 코드 403: Forbidden
    return res.status(403).json({ isLoggedIn: false });
  }
  // userid 가 있을 경우에만 다음 미들웨어 실행
  next();
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
  return function (req, res, next) {
    try {
      // 로그인한 사용자가 존재한다면,
      if (req.session.userid) {
        User.findById(req.session.userid, function (err, user) {
          if (err) return res.send(err);
          userInfo = JSON.parse(JSON.stringify(user[0]));
          // user 가 존재하지 않으면
          if (!userInfo) {
            return res.status(404).json({
              success: false,
              message: '제공된 이메일에 해당하는 사용자가 없습니다.',
            });
          }

          req.userInfo = userInfo;
          next();
        });
      }
      // 로그인한 사용자가 존재하지 않는다면,
      next();
    } catch (err) {
      next(err);
    }
  };
};
exports.addLogout = function () {
  return function (req, res, next) {
    req.logout = function () {
      req.session.destroy();
    };

    next();
  };
};
