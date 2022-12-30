const app = require('../app');
const logger = require('../config/logger');
const { debug } = require('console');
const config = require('../config/config');
const { initDB } = require('../config/mysql');

/**
 * 현재 환경으로부터 port 가져와 Express에 저장
 */
const port = normalizePort(process.env.PORT || '8000');
app.set('port', port);

/**
 * 모든 네트워크 요청에 대해 제공된 port에서 Listen
 */
async function listen(port) {
  return new Promise(resolve => {
    app.listen(port, () => {
      logger.info(
        `Server On... Express is running on http://localhost:${port}`,
      );
    });
  });
}

async function f() {
  // 서버와 DB 연결
  await initDB(config.dbInfo);
  await listen(port);
}

f();
app.on('error', onError);
app.on('listening', onListening);

/**
 * 제공된 포트가 number, 숫자가 아니면 숫자 string, 다른 것이 있으면 false로 설정
 */
function normalizePort(val) {
  // converts its first argument(string) to an integer or NaN
  var port = parseInt(val, 10);
  // port: number => isNaN(port): false
  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
/**
 * HTTP 서버 "error" 이벤트를 위한 이벤트 핸들러
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
    default:
      throw error;
  }
}

/**
 * HTTP 서버 "listening" 이벤트를 위한 이벤트 핸들러
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
