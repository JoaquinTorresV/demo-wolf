// Wrapper de OpenAI. El LLM SOLO conversa y extrae datos; NUNCA decide apto/no apto
// (eso lo hace bot/filters.js de forma determinista).
import OpenAI, { toFile } from 'openai';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SYSTEM_PROMPT = readFileSync(
  join(__dirname, '../../../prompts/system.md'),
  'utf8',
);

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

// Cliente perezoso: se construye en el primer uso, no al cargar el módulo.
let _client;
function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// Llamada genérica. Si json=true, parsea y devuelve un objeto.
export async function chat({ messages, json = false, temperature = 0.6, model }) {
  const completion = await getClient().chat.completions.create({
    model: model || MODEL,
    temperature,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
    messages,
  });
  const content = completion.choices[0]?.message?.content?.trim() || '';
  if (!json) return content;
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// Transcribe un audio (Buffer) a texto. WhatsApp manda OGG/Opus, compatible con Whisper.
export async function transcribir(buffer, filename = 'audio.ogg', mimeType = 'audio/ogg') {
  const file = await toFile(buffer, filename, { type: mimeType });
  const res = await getClient().audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1',
    language: 'es',
  });
  return res.text?.trim() || '';
}
