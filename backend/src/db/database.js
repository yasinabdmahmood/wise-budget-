const Database = require('better-sqlite3');
const path = require('path');
const fs   = require('fs');

const DB_PATH     = process.env.DB_PATH || path.join(__dirname, '../../wise_budget.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEEDS_PATH  = path.join(__dirname, 'seeds.sql');

let db;

function getDb() {
  if (db) return db;

  db = new Database(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
    .replace(/PRAGMA journal_mode.*?;\n?/g, '')
    .replace(/PRAGMA foreign_keys.*?;\n?/g, '');
  db.exec(schema);

  const row = db.prepare('SELECT COUNT(*) AS n FROM categories').get();
  if (row.n === 0) {
    const seeds = fs.readFileSync(SEEDS_PATH, 'utf8');
    db.exec(seeds);
    console.log('Default categories seeded.');
  }

  console.log('Database ready at ' + DB_PATH);
  return db;
}

module.exports = { getDb };
