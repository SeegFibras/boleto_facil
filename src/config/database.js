// Configuração do banco de dados SQLite para logs e cache
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/app.db');

let db;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS consultas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpf_cnpj_mascarado TEXT NOT NULL,
      resultado TEXT NOT NULL,
      qtd_boletos INTEGER DEFAULT 0,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function registrarConsulta(cpfMascarado, resultado, qtdBoletos, ip) {
  const db = getDatabase();
  const stmt = db.prepare(
    'INSERT INTO consultas (cpf_cnpj_mascarado, resultado, qtd_boletos, ip) VALUES (?, ?, ?, ?)'
  );
  stmt.run(cpfMascarado, resultado, qtdBoletos, ip);
}

function getUltimaConsulta() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM consultas ORDER BY id DESC LIMIT 1').get();
}

module.exports = { getDatabase, registrarConsulta, getUltimaConsulta };
