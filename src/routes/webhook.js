import { Router } from 'express';
import { parseInbound, enviarTexto } from '../services/whatsapp/ycloud.js';
import { procesarMensaje } from '../services/bot/engine.js';

export const webhookRouter = Router();

// YCloud reenvía los mensajes entrantes acá.
// Validación: secreto compartido en query (?secret=) o header.
webhookRouter.post('/webhook', async (req, res) => {
  const expected = process.env.YCLOUD_WEBHOOK_SECRET;
  if (expected) {
    const got = req.query.secret || req.get('x-webhook-secret');
    if (got !== expected) {
      return res.status(401).json({ error: 'secret inválido' });
    }
  }

  // Responder rápido a YCloud; procesar en segundo plano.
  res.status(200).json({ ok: true });

  try {
    const inbound = parseInbound(req.body);
    if (!inbound) return; // no es un mensaje de texto entrante

    const respuesta = await procesarMensaje(inbound.from, inbound.text);
    if (respuesta) {
      await enviarTexto(inbound.from, respuesta);
    }
  } catch (err) {
    console.error('[webhook] error procesando mensaje:', err);
  }
});
