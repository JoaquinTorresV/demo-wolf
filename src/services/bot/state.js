// Estado de conversación en SQLite. Backend stateless: reiniciable sin perder contexto.
import { db } from '../../db/db.js';

// Devuelve { candidato, conversacion } creándolos si es la primera vez.
// conversacion.datos viene ya parseado a objeto.
export function getOrCreateCandidato(telefono) {
  let candidato = db.prepare('SELECT * FROM candidatos WHERE telefono = ?').get(telefono);
  if (!candidato) {
    const info = db.prepare('INSERT INTO candidatos (telefono) VALUES (?)').run(telefono);
    candidato = db.prepare('SELECT * FROM candidatos WHERE id = ?').get(Number(info.lastInsertRowid));
  }

  let conversacion = db
    .prepare('SELECT * FROM conversaciones WHERE candidato_id = ? ORDER BY id DESC LIMIT 1')
    .get(candidato.id);
  if (!conversacion) {
    const info = db.prepare('INSERT INTO conversaciones (candidato_id) VALUES (?)').run(candidato.id);
    conversacion = db.prepare('SELECT * FROM conversaciones WHERE id = ?').get(Number(info.lastInsertRowid));
  }

  conversacion.datos = JSON.parse(conversacion.datos || '{}');
  return { candidato, conversacion };
}

export function saveMensaje(candidatoId, rol, contenido) {
  db.prepare('INSERT INTO mensajes (candidato_id, rol, contenido) VALUES (?, ?, ?)').run(candidatoId, rol, contenido);
}

// Historial en formato que entiende OpenAI ({ role, content }).
export function getHistorial(candidatoId, limit = 20) {
  const rows = db
    .prepare('SELECT rol, contenido FROM mensajes WHERE candidato_id = ? ORDER BY creado_en DESC, id DESC LIMIT ?')
    .all(candidatoId, limit);
  return rows.reverse().map((m) => ({ role: m.rol, content: m.contenido }));
}

export function updateConversacion(conversacionId, { estado, datos }) {
  db.prepare(
    `UPDATE conversaciones
     SET estado = COALESCE(?, estado),
         datos = COALESCE(?, datos),
         actualizado_en = datetime('now')
     WHERE id = ?`,
  ).run(estado ?? null, datos != null ? JSON.stringify(datos) : null, conversacionId);
}

export function updateCandidato(candidatoId, { resultado, puntuacion, zona }) {
  db.prepare(
    `UPDATE candidatos
     SET resultado = COALESCE(?, resultado),
         puntuacion = COALESCE(?, puntuacion),
         zona = COALESCE(?, zona),
         actualizado_en = datetime('now')
     WHERE id = ?`,
  ).run(resultado ?? null, puntuacion ?? null, zona ?? null, candidatoId);
}
