const mysql = require('mysql2/promise');

let pool;

async function initDB(dbConfig) {
  pool = mysql.createPool(dbConfig);
}

function conn() {
  if (!pool) throw Error('no db connection');
  return pool;
}

module.exports = { initDB, conn };
