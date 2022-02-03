const CryptoJS = require('crypto-js');

// 암호화된 이메일, 휴대폰 복호화
exports.decryptUserPrivateInfo = (req, res, next) => {
  const { email, phone_number } = req.body;
  console.log('email: ', email);
  console.log('phone_number: ', phone_number);
  // 복호화 키
  const secretKey = process.env.CRYPTO_SECRET_KEY;
  let decryptedEmail, decryptedPhoneNumber;
  try {
    // AES 알고리즘 사용 복호화
    const bytesOfEmail = CryptoJS.AES.decrypt(email, secretKey);
    const bytesOfPhoneNumber = CryptoJS.AES.decrypt(phone_number, secretKey);
    // 인코딩
    decryptedEmail = bytesOfEmail.toString(CryptoJS.enc.Utf8);
    decryptedPhoneNumber = bytesOfPhoneNumber.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    next(e);
  }

  // DB 에 저장하기 위해 암호화된 데이터 req.body 객체에 저장
  req.body.encrypted_email = email;
  req.body.encrypted_phone_number = phone_number;
  // 유효성 검사하기 위해 복호화된 데이터 req.body 객체에 저장
  req.body.email = decryptedEmail;
  req.body.phone_number = decryptedPhoneNumber;
  console.dir(req.body);
  next();
};

exports.encryptUserPrivateInfo = (req, res, next) => {
  const { encrypted_email, encrypted_phone_number } = req.body;

  // req.body 객체에 암호화된 데이터 저장
  req.body.email = encrypted_email;
  req.body.phone_number = encrypted_phone_number;
  console.dir(req.body);
  next();
};
