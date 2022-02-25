class MySqlError extends Error {
  constructor(message) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      // 에러 객체에 .stack 프로퍼티 추가
      Error.captureStackTrace(this, MySqlError);
    }

    this.name = 'MySqlError';
  }
}

module.exports = MySqlError;
