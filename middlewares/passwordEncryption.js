const bcrypt = require('bcrypt');

exports.passwordEncryption = function (req, res, next) {
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(req.body.password, salt);
  req.body.password = hash;
  next();
};
