// models/user.js
const bcrypt = require('bcrypt');
// 데이터베이스에 직접 접근하여 데이터 조회, 변경
const mysql = require('../config/mysql');

// 사용자 객체 생성자 함수
let User = function (user) {
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
  mysql.query('select * from users', function (err, res) {
    if (err) {
      console.log('error: ', err);
      result(err, null);
    } else {
      console.log('users: ', res);
      result(null, res);
    }
  });
};
// 조건에 따라 특정 사용자 검색
// 이름으로 검색
User.findByName = function (name, result) {
  mysql.query('select * from users where name = ? ', name, function (err, res) {
    if (err) {
      console.log('error: ', err);
      result(err, null);
    } else {
      console.log('user: ', res);
      result(null, res);
    }
  });
};
// 이메일로 검색
User.findByEmail = function (email, result) {
  mysql.query(
    'select * from users where email = ? ',
    email,
    function (err, res) {
      if (err) return result(err);
      result(null, res);
    },
  );
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
User.findById = function (id, result) {
  mysql.query('select * from users where id = ? ', id, function (err, res) {
    if (err) return result(err);
    result(null, res);
  });
};
// 사용자 등록
User.create = function (newUser, result) {
  mysql.query('insert into users set ?', newUser, function (err, res) {
    if (err) {
      console.log('error: ', err);
      result(err, null);
    } else {
      console.log('user: ', res);
      result(null, res.insertId);
    }
  });
};
// 사용자 삭제
User.delete = function (email, result) {
  mysql.query(
    'delete from users where email = ?',
    [email],
    function (err, res) {
      if (err) return result(err, null);
      result(null, res.insertId);
    },
  );
};
// 사용자 정보 수정
User.update = function (email, user, result) {
  mysql.query(
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
};

module.exports = User;
