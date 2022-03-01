const { deleteImage } = require('./ImageDelete');
// multer import and setup
const multer = require('multer');
const multerConfig = require('../../config/multerConfig');
const ValidationError = require('../errors/validation.error');
const logger = require('../../config/logger');
const ClientError = require('../errors/client.error.js');

const upload = multerConfig(multer);

exports.uploadImage = function (req, res, next) {
  // fieldname 이 'image' 와 일치할 때 파일 업로드 진행
  const imageUpload = upload.single('image');

  imageUpload(req, res, function (err) {
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
    // 파일이 존재하지 않는 경우
    if (!req.file) {
      return next(new ValidationError('Image file required'));
    }

    logger.info('Image is uploaded successfully');
    const image_path = `/uploads/${req.file.filename}`; // image 경로 만들기
    req.body.image_path = image_path;
    next();
  });
};
