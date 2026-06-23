// Sube el CV de un candidato a la carpeta "Aptos" de Google Drive.
// Usa OAuth (Client ID/Secret + Refresh Token) — sin dependencias externas.
// No crítico: si falla o falta config, se loguea pero no rompe el flujo.
import 'dotenv/config';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true';

function configCompleta() {
  return (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.DRIVE_FOLDER_ID
  );
}

// Intercambia el refresh token por un access token de corta duración.
async function getAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    console.error('[drive] no se pudo refrescar el token:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.access_token || null;
}

// Sube un documento de texto como Google Doc dentro de la carpeta Aptos.
// Devuelve el id del archivo o null.
export async function subirCV(nombreArchivo, contenido) {
  if (!configCompleta()) {
    console.warn('[drive] config incompleta (falta CLIENT_ID/SECRET/REFRESH_TOKEN/FOLDER_ID); no se sube el CV.');
    return null;
  }

  try {
    const token = await getAccessToken();
    if (!token) return null;

    const metadata = {
      name: nombreArchivo,
      parents: [process.env.DRIVE_FOLDER_ID],
      mimeType: 'application/vnd.google-apps.document', // se convierte a Google Doc
    };

    const boundary = 'wolfcv' + Date.now();
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
      `${contenido}\r\n` +
      `--${boundary}--`;

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      console.error('[drive] error subiendo el CV:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    console.log('[drive] CV subido:', data.id, nombreArchivo);
    return data.id;
  } catch (err) {
    console.error('[drive] excepción subiendo el CV:', err.message);
    return null;
  }
}
