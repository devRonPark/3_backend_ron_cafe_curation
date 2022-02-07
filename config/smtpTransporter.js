const nodemailer = require('nodemailer');

// SMTP 옵션
const smtpOption = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.ACCOUNT_USER,
    pass: process.env.ACCOUNT_PASS,
  },
  from: process.env.ACCOUNT_USER,
  // 환경변수로 메일 주소와 비밀번호 설정
};
// SMTP 객체 생성
const smtpTransporter = nodemailer.createTransport(smtpOption);
module.exports = smtpTransporter;
