// Estado de conversación en BD: backend stateless, reiniciable sin perder contexto.
import { query } from '../../db/pool.js';

// Devuelve { candidato, conversacion } creándolos si es la primera vez.
export async function getOrCreateCandidato(telefono) {
  const existing = await query(
    `SELECT * FROM candidatos WHERE telefono = $1`,
    [telefono],
  );

  let candidato = existing.rows[0];
  if (!candidato) {
    const inserted = await query(
      `INSERT INTO candidatos (telefono) VALUES ($1) RETURNING *`,
      [telefono],
    );
    candidato = inserted.rows[0];
  }

  const conv = await query(
    `SELECT * FROM conversaciones WHERE candidato_id = $1 ORDER BY id DESC LIMIT 1`,
    [candidato.id],
  );

  let conversacion = conv.rows[0];
  if (!conversacion) {
    const inserted = await query(
      `INSERT INTO conversaciones (candidato_id) VALUES ($1) RETURNING *`,
      [candidato.id],
    );
    conversacion = inserted.rows[0];
  }

  return { candidato, conversacion };
}

export async function saveMensaje(candidatoId, rol, contenido) {
  await query(
    `INSERT INTO mensajes (candidato_id, rol, contenido) VALUES ($1, $2, $3)`,
    [candidatoId, rol, contenido],
  );
}

// Historial en formato que entiende OpenAI ({ role, content }).
export async function getHistorial(candidatoId, limit = 20) {
  const res = await query(
    `SELECT rol, contenido FROM mensajes
     WHERE candidato_id = $1
     ORDER BY creado_en DESC
     LIMIT $2`,
    [candidatoId, limit],
  );
  return res.rows
    .reverse()
    .map((m) => ({ role: m.rol, content: m.contenido }));
}

export async function updateConversacion(conversacionId, { estado, datos }) {
  await query(
    `UPDATE conversaciones
     SET estado = COALESCE($2, estado),
         datos = COALESCE($3::jsonb, datos),
         actualizado_en = now()
     WHERE id = $1`,
    [conversacionId, estado ?? null, datos != null ? JSON.stringify(datos) : null],
  );
}

// Actualiza el resultado/puntuación final del candidato.
export async function updateCandidato(candidatoId, { resultado, puntuacion, zona }) {
  await query(
    `UPDATE candidatos
     SET resultado = COALESCE($2, resultado),
         puntuacion = COALESCE($3, puntuacion),
         zona = COALESCE($4, zona),
         actualizado_en = now()
     WHERE id = $1`,
    [candidatoId, resultado ?? null, puntuacion ?? null, zona ?? null],
  );
}
