# Wolf Control — Bot de selección por WhatsApp

Bot de WhatsApp que conversa con candidatos a empleo de **Wolf Control** (seguridad,
Cataluña) y los filtra según los criterios de la empresa.

- **Canal:** WhatsApp vía YCloud (API oficial).
- **Cerebro:** OpenAI `gpt-4.1-mini` — **solo conversa**, no decide.
- **Decisión apto/no apto:** lógica determinista en `src/services/bot/filters.js` (Fase 2).
- **Datos:** SQLite (integrado en Node, `node:sqlite`) — sin servicios externos.

## Arquitectura

```
WhatsApp → YCloud → POST /webhook → engine.js
   ├─ state.js   (estado y mensajes en SQLite)
   ├─ openai.js  (redacción natural de la respuesta)
   └─ filters.js (decisión determinista — Fase 2)
→ ycloud.js (responde por WhatsApp)
```

**Principio anti-alucinación:** el LLM nunca decide si alguien es apto. Solo conversa.
Los filtros duros y la puntuación viven en código (`filters.js`).

## Puesta en marcha (local)

1. `npm install`
2. Copiar `.env.example` a `.env` y rellenar:
   - `OPENAI_API_KEY`
   - `YCLOUD_API_KEY`, `YCLOUD_PHONE_NUMBER`, `YCLOUD_WEBHOOK_SECRET`
   - `SQLITE_PATH` (opcional; por defecto `./data/wolf.db`)
3. (Opcional) crear el esquema a mano — el servidor también lo hace solo al arrancar:
   ```
   npm run migrate
   ```
4. Arrancar:
   ```
   npm run dev      # con recarga
   npm start        # producción
   ```
5. Comprobar salud: `GET http://localhost:3000/health` → `{ "status": "ok" }`

## Webhook de YCloud

Apuntar el webhook de YCloud a:

```
https://TU-DOMINIO/webhook?secret=EL_VALOR_DE_YCLOUD_WEBHOOK_SECRET
```

Eventos: `whatsapp.inbound_message.received`.

## Deploy

VPS + EasyPanel + Docker. El `Dockerfile` expone el puerto 3000.

## Estado

- **Fase 1 (hecha):** esqueleto end-to-end — recibe, conversa con el LLM, guarda en BD, responde.
- **Fase 2 (pendiente de criterios del cliente):** árbol de decisión, knockouts,
  rúbrica de puntuación 1-10, derivación por zona. Ver `filters.js` y el plan.
