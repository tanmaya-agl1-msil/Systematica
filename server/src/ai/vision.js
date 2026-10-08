import { systemPrompt, userPrompt } from './prompt.js';

// Provider-agnostic vision client — no SDK dependency, uses native fetch.
//   AI_PROVIDER=openai      -> OpenAI, OpenRouter, Ollama, LM Studio, vLLM, llama.cpp
//   AI_PROVIDER=huggingface -> HF Inference Providers router / Inference Endpoints
//   AI_PROVIDER=azure       -> Azure OpenAI / AI Foundry deployments
//   AI_PROVIDER=anthropic   -> Anthropic Messages API

const HF_ROUTER = 'https://router.huggingface.co/v1';

function defaultBase(provider) {
  if (provider === 'huggingface') return HF_ROUTER;
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  return 'https://api.openai.com/v1';
}

export function aiStatus() {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const baseUrl = process.env.AI_BASE_URL || defaultBase(provider);
  const isLocal = /localhost|127\.0\.0\.1|host\.docker\.internal|0\.0\.0\.0/.test(baseUrl);
  const ready = !!process.env.AI_API_KEY || isLocal;
  return {
    ready,
    provider,
    model: process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : ''),
    baseUrl,
    local: isLocal
  };
}

function messages(dataUrl) {
  // `detail` is an OpenAI extension; omit it for servers that reject unknown fields.
  const imageUrl =
    process.env.AI_IMAGE_DETAIL === 'off'
      ? { url: dataUrl }
      : { url: dataUrl, detail: process.env.AI_IMAGE_DETAIL || 'high' };
  return [
    { role: 'system', content: systemPrompt() },
    {
      role: 'user',
      content: [
        { type: 'text', text: userPrompt() },
        { type: 'image_url', image_url: imageUrl }
      ]
    }
  ];
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const err = new Error(`Vision API error ${res.status}: ${text.slice(0, 500)}`);
    err.status = 502;
    err.upstreamStatus = res.status;
    err.upstreamBody = text;
    throw err;
  }
  return res.json();
}

// Open-weight servers vary in JSON-mode support; retry once without it on 4xx.
async function postWithJsonModeFallback(url, headers, body) {
  const mode = (process.env.AI_JSON_MODE || 'auto').toLowerCase();
  const withJson = { ...body, response_format: { type: 'json_object' } };
  if (mode === 'off') return postJson(url, headers, body);
  try {
    return await postJson(url, headers, withJson);
  } catch (e) {
    const retryable =
      mode === 'auto' &&
      e.upstreamStatus >= 400 &&
      e.upstreamStatus < 500 &&
      /response_format|json_object|not supported|unrecognat|unknown field|invalid_request/i.test(
        e.upstreamBody || ''
      );
    if (!retryable) throw e;
    console.warn('Vision: server rejected response_format, retrying without JSON mode.');
    return postJson(url, headers, body);
  }
}

async function callOpenAICompatible(dataUrl, provider) {
  const base = (process.env.AI_BASE_URL || defaultBase(provider)).replace(/\/+$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const key = process.env.AI_API_KEY || 'not-needed';
  const data = await postWithJsonModeFallback(
    `${base}/chat/completions`,
    { Authorization: `Bearer ${key}` },
    {
      model,
      messages: messages(dataUrl),
      temperature: 0,
      max_tokens: Number(process.env.AI_MAX_TOKENS) || 6000
    }
  );
  return data?.choices?.[0]?.message?.content || '';
}

async function callAzure(dataUrl) {
  const base = (process.env.AI_BASE_URL || '').replace(/\/+$/, '');
  const deployment = process.env.AI_MODEL;
  const version = process.env.AI_API_VERSION || '2024-10-21';
  if (!base || !deployment) {
    const e = new Error('Azure mode needs AI_BASE_URL (resource endpoint) and AI_MODEL (deployment name).');
    e.status = 503;
    throw e;
  }
  const data = await postWithJsonModeFallback(
    `${base}/openai/deployments/${deployment}/chat/completions?api-version=${version}`,
    { 'api-key': process.env.AI_API_KEY },
    {
      messages: messages(dataUrl),
      temperature: 0,
      max_tokens: Number(process.env.AI_MAX_TOKENS) || 6000
    }
  );
  return data?.choices?.[0]?.message?.content || '';
}

async function callAnthropic(dataUrl) {
  const base = (process.env.AI_BASE_URL || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
  const model = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error('Anthropic mode requires a base64 data URL.');
  const data = await postJson(
    `${base}/messages`,
    { 'x-api-key': process.env.AI_API_KEY, 'anthropic-version': '2023-06-01' },
    {
      model,
      max_tokens: 6000,
      temperature: 0,
      system: systemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
            { type: 'text', text: userPrompt() }
          ]
        }
      ]
    }
  );
  return (data?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
}

// Models sometimes wrap JSON in prose or fences — pull out the object.
function parseGraphJson(content) {
  if (!content || !content.trim()) throw new Error('Vision model returned an empty response.');
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Vision model did not return JSON.');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('Vision model returned malformed JSON.');
  }
}

export async function analyzeImage(dataUrl) {
  const status = aiStatus();
  if (!status.ready) {
    const e = new Error('AI vision is not configured. Set AI_API_KEY (and AI_BASE_URL / AI_MODEL) in server/.env.');
    e.status = 503;
    throw e;
  }
  const raw =
    status.provider === 'azure'
      ? await callAzure(dataUrl)
      : status.provider === 'anthropic'
        ? await callAnthropic(dataUrl)
        : await callOpenAICompatible(dataUrl, status.provider);
  return parseGraphJson(raw);
}
