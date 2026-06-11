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
