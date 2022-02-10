// models/user.js
const bcrypt = require('bcrypt');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const DB = require('../config/mysql');
const { printSqlLog, printCurrentTime } = require('./util');

// 사용자 객체 생성자 함수
let User = function (user) {
  this.id = user.id || null;
  this.email = user.email;
  this.password = user.password;
  this.name = user.name;
  this.phone_number = user.phone_number;
  this.profile_image_path = user.profile_image_path
    ? user.profile_image_path
    : null;
};

// 모든 사용자 검색
User.findAll = function () {
  return new Promise((resolve, reject) => {
    try {
      const executedSql = connection.execute(
        'select * from users',
        (err, res) => {
          if (err) {
            reject(new Error(err.message));
          } else {
            resolve(res);
          }
        },
      );
      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    } catch (err) {
      next(err);
    }
  });
};
// 조건에 따라 특정 사용자 검색
// 이름으로 검색
User.findByName = function (user) {
  return new Promise((resolve, reject) => {
    const executedSql = connection.execute(
      'select * from users where name = ? ',
      user.name,
      (err, res) => {
        if (err) {
          reject(new Error(err.message));
        } else {
          resolve(res);
        }
      },
    );
    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};
// 이메일로 검색
User.findByEmail = function (user) {
  return new Promise((resolve, reject) => {
    const executedSql = connection.execute(
      'select * from users where email = ? ',
      user.email,
      function (err, res) {
        if (err) {
          reject(new Error(err.message));
        } else {
          resolve(res);
        }
      },
    );
    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};
// 비밀번호 일치 여부 검사
User.comparePassword = async function (plainPassword, passwordInDb) {
  try {
    // plainPassword 를 암호화해서 데이터베이스에 있는 암호화된 비밀번호와 같은지 체크
    return await bcrypt.compare(plainPassword, passwordInDb);
  } catch (err) {
    logger.error(err.message);
    throw new Error(err.message);
  }
};
// 사용자 인덱스 값으로 검색
User.findById = function (user) {
  return new Promise((resolve, reject) => {
    try {
      const executedSql = connection.execute(
        'select * from users where id = ? ',
        user.id,
        function (err, res) {
          if (err) {
            reject(new Error(err.message));
          } else {
            resolve(res);
          }
        },
      );
      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    } catch (err) {
      next(err);
    }
  });
};
// 사용자 휴대폰 번호로 데이터베이스 조회
// @returns emailValue in the database
User.getEmailByPhoneNumber = function (user) {
  return new Promise((resolve, reject) => {
    try {
      const executedSql = connection.execute(
        'select email from users where phone_number = ? ',
        user.phone_number,
        function (err, res) {
          if (err) {
            reject(new Error(err.message));
          } else {
            resolve(res);
          }
        },
      );

      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    } catch (err) {
      next(err);
    }
  });
};
// 사용자 휴대폰 번호와 이메일 주소로 데이터베이스 조회
// @returns true: 유저 존재함, false: 유저 존재하지 않음.
User.getUserIdByPhoneNumberAndEmail = async function (user) {
  try {
    const query = 'select id from users where phone_number = ? and email = ?';
    const params = [user.phone_number, user.email];
    const result = await DB('GET', query, params);
    console.log('result : ', result);
    return result;
    // const executedSql = connection.query(
    //   'select id from users where phone_number = ? and email = ?',
    //   [user.phone_number, user.email],
    //   function (err, res) {
    //     if (err) {
    //       reject(new Error(err.message));
    //     } else {
    //       resolve(res);
    //     }
    //   },
    // );

    // // 콘솔 창에 sql 문 출력
    // printSqlLog(executedSql.sql);
  } catch (err) {
    throw new Error(err.message);
  }
};
// 세션에 저장된 userid 로 사용자 비밀번호 가져오기
User.getPasswordById = function (userInfo) {
  return new Promise((resolve, reject) => {
    const executedSql = connection.execute(
      'select password from users where id = ?',
      [userInfo.id],
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(JSON.stringify(res[0])));
        }
      },
    );

    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};
// 사용자 등록
User.create = function (user, result) {
  return new Promise((resolve, reject) => {
    try {
      const executedSql = connection.execute(
        'insert into users set ?',
        user,
        function (err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res.insertId);
          }
        },
      );

      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    } catch (err) {
      reject(new Error(err.message));
    }
  });
};
// 사용자 삭제
User.delete = function (user) {
  return new Promise((resolve, reject) => {
    try {
      const executedSql = connection.execute(
        'delete from users where email = ?',
        [user.email],
        function (err, res) {
          if (err) {
            reject(err);
          } else {
            resolve(res.insertId);
          }
        },
      );

      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    } catch (err) {
      reject(new Error(err.message));
    }
  });
};
// 사용자 비밀번호 정보 수정
User.updatePassword = async function (user) {
  try {
    const query = 'update users set password = ? where id = ?';
    const params = [user.password, user.id];
    const result = await DB('PUT', query, params);
    console.log('result : ', result);
    return result;
  } catch (err) {
    throw new Error(err.message);
  }
};
User.updateProfileInfo = function (user) {
  // db 데이터 변경 작업은 비동기 동작임.
  return new Promise(function (resolve, reject) {
    let executedSql;
    const timestamp = printCurrentTime();
    const { profile_image_path, name, id } = userInfo;
    // 변경하고자 하는 정보에 프로필 이미지가 없다면,
    if (profile_image_path === null) {
      // 닉네임만 업데이트
      const query = 'update users set name=?,modified_at=? where id=?';
      executedSql = connection.execute(
        query,
        [user.name, timestamp, user.id],
        err => {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        },
      );
      // 변경하고자 하는 정보에 닉네임이 없다면
    } else if (!name) {
      // 프로필 이미지만 업데이트
      const query =
        'update users set profile_image_path=?,modified_at=? where id=?';
      executedSql = connection.execute(
        query,
        [user.profile_image_path, timestamp, user.id],
        err => {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        },
      );
    } else {
      // 닉네임 및 프로필 이미지 전부 업데이트
      const query =
        'update users set name=?,profile_image_path=?,modified_at=? where id=?';
      executedSql = connection.execute(
        query,
        [user.name, user.profile_image_path, timestamp, user.id],
        err => {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        },
      );
    }

    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};
User.updatePhoneNumber = function (user) {
  // db 데이터 변경 작업은 비동기 동작임.
  return new Promise(function (resolve, reject) {
    const timestamp = printCurrentTime();
    const { phone_number, id } = user;
    // 변경하고자 하는 정보에 휴대폰 번호가 있다면,
    if (phone_number) {
      const query = 'update users set phone_number=?,modified_at=? where id=?';
      const executedSql = connection.execute(
        query,
        [phone_number, timestamp, id],
        err => {
          if (err) {
            reject(err);
          } else {
            resolve({ success: true });
          }
        },
      );
      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    }
  });
};
// 사용자 탈퇴에 따른 상태 비활성화 및 삭제일자 저장
User.disable = function (user) {
  return new Promise((resolve, reject) => {
    const timestamp = printCurrentTime();
    const query = 'update users set status=?,dropped_at=? where id=?';
    const executedSql = connection.execute(
      query,
      ['N', timestamp, user.id],
      err => {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      },
    );
    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};

module.exports = User;
