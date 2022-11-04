const { deleteImage } = require('./ImageDelete');
// multer import and setup
const multer = require('multer');
const multerConfig = require('../../config/multerConfig');
const ValidationError = require('../errors/validation.error');
const logger = require('../../config/logger');
const ClientError = require('../errors/client.error.js');

const upload = multerConfig(multer);

exports.uploadImage = (req, res, next) => {
  // fieldname 이 'image' 와 일치할 때 파일 업로드 진행
  const imageUpload = upload.single('image_path');

  imageUpload(req, res, (err) => {
    console.log('req.file: ', req.file);
    console.error('error: ', err);
    if (err instanceof multer.MulterError) {
      // 파일 용량이 2MB를 초과한 경우
      logger.error('MAX file size 2MB allowed');
      return next(new ClientError('MAX file size 2MB allowed'));
    } else if (err instanceof ValidationError) {
      // 파일 형식이 이미지 형식이 아닌 경우
      return next(err);
    } else if (err) {
      return next(err);
    }

    // 프로필 파일이 존재하지 않는 경우 user_default_profile.png 파일의 경로 저장
    const image_path = req.file
      ? `/uploads/${req.file.filename}`
      : `/uploads/user_default_profile.png`;
    req.body.image_path = image_path;
    next();
  });
};
