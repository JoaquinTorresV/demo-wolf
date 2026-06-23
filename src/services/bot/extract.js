// Extracción estructurada: lee la conversación y rellena los campos del candidato.
// NO inventa: si un dato no está claro, lo deja en null. El que decide es filters.js.
import { chat } from '../llm/openai.js';

const INSTR = `Eres un extractor de datos para un proceso de selección de Wolf Control (seguridad, Cataluña).
A partir de la conversación, devuelve SOLO un JSON con estos campos. Si un dato NO se ha mencionado
o no está claro, déjalo en null. No deduzcas ni inventes.

{
  "nombre":         // nombre del candidato si lo menciona, o null.
  "zona":           // "girona" | "barcelona" | "tarragona" si el pueblo/ciudad pertenece a esa provincia;
                    // "cercana" si es un pueblo limítrofe o dudoso de Cataluña; "lejana" si está claramente
                    // fuera de esas zonas; null si no lo ha dicho.
  "vehiculo":       // "si" si tiene coche o moto propio; "taller" si lo tiene pero está en el taller / llega pronto;
                    // "no" si no tiene; null si no se sabe.
  "carnet":         // true si tiene carnet de conducir, false si no, null si no se sabe.
  "disponibilidad": // "fija" (todo el verano / fijo, ej. campings), "sueltos" (días sueltos, fiestas/eventos),
                    // "mas_adelante" (solo puede dentro de un tiempo), "ninguna", o null.
  "idiomas":        // objeto { "castellano": true/false/null, "catalan": true/false/null, "otros": ["..."] }
                    // castellano es lo único obligatorio; catalán y otros suman pero no descartan.
  "experiencia":    // "si" | "no" | null (informativo, no descarta)
}

Devuelve únicamente el JSON.`;

const CAMPOS = ['nombre', 'zona', 'vehiculo', 'carnet', 'disponibilidad', 'idiomas', 'experiencia'];

function fusionar(actual, nuevo) {
  const out = { ...actual };
  for (const k of CAMPOS) {
    const v = nuevo?.[k];
    if (v === undefined || v === null) continue;
    if (k === 'idiomas') {
      const prev = actual.idiomas || {};
      out.idiomas = {
        castellano: v.castellano ?? prev.castellano ?? null,
        catalan: v.catalan ?? prev.catalan ?? null,
        otros: (v.otros && v.otros.length ? v.otros : prev.otros) || [],
      };
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function extraerDatos(historial, datosActuales = {}) {
  const transcript = historial
    .map((m) => `${m.role === 'user' ? 'Candidato' : 'Marc'}: ${m.content}`)
    .join('\n');

  const nuevo = await chat({
    temperature: 0,
    json: true,
    messages: [
      { role: 'system', content: INSTR },
      { role: 'user', content: `CONVERSACIÓN:\n${transcript}\n\nDATOS YA CONOCIDOS:\n${JSON.stringify(datosActuales)}` },
    ],
  });

  return fusionar(datosActuales, nuevo);
}
