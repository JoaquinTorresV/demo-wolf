// Motor del bot: pone la persistencia (BD) alrededor del orquestador conversacional.
import {
  getOrCreateCandidato,
  saveMensaje,
  getHistorial,
  updateConversacion,
  updateCandidato,
} from './state.js';
import { procesarTurno, respuestaConversacionCerrada } from './conversation.js';
import { construirCV } from './cv.js';
import { aplicarEtiquetas } from '../whatsapp/ycloud.js';
import { subirCV } from '../google/drive.js';
import { normalizePhone } from '../../utils/phone.js';

const RESULTADOS_FINALES = ['apto', 'no_apto', 'humano'];

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

  // Si la conversación ya está cerrada, responder breve y natural sin re-evaluar
  // (evita repetir el veredicto cada vez que la persona escribe "gracias", "chao"...).
  if (RESULTADOS_FINALES.includes(candidato.resultado)) {
    const reply = await respuestaConversacionCerrada(historial);
    await saveMensaje(candidato.id, 'assistant', reply);
    return reply;
  }

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
      nombre: datos.nombre ?? null,
    });
    // Etiquetar en YCloud para que los reclutadores filtren sin abrir el chat general.
    await aplicarEtiquetas(telefono, etiquetasParaDecision(decision, datos));
    // Solo los APTOS generan CV en Drive, en la subcarpeta según su modalidad.
    if (decision.resultado === 'apto') {
      const { nombreArchivo, contenido } = construirCV(telefono, datos, decision);
      const subcarpeta =
        decision.puesto === 'eventos' ? 'Eventos'
        : decision.puesto === 'fijo_verano' ? 'Fines de semana'
        : 'Otros';
      await subirCV(nombreArchivo, contenido, subcarpeta);
    }
  }

  await saveMensaje(candidato.id, 'assistant', reply);
  return reply;
}
