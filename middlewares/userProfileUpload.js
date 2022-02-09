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

const upload = multer({ storage: storage }).single('profile');
// 파일 포함 여부 검사 및 파일 업로드, req.body 파싱
const uploadFile = function (req, res, next) {
  upload(req, res, function (err) {
    try {
      // 폼 데이터 전송 시 필드명 불일치 => 업로드 할 파일이 존재하지 않는 경우,
      if (!req.file) {
        if (err instanceof multer.MulterError) {
          // 폼 데이터 전송 시 파일은 포함되어 있는데 필드명이 불일치하는 경우
          console.log('필드명이 일치하지 않음.');
          throw err;
          // 폼 데이터 전송 시 파일이 포함되어 있지 않은 경우
        } else {
          // 그 다음 미들웨어 무사히 동작함.
          console.log('야:', req.body.name);
          return next();
        }
      }
    } catch (err) {
      return next(err);
    }

    const imagePath = `/assets/users/${req.file.filename}`; // image 경로 만들기
    req.body.profile_image_path = imagePath;
    next();
  });
};

module.exports = {
  uploadFile,
};
