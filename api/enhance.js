/**
 * api/enhance.js — serverless function: AI actions for clinical notes.
 *
 * Runs as a Vercel Function (auto-deployed from /api) and locally via the Vite dev
 * middleware in vite.config.ts. It is framework-agnostic: it reads the request body
 * straight from the Node stream and writes the response with raw `res` calls, so the
 * same handler works in both environments.
 *
 * Uses OpenRouter (https://openrouter.ai), which is OpenAI-API compatible.
 * The OPENROUTER_API_KEY never reaches the browser — it is read from process.env.
 *
 * Request body: { text: string, action: 'polish' | 'expand' | 'summarize' | 'explain' }
 */

// Override with OPENROUTER_MODEL in the env if this model id changes / is unavailable.
// NOTE: a ":free" model ignores your OpenRouter credits (it uses a shared, often
// exhausted free pool). The paid id below bills your credits and is reliable.
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash';
const MAX_INPUT_CHARS = 12000;

// Free models are shared and frequently rate-limited upstream — retry briefly.
const RETRY_STATUSES = [429, 502, 503];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/* One system prompt per AI action. */
const PROMPTS = {
  polish: `You are a medical scribe assistant. Polish the clinician's note text for clarity, spelling and grammar.
Rules:
- Do NOT change clinical meaning: keep every drug name, dose, frequency, route, diagnosis, lab value, number and unit exactly as written.
- Preserve verbatim any token of the form [Rx: ...], [Dx: ...], [Lab: ...] and any @name token. Do not add or remove such tokens.
- Keep the same language as the input.
- Keep line breaks and list structure roughly as-is.
- Return ONLY the polished text, with no preamble, quotes or commentary.`,

  expand: `You are a medical scribe assistant. Rewrite the clinician's note as clear, complete, professional clinical prose: turn shorthand, abbreviations and terse fragments into full, well-formed sentences.
Rules:
- Do NOT invent clinical facts, findings, diagnoses, doses or events that are not present in the original. Only clarify, structure and complete what is already written.
- Keep every drug name, dose, number and unit exactly as written.
- Preserve verbatim any [Rx: ...], [Dx: ...], [Lab: ...] and @name token.
- Keep the same language as the input.
- Return ONLY the rewritten note, with no preamble, quotes or commentary.`,

  summarize: `You are a medical scribe assistant. Write a concise summary of the clinician's note: the key findings, diagnoses, medications and plan.
Rules:
- 2 to 5 short sentences or bullet lines. Be brief.
- Do NOT invent information that is not in the note.
- Keep the same language as the input.
- Return ONLY the summary, with no preamble, heading or commentary.`,

  explain: `You are a medical reference assistant. From the clinician's note, identify the medicines, diagnoses/conditions and lab tests mentioned — including any inside [Rx: ...], [Dx: ...] and [Lab: ...] tokens.
For each one, write a brief one- to two-sentence plain-language explanation of what it is and what it is used for.
Rules:
- Format as a simple list, one item per line, e.g. "Iron Sucrose — an intravenous iron preparation used to treat iron-deficiency anaemia, common in chronic kidney disease."
- Only include terms actually present in the note. Do not invent terms.
- If no medical terms are found, reply exactly: "No medical terms found in the note."
- Return ONLY the list, with no preamble, heading or commentary.`,

  template: `You are a clinical template builder. Convert the clinician's note into a REUSABLE TEMPLATE by replacing every patient-specific or variable value with a named placeholder of the form {{VARIABLE_NAME}}.
Replace with a placeholder:
- vital signs (blood pressure, pulse, SpO2, temperature, weight, height, GRBS)
- lab values and their numbers/units
- medication names, doses, units, frequencies and routes
- symptoms, durations, dates and times
- any other measurement or value that would differ from one patient to the next.
Rules:
- Use SHORT UPPER_SNAKE_CASE names that describe the value, e.g. {{BP}}, {{PULSE}}, {{SPO2}}, {{TEMPERATURE}}, {{WEIGHT}}, {{MEDICATION}}, {{DOSAGE}}, {{ROUTE}}, {{SYMPTOM}}, {{DURATION}}, {{LAB_VALUE}}, {{DATE}}.
- If the SAME value appears more than once, reuse the SAME placeholder name.
- Keep ALL surrounding clinical wording, sentence structure, units, punctuation and line breaks EXACTLY as written — only swap the variable values for placeholders.
- Do NOT invent new sentences, headings or fields that were not in the note.
- Do NOT wrap the output in markdown code fences or add any commentary.
- Return ONLY the template text.`,

  template_structured: `You are a clinical template builder. The user message is a JSON object:
{ "description": string, "parameters": [{ "name": string, "value": string, "unit": string }], "name": string, "category": string, "accent": string }

Produce ONE JSON object describing a fillable clinical note template, in EXACTLY this shape:
{
  "prose": [ { "heading": "optional string", "parts": [ <part>, ... ] } ],
  "sections": [ { "title": string, "fields": [ <field>, ... ] } ]
}

A <part> is either a literal text fragment { "t": "some words " } or an editable field
fragment { "f": "<field_id>", "kind": "num"|"long"|"pick"|"multi", "ph": "placeholder",
"options": ["..."], "vital": "bp"|"pulse"|"spo2" }. Only include "options" for pick/multi,
only include "vital" for the matching vital sign.

A <field> is { "id": string, "label": string, "type": "bp"|"digits"|"decimal"|"time"|"select"|"multiselect"|"text",
"unit": "string", "boxes": number, "decimals": number, "options": ["..."] }.

Field-type rules (infer from each parameter's unit/value):
- unit "mmHg" or a two-part BP value -> type "bp"; prose kind "num", vital "bp", ph "—/—".
- unit "bpm","%","mg/dL","mmol/L","min","mL/min" or whole numbers -> type "digits", boxes 3 (add "max":100 for %); prose kind "num", ph "—". For "%" also set prose vital "spo2".
- unit "kg","L","°F","cm","mL" or decimals -> type "decimal", boxes 3, decimals 1; prose kind "num", ph "—".
- "HH:MM"/time -> type "time"; prose kind "num", ph "00:00".
- value is a comma/slash list AND unit contains "(select)" -> type "select", options from the value; prose kind "pick".
- "(multi)" -> type "multiselect", options from the value; prose kind "multi".
- no unit / free text -> type "text", placeholder = label; prose kind "long".

Rules:
- Every prose "f" id MUST exactly match a field "id" in sections.
- Write natural, readable clinical prose that weaves the description and parameters into sentences with the fields inline. Group related fields under headings.
- Use SHORT snake_case field ids derived from the parameter name.
- Respond with RAW JSON only — no markdown code fences, no commentary.`,
};

