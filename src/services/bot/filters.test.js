// Test del árbol de decisión. Sin dependencias externas: node src/services/bot/filters.test.js
import assert from 'node:assert';
import { evaluarCandidato, puestoSegunDisponibilidad } from './filters.js';

let pass = 0, fail = 0;
function t(nombre, fn) {
  try { fn(); pass++; console.log('  ✓', nombre); }
  catch (e) { fail++; console.log('  ✗', nombre, '\n      ', e.message); }
}

// Plantilla de candidato que pasa todos los filtros duros.
const base = () => ({
  zona: 'barcelona',
  vehiculo: 'si',
  carnet: true,
  disponibilidad: 'fija',
  idiomas: { castellano: true, catalan: true },
  experiencia: 'no',
});

console.log('Árbol de decisión — Wolf Control');

t('apto: cumple todo + situacional ≥5', () => {
  const r = evaluarCandidato({ ...base(), situacionales: [{ puntuacion: 7 }, { puntuacion: 6 }] });
  assert.equal(r.resultado, 'apto');
  assert.equal(r.zona, 'barcelona');
  assert.equal(r.puesto, 'fijo_verano');
  assert.equal(r.contacto.nombre, 'Demba');
});

t('en_proceso: pasó duros pero falta situacional', () => {
  assert.equal(evaluarCandidato(base()).resultado, 'en_proceso');
});

t('en_proceso: falta información (sin idiomas)', () => {
  const d = base(); d.idiomas = null;
  assert.equal(evaluarCandidato(d).resultado, 'en_proceso');
});

t('no_apto: sin vehículo ni carnet', () => {
  const r = evaluarCandidato({ ...base(), vehiculo: 'no', carnet: false });
  assert.equal(r.resultado, 'no_apto');
});

t('no_apto: tiene vehículo pero no carnet', () => {
  const r = evaluarCandidato({ ...base(), vehiculo: 'si', carnet: false });
  assert.equal(r.resultado, 'no_apto');
});

t('apto: no habla catalán pero sí castellano (catalán no descarta)', () => {
  const r = evaluarCandidato({ ...base(), idiomas: { castellano: true, catalan: false }, situacionales: [{ puntuacion: 6 }, { puntuacion: 6 }] });
  assert.equal(r.resultado, 'apto');
});

t('no_apto: no habla castellano', () => {
  const r = evaluarCandidato({ ...base(), idiomas: { castellano: false, catalan: true } });
  assert.equal(r.resultado, 'no_apto');
});

t('en_proceso: castellano aún en null no descarta', () => {
  const d = base(); d.idiomas = { castellano: null, catalan: null };
  assert.equal(evaluarCandidato(d).resultado, 'en_proceso');
});

t('no_apto: zona lejana', () => {
  const r = evaluarCandidato({ ...base(), zona: 'lejana' });
  assert.equal(r.resultado, 'no_apto');
});

t('no_apto: situacional bajo (<5)', () => {
  const r = evaluarCandidato({ ...base(), situacionales: [{ puntuacion: 3 }, { puntuacion: 4 }] });
  assert.equal(r.resultado, 'no_apto');
});

t('humano: vehículo en el taller', () => {
  const r = evaluarCandidato({ ...base(), vehiculo: 'taller' });
  assert.equal(r.resultado, 'humano');
});

t('humano: solo disponible más adelante', () => {
  const r = evaluarCandidato({ ...base(), disponibilidad: 'mas_adelante' });
  assert.equal(r.resultado, 'humano');
});

t('humano: zona cercana a confirmar', () => {
  const r = evaluarCandidato({ ...base(), zona: 'cercana' });
  assert.equal(r.resultado, 'humano');
});

t('prioridad: knockout definitivo gana sobre caso humano', () => {
  // no habla castellano (no_apto) + vehículo en taller (humano) → debe ganar no_apto
  const r = evaluarCandidato({ ...base(), idiomas: { castellano: false, catalan: true }, vehiculo: 'taller' });
  assert.equal(r.resultado, 'no_apto');
});

t('puesto: disponibilidad días sueltos → eventos', () => {
  assert.equal(puestoSegunDisponibilidad('sueltos'), 'eventos');
});

console.log(`\n${pass} pasados, ${fail} fallados`);
process.exit(fail ? 1 : 0);
