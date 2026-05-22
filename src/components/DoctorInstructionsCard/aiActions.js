/**
 * aiActions.js — client helper for the AI menu (polish, expand, summarize,
 * explain). Calls the /api/enhance endpoint (a Vercel function in prod, a Vite
 * dev middleware locally). Keeps networking out of the React component.
 */

/**
 * Run an AI action on note text.
 * @param {string} text
 * @param {string} action  one of: polish | expand | summarize | explain
 * @returns {Promise<string>} the AI result text
 * @throws {Error} with a user-facing message on failure
 */
export async function runAiAction(text, action) {
  let res;
  try {
    res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, action }),
    });
  } catch {
    throw new Error('Could not reach the AI service. Check your connection.');
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(data.error || 'AI request failed');
  }
  if (!data.result) {
    throw new Error('AI returned no text');
  }
  return String(data.result).trim();
}
