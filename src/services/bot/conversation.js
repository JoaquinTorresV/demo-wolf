// Orquesta un turno de conversación. SIN base de datos ni WhatsApp: lógica pura,
// para poder testearla con un simulador. engine.js le pone la persistencia alrededor.
import { SYSTEM_PROMPT, chat } from '../llm/openai.js';
import { extraerDatos } from './extract.js';
import { puntuarSituacion } from './scoring.js';
import {
  evaluarCandidato,
  camposFaltantes,
  CONTACTOS_ZONA,
} from './filters.js';

// Situaciones que plantea Mark (2-3, decidido con el cliente). El nº requerido
// vive en filters.js (SITUACIONES_REQUERIDAS) y debe coincidir con esta lista.
const SITUACIONES = [
  'estás cubriendo tu puesto y, de repente, una persona se desmaya delante de ti. ¿Qué harías?',
  'se monta una pelea entre dos personas en la entrada del recinto. ¿Cómo actúas?',
];

// Etiquetas legibles de los campos que faltan, para guiar la pregunta de Mark.
const ETIQUETA_CAMPO = {
  zona: 'de qué pueblo o ciudad es (para saber su zona)',
  vehiculo: 'si tiene coche o moto propio y carnet de conducir',
  disponibilidad: 'qué disponibilidad tiene: días sueltos (fiestas/eventos) o fija para todo el verano (campings)',
  idiomas: 'qué idiomas habla (el castellano es imprescindible; el catalán y otros suman)',
};

function esPrimerTurno(historial) {
  return !historial.some((m) => m.role === 'assistant');
}

async function generar(historial, instruccion, temperature = 0.8) {
  return chat({
    temperature,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historial,
      { role: 'system', content: `INSTRUCCIÓN PARA ESTE TURNO (no la menciones literalmente): ${instruccion}` },
    ],
  });
}

// La conversación ya está cerrada (apto/no_apto/humano) y la persona sigue escribiendo
// (agradece, se despide...). Respuesta breve y cordial, SIN repetir el veredicto.
export async function respuestaConversacionCerrada(historial) {
  return generar(
    historial,
    'La conversación de selección YA terminó. La persona solo está agradeciendo o ' +
      'despidiéndose. Respóndele en UNA línea, cálido y natural, como un cierre cordial. ' +
      'NO repitas el resultado, ni los siguientes pasos, ni que un compañero le contactará. ' +
      'Nada de discursos: solo despídete con naturalidad.',
  );
}

async function generarCierre(decision, historial, datos) {
  let instr;
  if (decision.resultado === 'apto') {
    const c = decision.contacto || CONTACTOS_ZONA[datos.zona];
    const puesto = decision.puesto === 'fijo_verano'
      ? 'trabajo fijo de verano (campings y similares)'
      : 'eventos puntuales (fiestas de pueblo, conciertos...)';
    instr = `El candidato ENCAJA en el perfil para ${puesto}. Cierra de forma cálida y natural: dile que ` +
      `tiene buena pinta para el equipo, que un compañero de su zona${c ? ` (${c.nombre})` : ''} se pondrá en ` +
      `contacto con él para concretar los siguientes pasos. NO le prometas el puesto definitivo ni des sueldos exactos salvo que ya hayan salido.`;
  } else if (decision.resultado === 'humano') {
    instr = `Este caso lo tiene que revisar una persona del equipo (motivo interno: ${decision.motivo}). ` +
      `Dile con naturalidad y sin tecnicismos que un compañero le escribirá en breve para afinar un par de detalles. No le digas que ha sido rechazado.`;
  } else { // no_apto
    instr = `Para esta posición el perfil no encaja. Despídete con amabilidad y respeto, agradeciendo su interés. ` +
      `NO des detalles técnicos del descarte ni suene a rechazo frío. Deja la puerta abierta a futuras oportunidades.`;
  }
  return generar(historial, instr);
}

// procesarTurno({ datos, historial, mensaje }) → { datos, reply, decision }
// `historial` debe incluir el último mensaje del usuario como último elemento.
export async function procesarTurno({ datos = {}, historial, mensaje }) {
  datos = { ...datos };
  datos.situacionales = datos.situacionales || [];

  // 1) Si estábamos esperando respuesta a una situación, puntúala.
  if (datos.escenarioPendiente) {
    const { puntuacion } = await puntuarSituacion(datos.escenarioPendiente, mensaje);
    datos.situacionales.push({ escenario: datos.escenarioPendiente, respuesta: mensaje, puntuacion });
    datos.escenarioPendiente = null;
  } else {
    // 2) Si no, extrae datos de filtros duros de la conversación.
    datos = await extraerDatos(historial, datos);
  }

  // 3) Decisión determinista.
  const decision = evaluarCandidato(datos);

  // 4) ¿Decisión final? → mensaje de cierre.
  if (['apto', 'no_apto', 'humano'].includes(decision.resultado)) {
    const reply = await generarCierre(decision, historial, datos);
    return { datos, reply, decision };
  }

  // 5) Fase situacional: plantear la siguiente situación.
  if (decision.fase === 'situacional') {
    const siguiente = SITUACIONES[datos.situacionales.length];
    if (siguiente) {
      datos.escenarioPendiente = siguiente;
      const reply = await generar(
        historial,
        `Plantéale de forma natural esta situación para ver cómo reaccionaría: "${siguiente}". Hazlo conversacional, no como un test.`,
      );
      return { datos, reply, decision };
    }
  }

  // 6) Aún faltan filtros duros: pregunta por uno de forma natural.
  const faltan = camposFaltantes(datos);
  const objetivo = ETIQUETA_CAMPO[faltan[0]] || 'lo que necesites para conocerle mejor';
  const intro = esPrimerTurno(historial)
    ? 'Es tu primer mensaje: preséntate en una frase breve como Mark, del equipo de selección de Wolf Control, y luego '
    : '';
  const reply = await generar(
    historial,
    `${intro}pregunta de forma natural por ${objetivo}. Una sola pregunta, reacciona antes a lo último que dijo.`,
  );
  return { datos, reply, decision };
}
