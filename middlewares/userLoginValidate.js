const { body, check } = require('express-validator');

// 아이디 입력했는지, 이메일 형식을 따르는지 검사
// 비밀번호 입력했는지 검사
module.exports = [
  check('email')
    .exists({ checkFalsy: true })
    .withMessage(
      '이메일은 로그인 시 아이디로 사용되니 반드시 입력해주시기 바랍니다.',
    )
    .isEmail()
    .withMessage('example@example.com 의 이메일 형식으로 입력해주세요.'),
  check('password')
    .exists({ checkFalsy: true })
    .withMessage('비밀번호는 반드시 입력해주시기 바랍니다.'),
];
