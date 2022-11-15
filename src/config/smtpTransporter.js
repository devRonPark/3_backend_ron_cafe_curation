const config = require('../config/config');
const nodemailer = require('nodemailer');
const InternalServerError = require('../common/errors/internal-sever.error');

// SMTP 옵션
const smtpOption = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.mailInfo.user,
    pass: config.mailInfo.password,
  },
  from: config.mailInfo.user,
  // 환경변수로 메일 주소와 비밀번호 설정
};
// SMTP 객체 생성
const smtpTransporter = nodemailer.createTransport(smtpOption);
// SMTP 연결 설정 검증
const verifySmtpConfig = async () => {
  try {
    await smtpTransporter.verify();
    logger.info('Server is ready to take our messages');
    return true;
  } catch (err) {
    throw err;
  }
};
// 지정된 수신자에게 이메일 발송
const sendMail = async emailOption => {
  try {
    await smtpTransporter.sendMail(emailOption);
    return true;
  } catch (err) {
    throw err;
  }
};
const sendMailRun = async emailOption => {
  try {
    // SMTP 연결 설정 검증
    const smtpConnection = await verifySmtpConfig();

    if (smtpConnection) {
      logger.info('SMTP_SERVER_CONNECTION_SUCCESS');
    }
    // 이메일 발송
    const mailSentResult = await sendMail(emailOption);
    if (!mailSentResult) {
      throw new InternalServerError('EMAIL_SENT_FAILURE');
    }
    logger.info('EMAIL_SENT_SUCCESS');
    return true;
  } catch (err) {
    throw err;
  } finally {
    smtpTransporter.close();
  }
};
module.exports = { smtpTransporter, verifySmtpConfig, sendMailRun };
