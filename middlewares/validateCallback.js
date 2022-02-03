const { validationResult } = require('express-validator');

exports.validateCallback = function (req, res, next) {
  // validate the data to be submitted
  const result = validationResult(req);
  const hasErrors = !result.isEmpty();

  if (hasErrors) {
    return res.status(400).json({
      fieldName: result.array(0).param,
      message: result.array()[0].msg,
    });
  } else {
    next();
  }
};
