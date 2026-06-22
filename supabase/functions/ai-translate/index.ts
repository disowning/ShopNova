import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AiTranslateRequest {
  endpoint?: string;
  model?: string;
  temperature?: number;
  messages?: ChatMessage[];
  apiKey?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

const CHAT_COMPLETIONS_PATH = '/chat/completions';
const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const body = await req.json() as AiTranslateRequest;
    const endpoint = normalizeEndpoint(body.endpoint || Deno.env.get('AI_TRANSLATION_ENDPOINT') || DEFAULT_ENDPOINT);
    const model = cleanText(body.model || Deno.env.get('AI_TRANSLATION_MODEL') || DEFAULT_MODEL);
    const apiKey = resolveApiKey(body.apiKey);
    const temperature = clampNumber(body.temperature, 0.2, 0, 1);
    const messages = normalizeMessages(body.messages);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, temperature, messages }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return jsonResponse({
        error: toProviderErrorMessage(response.status, responseText),
      }, { status: 400 });
    }

    let payload: ChatCompletionResponse;
    try {
      payload = JSON.parse(responseText) as ChatCompletionResponse;
    } catch {
      throw new Error('AI provider did not return Chat Completions JSON');
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI provider returned an empty message');
    return jsonResponse({ content });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : 'AI translation failed',
    }, { status: 400 });
  }
});

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeEndpoint(value: string) {
  const endpoint = cleanText(value);
  if (!endpoint) throw new Error('Missing AI endpoint');

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('AI endpoint must be a valid URL');
  }

  const path = url.pathname.replace(/\/+$/, '').toLowerCase();
  if (!path.endsWith(CHAT_COMPLETIONS_PATH)) {
    throw new Error('AI endpoint must be a full Chat Completions URL, for example https://api.openai.com/v1/chat/completions');
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('AI endpoint must use HTTPS in production');
  }

  return url.toString();
}

function resolveApiKey(clientKey?: string) {
  const envKey = cleanText(Deno.env.get('AI_TRANSLATION_API_KEY'));
  if (envKey) return envKey;

  const allowClientKey = cleanText(Deno.env.get('ALLOW_CLIENT_AI_TRANSLATION_KEY')).toLowerCase() === 'true';
  const submittedKey = cleanText(clientKey);
  if (allowClientKey && submittedKey) return submittedKey;

  throw new Error('Missing AI_TRANSLATION_API_KEY Supabase Secret');
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Missing AI messages');

  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid AI message');
    const record = item as Record<string, unknown>;
    const role = record.role;
    const content = cleanText(record.content);
    if (role !== 'system' && role !== 'user' && role !== 'assistant') throw new Error('Invalid AI message role');
    if (!content) throw new Error('Invalid AI message content');
    return { role, content };
  });
}

function toProviderErrorMessage(status: number, responseText: string) {
  let providerMessage = responseText.slice(0, 240) || `HTTP ${status}`;
  try {
    const payload = JSON.parse(responseText) as ChatCompletionResponse;
    providerMessage = payload.error?.message ?? providerMessage;
  } catch {
    // Keep raw provider text.
  }

  if (status === 401) return `AI API key is invalid or unauthorized: ${providerMessage}`;
  if (status === 403) return `AI account or model has no permission: ${providerMessage}`;
  if (status === 404) return `AI endpoint or model was not found: ${providerMessage}`;
  if (status === 429) return `AI quota or rate limit exceeded: ${providerMessage}`;
  if (status >= 500) return `AI provider is temporarily unavailable: ${providerMessage}`;
  return `AI provider request failed: ${providerMessage}`;
}