/** Read and parse a JSON body — works whether or not the body is pre-parsed. */
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Call OpenRouter, retrying transient (rate-limit) failures a couple of times. */
async function callOpenRouter(apiKey, systemPrompt, text) {
  let response;
  let detail = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });
    detail = await response.text();
    if (response.ok || !RETRY_STATUSES.includes(response.status)) break;
    if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
  }
  return { response, detail };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    send(res, 500, { error: 'AI is not configured' });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    send(res, 400, { error: 'Invalid request body' });
    return;
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) {
    send(res, 400, { error: 'No text to work on' });
    return;
  }
  if (text.length > MAX_INPUT_CHARS) {
    send(res, 400, { error: 'Text is too long' });
    return;
  }

  const action =
    typeof body.action === 'string' && PROMPTS[body.action]
      ? body.action
      : 'polish';

  try {
    const { response, detail } = await callOpenRouter(
      apiKey,
      PROMPTS[action],
      text,
    );

    if (!response.ok) {
      let message = `AI request failed (${response.status})`;
      try {
        const errData = JSON.parse(detail);
        const e = errData && errData.error;
        if (e) {
          if (e.message) message = e.message;
          // OpenRouter nests the upstream provider's real error in metadata.raw
          if (e.metadata && e.metadata.raw) {
            try {
              const raw = JSON.parse(e.metadata.raw);
              if (raw && raw.error && raw.error.message) message = raw.error.message;
            } catch {
              if (typeof e.metadata.raw === 'string') message = e.metadata.raw;
            }
          }
        }
      } catch {
        /* upstream body was not JSON */
      }
      if (response.status === 429) {
        message =
          'The free AI model is rate-limited right now — please try again in a moment.';
      } else if (response.status === 402) {
        message =
          'The OpenRouter account has no credits. Add a little credit at openrouter.ai/settings/credits to use the AI feature.';
      }
      console.error('[enhance] OpenRouter error', response.status, detail);
      send(res, 502, { error: message });
      return;
    }

    let data;
    try {
      data = JSON.parse(detail);
    } catch {
      send(res, 502, { error: 'AI returned an unreadable response' });
      return;
    }

    const result = (
      (data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '') || ''
    ).trim();

    if (!result) {
      send(res, 502, { error: 'AI returned no text' });
      return;
    }
    send(res, 200, { result });
  } catch (err) {
    console.error('[enhance] request failed', err);
    send(res, 500, { error: 'AI request failed' });
  }
}
