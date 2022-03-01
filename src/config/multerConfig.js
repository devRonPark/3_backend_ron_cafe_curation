const ValidationError = require('../lib/errors/validation.error');

const multerConfig = multer => {
  const storage = multer.diskStorage({
    // 저장될 폴더 경로 지정
    destination: (req, file, cb) => {
      cb(null, 'uploads/images');
    },
    // 파일 이름 설정
    filename: (req, file, cb) => {
      cb(null, 'img-' + Date.now() + '-' + file.originalname);
    },
  });
  // 이미지 형식 여부 검증
  const fileFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
      return cb(new ValidationError('Only image files are allowed'), false);
    }
    cb(null, true);
  };

  return multer({
    storage: storage,
    limits: { fileSize: 2048000 }, // 최대 파일 크기 2MB
    fileFilter: fileFilter,
  });
};

module.exports = multerConfig;
