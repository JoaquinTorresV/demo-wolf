import { Router } from 'express';
import { parseInbound, enviarTexto, descargarAudio } from '../services/whatsapp/ycloud.js';
import { transcribir } from '../services/llm/openai.js';
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
    if (!inbound) return; // no es un mensaje aprovechable

    let texto = inbound.text;

    // Si es una nota de voz, descargar y transcribir.
    if (!texto && inbound.audio) {
      const media = await descargarAudio(inbound.audio);
      if (media?.buffer) {
        try {
          texto = await transcribir(media.buffer, 'audio.ogg', media.mimeType);
          console.log('[webhook] audio transcrito:', texto);
        } catch (err) {
          console.error('[webhook] error transcribiendo audio:', err.message);
        }
      }
    }

    // Si no pudimos entender nada, pedir que lo escriba.
    if (!texto) {
      await enviarTexto(inbound.from, 'Perdona, no he podido escuchar bien el audio 🙏 ¿Me lo puedes escribir?');
      return;
    }

    const respuesta = await procesarMensaje(inbound.from, texto);
    if (respuesta) {
      await enviarTexto(inbound.from, respuesta);
    }
  } catch (err) {
    console.error('[webhook] error procesando mensaje:', err);
  }
});
