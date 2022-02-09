// models/user.js
const bcrypt = require('bcrypt');
const db = require('../config/mysql');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const mysql = require('../config/mysql');
const { printSqlLog } = require('./util');
const moment = require('moment');

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
User.findAll = function (result) {
  const executedSql = mysql.query('select * from users', function (err, res) {
    if (err) {
      console.log('error: ', err);
      result(err, null);
    } else {
      console.log('users: ', res);
      result(null, res);
    }
  });
  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 조건에 따라 특정 사용자 검색
// 이름으로 검색
User.findByName = function (name, result) {
  const executedSql = mysql.query(
    'select * from users where name = ? ',
    name,
    function (err, res) {
      if (err) {
        console.log('error: ', err);
        result(err, null);
      } else {
        console.log('user: ', res);
        result(null, res);
      }
    },
  );
  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 이메일로 검색
User.findByEmail = function (email, result) {
  const executedSql = mysql.query(
    'select * from users where email = ? ',
    email,
    function (err, res) {
      if (err) return result(err);
      result(null, res);
    },
  );
  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 비밀번호 일치 여부 검사
User.comparePassword = function (plainPassword, passwordInDb, result) {
  // plainPassword 를 암호화해서 데이터베이스에 있는 암호화된 비밀번호와 같은지 체크
  bcrypt.compare(plainPassword, passwordInDb, function (err, isMatch) {
    // bcrypt compare 함수 동작 중 오류 발생
    if (err) return result(err);
    result(null, isMatch);
  });
};
// 사용자 인덱스 값으로 검색
User.findById = function (id) {
  return new Promise((resolve, reject) => {
    try {
      const executedSql = mysql.query(
        'select * from users where id = ? ',
        id,
        function (err, res) {
          if (err) return reject(err);
          return resolve(res);
        },
      );
      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    } catch (err) {
      next(err);
    }
  });

  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 사용자 휴대폰 번호로 데이터베이스 조회
// @returns emailValue in the database
User.getEmailByPhoneNumber = function (phone_number, result) {
  const executedSql = mysql.query(
    'select email from users where phone_number = ? ',
    phone_number,
    function (err, res) {
      if (err) return result(err);
      result(null, res);
    },
  );

  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 사용자 휴대폰 번호와 이메일 주소로 데이터베이스 조회
// @returns true: 유저 존재함, false: 유저 존재하지 않음.
User.getUserIdByPhoneNumberAndEmail = function (userInfo, result) {
  const executedSql = mysql.query(
    'select id from users where phone_number = ? and email = ?',
    [userInfo.phone_number, userInfo.email],
    function (err, res) {
      if (err) return result(err);
      result(null, res);
    },
  );

  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 세션에 저장된 userid 로 사용자 비밀번호 가져오기
User.getPasswordById = function (userInfo) {
  return new Promise((resolve, reject) => {
    const executedSql = mysql.query(
      'select password from users where id = ?',
      [userInfo.id],
      (err, res) => {
        if (err) {
          return reject(err);
        } else {
          return resolve(JSON.parse(JSON.stringify(res[0])));
        }
      },
    );

    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};
// 사용자 등록
User.create = function (newUser, result) {
  const executedSql = mysql.query(
    'insert into users set ?',
    newUser,
    function (err, res) {
      if (err) {
        console.log('error: ', err);
        result(err, null);
      } else {
        console.log('user: ', res);
        result(null, res.insertId);
      }
    },
  );

  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 사용자 삭제
User.delete = function (email, result) {
  const executedSql = mysql.query(
    'delete from users where email = ?',
    [email],
    function (err, res) {
      if (err) return result(err, null);
      result(null, res.insertId);
    },
  );

  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
// 사용자 비밀번호 정보 수정
User.updatePassword = function (user) {
  return new Promise((resolve, reject) => {
    console.log('user: ', user);
    const executedSql = mysql.query(
      'update users set password = ? where id = ?',
      [user.password, user.id],
      function (err, res) {
        if (err) {
          return reject(err);
        } else {
          return resolve({ success: true });
        }
      },
    );

    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};
// 사용자 정보 수정
User.update = function (email, user, result) {
  const executedSql = mysql.query(
    'update users set name=?,email=?,password=?,phone_number=?,profile_image_path=?,modified_at=?',
    [
      user.name,
      user.email,
      user.password,
      user.phone_number,
      user.profile_image_path,
      CURRENT_TIMESTAMP,
    ],
    function (err, res) {
      if (err) return result(err, null);
      result(null, res);
    },
  );

  // 콘솔 창에 sql 문 출력
  printSqlLog(executedSql.sql);
};
User.updateProfileInfo = function (userInfo) {
  // db 데이터 변경 작업은 비동기 동작임.
  return new Promise(function (resolve, reject) {
    let executedSql;
    const timestamp = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    const { profile_image_path, name, id } = userInfo;
    // 변경하고자 하는 정보에 프로필 이미지가 없다면,
    if (profile_image_path === null) {
      // 닉네임만 업데이트
      const query = 'update users set name=?,modified_at=? where id=?';
      executedSql = mysql.query(
        query,
        [userInfo.name, timestamp, userInfo.id],
        err => {
          if (err) {
            return reject(err);
          } else {
            return resolve({ success: true });
          }
        },
      );
      // 변경하고자 하는 정보에 닉네임이 없다면
    } else if (!name) {
      // 프로필 이미지만 업데이트
      const query =
        'update users set profile_image_path=?,modified_at=? where id=?';
      executedSql = mysql.query(
        query,
        [userInfo.profile_image_path, timestamp, userInfo.id],
        err => {
          if (err) {
            return reject(err);
          } else {
            return resolve({ success: true });
          }
        },
      );
    } else {
      // 닉네임 및 프로필 이미지 전부 업데이트
      const query =
        'update users set name=?,profile_image_path=?,modified_at=? where id=?';
      executedSql = mysql.query(
        query,
        [userInfo.name, userInfo.profile_image_path, timestamp, userInfo.id],
        err => {
          if (err) {
            return reject(err);
          } else {
            return resolve({ success: true });
          }
        },
      );
    }

    // 콘솔 창에 sql 문 출력
    printSqlLog(executedSql.sql);
  });
};
User.updatePhoneNumber = function (userInfo) {
  // db 데이터 변경 작업은 비동기 동작임.
  return new Promise(function (resolve, reject) {
    const timestamp = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    const { phone_number, id } = userInfo;
    // 변경하고자 하는 정보에 휴대폰 번호가 있다면,
    if (phone_number) {
      const query = 'update users set phone_number=?,modified_at=? where id=?';
      const executedSql = mysql.query(
        query,
        [phone_number, timestamp, id],
        err => {
          if (err) {
            return reject(err);
          } else {
            return resolve({ success: true });
          }
        },
      );
      // 콘솔 창에 sql 문 출력
      printSqlLog(executedSql.sql);
    }
  });
};

module.exports = User;
