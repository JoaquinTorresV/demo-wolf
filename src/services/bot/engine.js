// Motor del bot: pone la persistencia (BD) alrededor del orquestador conversacional.
import {
  getOrCreateCandidato,
  saveMensaje,
  getHistorial,
  updateConversacion,
  updateCandidato,
} from './state.js';
import { procesarTurno } from './conversation.js';
import { aplicarEtiquetas } from '../whatsapp/ycloud.js';
import { normalizePhone } from '../../utils/phone.js';

// Etiquetas de YCloud según la decisión final (para que los reclutadores filtren).
function etiquetasParaDecision(decision, datos) {
  if (decision.resultado === 'apto') {
    const tags = ['apto'];
    if (datos.zona) tags.push(`zona-${datos.zona}`);
    return tags;
  }
  if (decision.resultado === 'no_apto') return ['no-apto'];
  if (decision.resultado === 'humano') return ['derivado-humano'];
  return [];
}

// Procesa un mensaje entrante y devuelve el texto de respuesta del bot.
export async function procesarMensaje(rawFrom, texto) {
  const telefono = normalizePhone(rawFrom);
  if (!telefono) {
    console.warn('[engine] número inválido:', rawFrom);
    return null;
  }

  const { candidato, conversacion } = await getOrCreateCandidato(telefono);
  await saveMensaje(candidato.id, 'user', texto);

  const historial = await getHistorial(candidato.id);
  const { datos, reply, decision } = await procesarTurno({
    datos: conversacion.datos || {},
    historial,
    mensaje: texto,
  });

  // Persistir estado de la conversación.
  await updateConversacion(conversacion.id, { estado: decision.resultado, datos });

  // Si hay decisión final, registrarla en el candidato.
  if (['apto', 'no_apto', 'humano'].includes(decision.resultado)) {
    await updateCandidato(candidato.id, {
      resultado: decision.resultado,
      puntuacion: decision.puntuacion ?? null,
      zona: datos.zona ?? null,
    });
    // Etiquetar en YCloud para que los reclutadores filtren sin abrir el chat general.
    await aplicarEtiquetas(telefono, etiquetasParaDecision(decision, datos));
    // TODO (requiere cuenta Google): generar CV del apto en Drive.
  }

  await saveMensaje(candidato.id, 'assistant', reply);
  return reply;
}
