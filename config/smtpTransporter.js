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
// SMTP 연결 설정 검증
const verifySmtpConfig = async () => {
  try {
    await smtpTransporter.verify();
    logger.info('Server is ready to take our messages');
    return true;
  } catch (err) {
    logger.error('verifySmtpConfig Function Error: ', err.message);
    throw new Error(err.message);
  }
};
// 지정된 수신자에게 이메일 발송
const sendMail = async emailOption => {
  try {
    await smtpTransporter.sendMail(emailOption);
    return true;
  } catch (err) {
    logger.error('sendMail Function Error: ', err.message);
    throw new Error(err.message);
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
      logger.error('EMAIL_SENT_FAILURE');
      throw new Error('EMAIL_SENT_FAILURE');
    }
    smtpTransporter.close();
    logger.info('EMAIL_SENT_SUCCESS');
    return true;
  } catch (err) {
    logger.error(`sendEmailRun Caught Error: ${err.message}`);
    throw new Error(err.message);
  }
};
module.exports = { smtpTransporter, verifySmtpConfig, sendMailRun };
