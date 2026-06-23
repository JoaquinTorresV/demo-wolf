// Construye el texto del CV de un candidato APTO para guardar en Drive.
import { CONTACTOS_ZONA } from './filters.js';

const SI_NO = (v) => (v === 'si' || v === true ? 'Sí' : v === 'no' || v === false ? 'No' : '—');

const PUESTO = {
  fijo_verano: 'Fijo de verano (campings y similares)',
  eventos: 'Eventos puntuales (fiestas de pueblo, conciertos...)',
};

function listaIdiomas(idiomas = {}) {
  const out = [];
  if (idiomas.castellano) out.push('castellano');
  if (idiomas.catalan) out.push('catalán');
  if (Array.isArray(idiomas.otros)) out.push(...idiomas.otros);
  return out.length ? out.join(', ') : '—';
}

// Devuelve { nombreArchivo, contenido } para subir como Google Doc.
export function construirCV(telefono, datos = {}, decision = {}) {
  const contacto = decision.contacto || CONTACTOS_ZONA[datos.zona] || null;
  const fecha = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const nombre = datos.nombre || '(no indicado)';

  const lineas = [
    'CV — Candidato Wolf Control',
    '====================================',
    '',
    `Nombre: ${nombre}`,
    `Teléfono: ${telefono}`,
    `Zona: ${datos.zona || '—'}` + (contacto ? `  →  Reclutador: ${contacto.nombre} (${contacto.telefono})` : ''),
    `Fecha: ${fecha}`,
    '',
    `RESULTADO: APTO  ·  Puntuación situacional: ${decision.puntuacion ?? '—'}/10`,
    `Puesto sugerido: ${PUESTO[decision.puesto] || '—'}`,
    '',
    'Datos del candidato',
    '------------------------------------',
    `• Vehículo propio: ${SI_NO(datos.vehiculo)}`,
    `• Carnet de conducir: ${SI_NO(datos.carnet)}`,
    `• Disponibilidad: ${datos.disponibilidad === 'fija' ? 'Fija (todo el verano)' : datos.disponibilidad === 'sueltos' ? 'Días sueltos' : '—'}`,
    `• Idiomas: ${listaIdiomas(datos.idiomas)}`,
    `• Experiencia previa: ${SI_NO(datos.experiencia)}`,
    '',
    'Respuestas a situaciones',
    '------------------------------------',
  ];

  (datos.situacionales || []).forEach((s, i) => {
    lineas.push(`${i + 1}. ${s.escenario}`);
    lineas.push(`   Respuesta: ${s.respuesta}`);
    lineas.push(`   Valoración: ${s.puntuacion}/10`);
    lineas.push('');
  });

  const slug = (datos.nombre || telefono).replace(/[^\w\sáéíóúñ-]/gi, '').trim().replace(/\s+/g, '_');
  return {
    nombreArchivo: `CV_${slug}_${datos.zona || 'sinzona'}`,
    contenido: lineas.join('\n'),
  };
}
