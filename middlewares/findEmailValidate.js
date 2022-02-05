const { check } = require('express-validator');

// 아이디 입력했는지, 이메일 형식을 따르는지 검사
// 비밀번호 입력했는지 검사
exports.validatePhoneNumberCheck = (req, res, next) => {
  check('phone_number')
    .exists({ checkFalsy: true })
    .withMessage('휴대폰 번호를 반드시 입력해주시기 바랍니다.')
    .matches(/^\d{3}[-]{1}\d{4}[-]{1}\d{4}$/)
    .withMessage(
      '휴대폰 번호는 반드시 000-0000-0000 의 형식으로 입력해주세요.',
    );
  next();
};
