// Base de datos: SQLite integrado de Node (node:sqlite). Sin servicios externos ni
// módulos nativos. El archivo vive en SQLITE_PATH (por defecto ./data/wolf.db).
// En EasyPanel ese directorio debe ser un volumen persistente para no perder datos.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.SQLITE_PATH || './data/wolf.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Esquema. Idempotente: se puede llamar en cada arranque.
export function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS candidatos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      telefono       TEXT UNIQUE NOT NULL,
      nombre         TEXT,
      zona           TEXT,
      resultado      TEXT NOT NULL DEFAULT 'en_proceso',
      puntuacion     INTEGER,
      creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversaciones (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      candidato_id   INTEGER NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
      estado         TEXT NOT NULL DEFAULT 'inicio',
      datos          TEXT NOT NULL DEFAULT '{}',
      creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
      actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mensajes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      candidato_id  INTEGER NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
      rol           TEXT NOT NULL,
      contenido     TEXT NOT NULL,
      creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mensajes_candidato ON mensajes(candidato_id, creado_en);
    CREATE INDEX IF NOT EXISTS idx_candidatos_telefono ON candidatos(telefono);
  `);
}
