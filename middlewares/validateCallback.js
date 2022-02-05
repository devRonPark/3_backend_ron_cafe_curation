const { validationResult } = require('express-validator');

// 유효성 검사 이후 에러 체크
exports.validateCallback = function (req, res, next) {
  // validate the data to be submitted
  const result = validationResult(req);
  const hasErrors = !result.isEmpty();

  if (hasErrors) {
    return res.status(400).json({
      success: false,
      fieldName: result.array(0).param,
      message: result.array()[0].msg,
    });
  }
  next();
};
