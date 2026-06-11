// Crea el esquema inicial. Idempotente: se puede correr varias veces.
// Uso: npm run migrate
import { pool } from './pool.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS candidatos (
  id            SERIAL PRIMARY KEY,
  telefono      TEXT UNIQUE NOT NULL,          -- E.164, ej +34608755818
  nombre        TEXT,
  zona          TEXT,                          -- girona | barcelona | tarragona | otra
  resultado     TEXT NOT NULL DEFAULT 'en_proceso', -- en_proceso | apto | no_apto
  puntuacion    INTEGER,                       -- 0-10 (LLM-judge, fase 2)
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversaciones (
  id            SERIAL PRIMARY KEY,
  candidato_id  INTEGER NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
  estado        TEXT NOT NULL DEFAULT 'inicio',  -- paso actual del flujo (fase 2)
  -- Respuestas estructuradas que se van completando durante la conversación.
  datos         JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mensajes (
  id            SERIAL PRIMARY KEY,
  candidato_id  INTEGER NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
  rol           TEXT NOT NULL,                 -- user | assistant
  contenido     TEXT NOT NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_candidato ON mensajes(candidato_id, creado_en);
CREATE INDEX IF NOT EXISTS idx_candidatos_telefono ON candidatos(telefono);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    console.log('[migrate] esquema aplicado correctamente.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('[migrate] error:', err);
  process.exit(1);
});
