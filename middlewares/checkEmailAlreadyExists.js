const User = require('../models/user');

exports.checkEmailAlreadyExists = (req, res, next) => {
  const { email } = req.body;
  // 데이터베이스 상 이메일 중복 확인
  User.findByEmail(email, function (err, user) {
    // 데이터베이스 오류 감지
    if (err) next(err);
    // 사용자가 이미 존재하는 경우 오류 감지
    if (user.length) {
      const error = new Error('이미 해당 계정으로 가입한 사용자가 존재합니다.');
      error.name = 'AlreadyUserError';
      next(error);
    }
    next();
  });
};
