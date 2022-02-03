const { body, check } = require('express-validator');

module.exports = [
  check('name')
    .exists({ checkFalsy: true })
    .withMessage('이름을 반드시 입력해주시기 바랍니다.')
    .isLength({ min: 3, max: 16 })
    .withMessage('이름은 최소 3자 이상 최대 16자 이하로 입력해주세요.'),
  check('email')
    .exists({ checkFalsy: true })
    .withMessage(
      '이메일은 로그인 시 아이디로 사용되니 반드시 입력해주시기 바랍니다.',
    )
    .isEmail()
    .withMessage('example@example.com 의 이메일 형식으로 입력해주세요.'),
  check('password')
    .exists({ checkFalsy: true })
    .withMessage('비밀번호는 반드시 입력해주시기 바랍니다.')
    .matches(
      /^(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^*()\-_=+\\\|\[\]{};:\'",.<>\/?])*.{8,16}$/,
    )
    .bail()
    .withMessage(
      '비밀번호는 숫자, 문자, 특수문자를 반드시 포함하여 최소 8자 이상 최대 16자 이하로 입력해주세요.',
    ),
  body('passwordConfirmation')
    .custom((value, { req }) => {
      if (!value) {
        throw new Error('비밀번호 다시 한 번 반드시 입력해주시기 바랍니다.');
      }
      if (value !== req.body.password) {
        throw new Error(
          '앞서 입력하신 비밀번호와 일치하지 않습니다. 다시 입력해주세요.',
        );
      }
      return true;
    })
    .bail(),
  check('phone_number')
    .exists({ checkFalsy: true })
    .withMessage('휴대폰 번호를 반드시 입력해주시기 바랍니다.')
    .matches(/^\d{3}[-]{1}\d{4}[-]{1}\d{4}$/)
    .withMessage(
      '휴대폰 번호는 반드시 000-0000-0000 의 형식으로 입력해주세요.',
    ),
];
