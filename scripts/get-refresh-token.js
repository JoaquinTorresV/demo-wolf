// Helper de una sola vez para obtener el GOOGLE_REFRESH_TOKEN.
// Levanta un servidor local en localhost:53682, captura el código de OAuth
// y lo cambia por el refresh token. Uso: node scripts/get-refresh-token.js
import 'dotenv/config';
import http from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 53682;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/drive';
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Falta GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

mkdirSync('data', { recursive: true });
writeFileSync('data/auth-url.txt', authUrl);
console.log('Abre este enlace:\n' + authUrl);
console.log('\nEsperando la respuesta de Google en ' + REDIRECT + ' ...');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get('code');
  if (!code) {
    res.end('Esperando el código de autorización...');
    return;
  }
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }),
    });
    const data = await r.json();
    if (data.refresh_token) {
      writeFileSync('data/refresh-token.txt', data.refresh_token);
      console.log('\n✅ REFRESH TOKEN OBTENIDO:\n' + data.refresh_token);
      res.end('¡Listo! Ya puedes cerrar esta pestaña y volver a la terminal.');
    } else {
      console.error('No llegó refresh_token:', JSON.stringify(data));
      res.end('Error: ' + JSON.stringify(data));
    }
  } catch (err) {
    console.error('Error:', err.message);
    res.end('Error: ' + err.message);
  } finally {
    setTimeout(() => { server.close(); process.exit(0); }, 800);
  }
});

server.listen(PORT);
