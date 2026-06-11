// Simulador de conversación con Mark, en la terminal. No usa WhatsApp ni BD.
// Uso: npm run simular   (requiere OPENAI_API_KEY en .env)
import 'dotenv/config';
import readline from 'node:readline';
import { procesarTurno } from '../src/services/bot/conversation.js';

if (!process.env.OPENAI_API_KEY) {
  console.error('Falta OPENAI_API_KEY en .env');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pregunta = (q) => new Promise((res) => rl.question(q, res));

let datos = {};
const historial = [];

console.log('\n=== Simulador: chat con Mark (Wolf Control) ===');
console.log('Escribe "hola" para empezar. Ctrl+C para salir.\n');

while (true) {
  const texto = await pregunta('Tú: ');
  if (!texto.trim()) continue;

  historial.push({ role: 'user', content: texto });
  const res = await procesarTurno({ datos, historial, mensaje: texto });
  datos = res.datos;
  historial.push({ role: 'assistant', content: res.reply });

  console.log(`\nMark: ${res.reply}`);
  console.log(`      [estado: ${res.decision.resultado}${res.decision.motivo ? ' · ' + res.decision.motivo : ''}]\n`);

  if (['apto', 'no_apto', 'humano'].includes(res.decision.resultado)) {
    console.log('--- Conversación cerrada. Datos finales: ---');
    console.log(JSON.stringify(datos, null, 2));
    break;
  }
}

rl.close();
