// LLM-judge: puntúa de 0 a 10 la respuesta del candidato a una situación.
// Rúbrica de anclas para que la nota sea consistente y no "a ojo".
// (Se calibrará con ejemplos reales de Wolf Control; arrancamos con esta base.)
import { chat } from '../llm/openai.js';

const RUBRICA = `Eres un evaluador de RRHH de una empresa de seguridad. Puntúa de 0 a 10 la respuesta
del candidato a una situación real del puesto. Lo que más valoramos: mantener la calma, criterio,
responsabilidad y compromiso (no abandonar el puesto ni a la persona).

Anclas:
- 8-10: reacciona con calma, actúa de forma correcta y responsable, avisa/pide ayuda, no abandona.
- 5-7: intención correcta pero respuesta incompleta o vaga.
- 0-4: red flag: se desentiende, huye, reacciona con violencia o falta de criterio.

Devuelve SOLO un JSON: {"puntuacion": <entero 0-10>, "razon": "<breve>"}.`;

export async function puntuarSituacion(escenario, respuesta) {
  const out = await chat({
    temperature: 0,
    json: true,
    messages: [
      { role: 'system', content: RUBRICA },
      { role: 'user', content: `SITUACIÓN: ${escenario}\nRESPUESTA DEL CANDIDATO: ${respuesta}` },
    ],
  });

  let p = Number(out?.puntuacion);
  if (!Number.isFinite(p)) p = 0;
  p = Math.max(0, Math.min(10, Math.round(p)));
  return { puntuacion: p, razon: out?.razon || '' };
}
