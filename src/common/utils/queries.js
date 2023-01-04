const logger = require('../../config/logger');
const { conn } = require('../../config/mysql');
const { mustOne } = require('./error');
const { printSqlLog } = require('./util');

async function select(sql, values) {
  const [rows] = await conn().query(sql, values);
  printSqlLog(sql, values);
  return rows;
}

async function selectOne(sql, values, err) {
  const [rows] = await select(sql, values);
  return mustOne(rows, err);
}

async function checkIfExists(sql, values) {
  const [rows] = await select(sql, values);
  if (rows['count(0)'] < 1) return false;
  return true;
}

module.exports = { select, selectOne, checkIfExists };
