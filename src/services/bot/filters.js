// ─────────────────────────────────────────────────────────────
// Lógica DETERMINISTA de filtrado de Wolf Control.
//
// Este módulo DECIDE apto / no apto / derivar a humano. El LLM nunca
// decide: solo conversa y extrae datos. Acá viven los knockouts.
//
// Resultados posibles:
//   'apto'      → pasa todos los filtros duros
//   'no_apto'   → falla un filtro duro de forma definitiva
//   'humano'    → caso límite que un reclutador debe revisar
//   'en_proceso'→ aún falta información para decidir
// ─────────────────────────────────────────────────────────────

// Contactos de reclutador por provincia (del cuestionario de Wolf Control).
export const CONTACTOS_ZONA = {
  girona:    { nombre: 'Marc',  telefono: '608755818' },
  barcelona: { nombre: 'Demba', telefono: '722361134' },
  tarragona: { nombre: 'Santi', telefono: '698540193' },
};

// Salarios a comunicar (informativo, del cuestionario).
export const SALARIOS = {
  auxiliar: { base: 8.5, eventos: 9 },          // €/hora
  controlador_acceso: { min: 10, max: 12 },     // €/hora (requiere TIP)
};

// Forma del objeto `datos` que el motor va completando desde la conversación:
// {
//   zona:           'girona'|'barcelona'|'tarragona'|'cercana'|'lejana'|null,
//   vehiculo:       'si'|'no'|'taller'|null,        // coche o moto
//   carnet:         true|false|null,
//   disponibilidad: 'fija'|'sueltos'|'mas_adelante'|'ninguna'|null,
//   idiomas:        { castellano: bool, catalan: bool } | null,
//   experiencia:    'si'|'no'|null,                 // informativo, no descarta
//   situacionales:  [ { pregunta, puntuacion }... ],// 0-10 (LLM-judge)
// }

// Zonas que cuentan como válidas directas vs. de revisión humana.
const ZONAS_VALIDAS = ['girona', 'barcelona', 'tarragona'];

// ── Filtros duros individuales ──
// Cada uno devuelve { estado: 'ok'|'no_apto'|'humano'|'falta', motivo }

function checkZona(d) {
  if (d.zona == null) return { estado: 'falta' };
  if (ZONAS_VALIDAS.includes(d.zona)) return { estado: 'ok' };
  if (d.zona === 'cercana') return { estado: 'humano', motivo: 'zona cercana a confirmar' };
  return { estado: 'no_apto', motivo: 'fuera de zona de cobertura' };
}

function checkVehiculo(d) {
  // Vehículo (coche o moto) + carnet son obligatorios para movilizarse.
  if (d.vehiculo == null || d.carnet == null) return { estado: 'falta' };
  if (d.vehiculo === 'taller') return { estado: 'humano', motivo: 'vehículo en el taller, disponible pronto' };
  if (d.vehiculo === 'si' && d.carnet === true) return { estado: 'ok' };
  // Sin vehículo ni carnet → descarte. Sin carnet aunque tenga vehículo tampoco moviliza.
  return { estado: 'no_apto', motivo: 'sin vehículo propio y/o carnet de conducir' };
}

function checkDisponibilidad(d) {
  if (d.disponibilidad == null) return { estado: 'falta' };
  if (d.disponibilidad === 'fija' || d.disponibilidad === 'sueltos') return { estado: 'ok' };
  if (d.disponibilidad === 'mas_adelante') return { estado: 'humano', motivo: 'solo disponible más adelante' };
  return { estado: 'no_apto', motivo: 'sin disponibilidad' };
}

function checkIdiomas(d) {
  const i = d.idiomas;
  if (i == null) return { estado: 'falta' };
  // Alguno explícitamente false → descarta (castellano y catalán son obligatorios).
  if (i.castellano === false || i.catalan === false) {
    return { estado: 'no_apto', motivo: 'no cumple idiomas obligatorios (castellano y catalán)' };
  }
  // Ambos confirmados → ok.
  if (i.castellano === true && i.catalan === true) return { estado: 'ok' };
  // Si alguno sigue en null, todavía falta información.
  return { estado: 'falta' };
}

// Mapea disponibilidad → tipo de puesto que se le ofrece.
export function puestoSegunDisponibilidad(disponibilidad) {
  if (disponibilidad === 'fija') return 'fijo_verano';   // campings, etc.
  if (disponibilidad === 'sueltos') return 'eventos';    // fiestas de pueblo / eventos
  return null;
}

// Nota mínima en situacionales para considerarse apto (≥5 según Wolf Control).
const UMBRAL_SITUACIONAL = 5;
// Cuántas preguntas situacionales se hacen antes de decidir (2-3, decidido con el cliente).
export const SITUACIONES_REQUERIDAS = 2;

// Estado de cada filtro duro por separado (para saber qué falta preguntar).
export function estadoFiltros(datos = {}) {
  return {
    zona: checkZona(datos),
    vehiculo: checkVehiculo(datos),       // cubre vehículo + carnet
    disponibilidad: checkDisponibilidad(datos),
    idiomas: checkIdiomas(datos),
  };
}

// Lista de filtros duros que aún no tienen información suficiente.
export function camposFaltantes(datos = {}) {
  const e = estadoFiltros(datos);
  return Object.keys(e).filter((k) => e[k].estado === 'falta');
}

// Evalúa el candidato completo y devuelve la decisión determinista.
// `datos` es el objeto descrito arriba.
export function evaluarCandidato(datos = {}) {
  const checks = [
    checkZona(datos),
    checkVehiculo(datos),
    checkDisponibilidad(datos),
    checkIdiomas(datos),
  ];

  // 1) Un knockout definitivo descarta de inmediato.
  const ko = checks.find((c) => c.estado === 'no_apto');
  if (ko) return { resultado: 'no_apto', motivo: ko.motivo };

  // 2) Un caso límite manda a humano (prioridad sobre seguir preguntando).
  const review = checks.find((c) => c.estado === 'humano');
  if (review) return { resultado: 'humano', motivo: review.motivo };

  // 3) Si falta info de algún filtro duro, seguimos en proceso.
  if (checks.some((c) => c.estado === 'falta')) {
    return { resultado: 'en_proceso' };
  }

  // 4) Pasó todos los duros. Faltan las pruebas situacionales para cerrar.
  const sit = datos.situacionales || [];
  if (sit.length < SITUACIONES_REQUERIDAS) return { resultado: 'en_proceso', fase: 'situacional' };

  const promedio = sit.reduce((a, s) => a + (s.puntuacion || 0), 0) / sit.length;
  if (promedio < UMBRAL_SITUACIONAL) {
    return { resultado: 'no_apto', motivo: 'puntuación situacional baja', puntuacion: Math.round(promedio) };
  }

  // 5) APTO.
  return {
    resultado: 'apto',
    puntuacion: Math.round(promedio),
    zona: datos.zona,
    puesto: puestoSegunDisponibilidad(datos.disponibilidad),
    contacto: CONTACTOS_ZONA[datos.zona] || null,
  };
}
