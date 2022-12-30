import { conn } from '../../config/mysql';
import { mustOne } from './error';

export async function select(sql, values) {
  const [rows] = await conn().query(sql, values);
  return rows;
}

export async function selectOne(sql, values, err) {
  const [rows] = await select(sql, values);
  return mustOne(rows, err);
}
