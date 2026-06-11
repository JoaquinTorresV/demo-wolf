// Cliente YCloud para enviar mensajes de WhatsApp.
// Docs: https://docs.ycloud.com/reference
import 'dotenv/config';

const API_BASE = 'https://api.ycloud.com/v2';

export async function enviarTexto(to, body) {
  const apiKey = process.env.YCLOUD_API_KEY;
  const from = process.env.YCLOUD_PHONE_NUMBER;

  if (!apiKey || !from) {
    console.warn('[ycloud] faltan YCLOUD_API_KEY o YCLOUD_PHONE_NUMBER; no se envía.');
    return null;
  }

  const res = await fetch(`${API_BASE}/whatsapp/messages/sendDirectly`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      type: 'text',
      text: { body },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error(`[ycloud] error ${res.status} enviando a ${to}:`, detail);
    return null;
  }

  return res.json();
}

// Busca un contacto por número. Devuelve { id, tags } o null.
// (El nombre del filtro debe confirmarse contra YCloud en la primera prueba real.)
async function buscarContacto(phoneNumber, apiKey) {
  const res = await fetch(
    `${API_BASE}/contact/contacts?phoneNumber=${encodeURIComponent(phoneNumber)}`,
    { headers: { 'X-API-Key': apiKey } },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const item = data?.items?.[0] || data?.data?.[0] || null;
  return item ? { id: item.id, tags: item.tags || [] } : null;
}

// Añade etiquetas a un contacto (sin pisar las que ya tenga). No crítico: si falla,
// se loguea pero no rompe la conversación.
export async function aplicarEtiquetas(phoneNumber, nuevasTags = []) {
  const apiKey = process.env.YCLOUD_API_KEY;
  if (!apiKey || nuevasTags.length === 0) return null;

  try {
    const existente = await buscarContacto(phoneNumber, apiKey);
    const tags = Array.from(new Set([...(existente?.tags || []), ...nuevasTags])).slice(0, 50);

    const url = existente?.id
      ? `${API_BASE}/contact/contacts/${existente.id}`
      : `${API_BASE}/contact/contacts`;
    const method = existente?.id ? 'PATCH' : 'POST';
    const body = existente?.id ? { tags } : { phoneNumber, tags };

    const res = await fetch(url, {
      method,
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[ycloud] error ${res.status} etiquetando ${phoneNumber}:`, await res.text());
      return null;
    }
    return res.json();
  } catch (err) {
    console.error('[ycloud] excepción etiquetando:', err.message);
    return null;
  }
}

// Extrae { from, text } de un evento de webhook de YCloud (inbound message).
// Devuelve null si el evento no es un mensaje de texto entrante.
export function parseInbound(payload) {
  const msg = payload?.whatsappInboundMessage || payload?.message || payload;
  if (!msg) return null;

  const from = msg.from || msg.customerProfile?.phoneNumber;
  const text = msg.text?.body ?? msg.body ?? null;

  if (!from || !text) return null;
  return { from, text };
}
