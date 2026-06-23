// Prueba no-interactiva: corre guiones de candidato contra OpenAI y muestra la conversación.
// Uso: npm run probar   (requiere OPENAI_API_KEY en .env)
import 'dotenv/config';
import { procesarTurno } from '../src/services/bot/conversation.js';

if (!process.env.OPENAI_API_KEY) {
  console.error('Falta OPENAI_API_KEY en .env');
  process.exit(1);
}

const GUIONES = [
  {
    nombre: 'APTO esperado (Girona, todo OK)',
    mensajes: [
      'hola, vi que buscáis gente',
      'Soy de Girona, tengo coche propio y carnet de conducir. Hablo castellano y catalán. Puedo trabajar todo el verano.',
      'No, sería mi primer trabajo en seguridad',
      'Lo primero mantener la calma, avisaría al 112 y no dejaría sola a la persona hasta que llegue ayuda.',
      'Intentaría separarlos con calma, pediría refuerzos a mis compañeros y avisaría a la policía si hace falta.',
    ],
  },
  {
    nombre: 'NO APTO esperado (fuera de zona, sin vehículo)',
    mensajes: [
      'buenas',
      'Soy de Madrid, no tengo coche ni moto ni carnet, y solo hablo castellano.',
    ],
  },
];

for (const g of GUIONES) {
  console.log('\n══════════════════════════════════════════════');
  console.log('GUION:', g.nombre);
  console.log('══════════════════════════════════════════════');
  let datos = {};
  const historial = [];
  for (const texto of g.mensajes) {
    historial.push({ role: 'user', content: texto });
    const res = await procesarTurno({ datos, historial, mensaje: texto });
    datos = res.datos;
    historial.push({ role: 'assistant', content: res.reply });
    console.log(`\nTú:   ${texto}`);
    console.log(`Mark: ${res.reply}`);
    console.log(`      [${res.decision.resultado}${res.decision.motivo ? ' · ' + res.decision.motivo : ''}]`);
    if (['apto', 'no_apto', 'humano'].includes(res.decision.resultado)) break;
  }
  console.log('\nDatos finales:', JSON.stringify(datos));
}
console.log('\nListo.');
