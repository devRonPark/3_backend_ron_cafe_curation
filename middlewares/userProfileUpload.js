const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  // 전송된 파일 저장 디렉토리 설정
  destination: function (req, file, cb) {
    cb(null, 'assets/users'); // cb 콜백함수를 통해 전송된 파일 저장 디렉토리 설정
  },
  // 전송된 파일 이름 설정
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(
      null,
      `${path.basename(file.originalname, ext)}_profile_${Date.now()}${ext}`,
    ); // cb 콜백 함수를 통해 전송된 파일 이름 설정
  },
});

const upload = multer({ storage: storage });
const uploadCallback = function (req, res, next) {
  const imagePath = `/assets/users/${req.file.filename}`; // image 경로 만들기
  req.body.profile_image_path = imagePath;
  next();
};

module.exports = {
  upload,
  uploadCallback,
};
