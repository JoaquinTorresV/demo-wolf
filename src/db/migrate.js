// Crea el esquema (idempotente). El servidor también lo hace solo al arrancar,
// pero se puede correr a mano: npm run migrate
import { ensureSchema } from './db.js';

ensureSchema();
console.log('[migrate] esquema aplicado correctamente.');
