// morgan middleware 설정
// 필요한 모듈 불러오기
const morgan = require('morgan');
const Logger = require('../config/logger');

// 통신할 때 출력하는 stream 메소드 오버라이딩
// Morgan은 console.log 대신 커스텀 로거 사용
const stream = {
  write: message => {
    // Logger 함수의 info 레벨로 출력
    Logger.info(message);
  },
};
// morgan 미사용할 환경 설정
const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env !== 'development';
};
// HTTP 통신 결과 확인 토큰 생성 및 색상 변경
// morgan.token() : morgan 함수에서 사용할 변수 생성
morgan.token('status', function (req, res) {
  let color;
  // 서버 응답 결과에 따라 다른 색깔로 표현
  if (res.statusCode < 300) color = '\x1B[32m';
  // 초록색
  else if (res.statusCode < 400) color = '\x1B[36m';
  // 옥색
  else if (res.statusCode < 500) color = '\x1B[33m';
  // 노란색
  else if (res.statusCode < 600) color = '\x1B[31m';
  // 빨간색
  else color = '\033[0m'; // 글자색 초기화

  return color + res.statusCode + '\033[35m'; // purple
});
// Request로 받아오는 값 확인할 토큰 생성
// morgan.token() : morgan 함수에서 사용할 변수 생성
morgan.token('request', function (req, res) {
  return 'Request_' + JSON.stringify(req.body);
});
// 콘솔에 보기 좋게 정렬해주는 토큰 생성
// morgan.token() : morgan 함수에서 사용할 변수 생성
morgan.token('makeLine', function () {
  let line =
    "-----------------------------------------------*(੭*ˊᵕˋ)੭* 응답 결과 ╰(*'v'*)╯-----------------------------------------------";
  let blank = '                                     ';
  return line + '\n' + blank;
});
// morgan 함수 설정
// morgan 함수의 첫번째 인자(format)로는 (정보의 노출 수준에 따라) short, dev, common, combined 가 올 수 있다.
// 보통 배포 시에는 combined 혹은 common 에 필요한 정보들을 추가하여 사용 권장
// 추후 배포 시 사용 -> 주소,IP_ :remote-addr :remote-user |
const morganMiddleware = morgan(
  // 위에서 생성한 토큰변수는 앞에 :콜론을 찍고 토큰 명 작성
  // 내장 변수 >> :method : 요청 HTTP 메소드, :url : 요청된 api 주소, :response-time : 응답시간, :res[content-length] : 응답 길이
  ":makeLine 요청_:method | url_':url' | :request | Status_:status | 응답시간_:response-time ms (:res[content-Length]줄)",
  { stream, skip },
);

module.exports = morganMiddleware;
