// Sube el CV de un candidato a Google Drive, en carpetas que el propio bot crea
// (y por tanto posee → sin problemas de permisos). Usa OAuth (Client ID/Secret +
// Refresh Token), sin dependencias externas. No crítico: si falla, loguea y sigue.
import 'dotenv/config';
import { getConfig, setConfig, delConfig } from '../../db/db.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true';

const CARPETA_PADRE = process.env.DRIVE_PARENT_NAME || 'Wolf Control - Aptos';
const KEY_PADRE = 'drive_folder_parent';
const keySub = (nombre) => `drive_folder_sub_${nombre}`;

function configCompleta() {
  return (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

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
  return (await res.json()).access_token || null;
}

// Devuelve el ID de una carpeta. Prioridad: ID recordado (a prueba de renombrado) →
// búsqueda por nombre → crearla. Guarda el ID encontrado/creado para la próxima vez.
async function ensureFolder(token, nombre, parentId, configKey) {
  const recordado = getConfig(configKey);
  if (recordado) return recordado;

  const filtros = [
    `name = '${nombre.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ];
  if (parentId) filtros.push(`'${parentId}' in parents`);

  const q = encodeURIComponent(filtros.join(' and '));
  const buscar = await fetch(
    `${FILES_URL}?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (buscar.ok) {
    const data = await buscar.json();
    if (data.files?.length) {
      setConfig(configKey, data.files[0].id);
      return data.files[0].id;
    }
  }

  // No existe → crearla.
  const crear = await fetch(`${FILES_URL}?supportsAllDrives=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: nombre,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  if (!crear.ok) {
    console.error('[drive] no se pudo crear la carpeta', nombre, crear.status, await crear.text());
    return null;
  }
  const folder = await crear.json();
  setConfig(configKey, folder.id);
  console.log('[drive] carpeta creada:', nombre, folder.id);
  return folder.id;
}

// Sube el CV como Google Doc dentro de "Wolf Control - Aptos / <subcarpeta>".
export async function subirCV(nombreArchivo, contenido, subcarpeta = 'Otros') {
  if (!configCompleta()) {
    console.warn('[drive] config incompleta (falta CLIENT_ID/SECRET/REFRESH_TOKEN); no se sube el CV.');
    return null;
  }

  try {
    const token = await getAccessToken();
    if (!token) return null;

    const padreId = await ensureFolder(token, CARPETA_PADRE, null, KEY_PADRE);
    if (!padreId) return null;
    const carpetaId = await ensureFolder(token, subcarpeta, padreId, keySub(subcarpeta));
    if (!carpetaId) return null;

    const metadata = {
      name: nombreArchivo,
      parents: [carpetaId],
      mimeType: 'application/vnd.google-apps.document',
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
      // Si la carpeta recordada ya no existe (borrada/movida), olvida los IDs para
      // recrearlas en el próximo candidato.
      if (res.status === 404) {
        delConfig(KEY_PADRE);
        delConfig(keySub(subcarpeta));
        console.warn('[drive] carpetas olvidadas; se recrearán en el próximo apto.');
      }
      return null;
    }
    const data = await res.json();
    console.log(`[drive] CV subido a "${CARPETA_PADRE}/${subcarpeta}":`, data.id, nombreArchivo);
    return data.id;
  } catch (err) {
    console.error('[drive] excepción subiendo el CV:', err.message);
    return null;
  }
}
