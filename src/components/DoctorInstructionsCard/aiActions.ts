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
import type { AiAction } from '../../types';

/**
 * The AI endpoint is served same-origin at /api/enhance (a Vercel function in
 * prod, a Vite dev middleware locally). It is considered "configured" unless
 * explicitly disabled via VITE_AI_DISABLED=true — which lets the UI show a
 * clear disabled state instead of failing every action with a toast (P3-5).
 */
export const isAiConfigured =
  String(import.meta.env.VITE_AI_DISABLED).toLowerCase() !== 'true';

export async function runAiAction(text: string, action: AiAction): Promise<string> {
  if (!isAiConfigured) {
    throw new Error('AI is not configured. Set up the AI backend to enable this.');
  }
  let res: Response;
  try {
    res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, action }),
    });
  } catch {
    throw new Error('Could not reach the AI service. Check your connection.');
  }

  let data: { result?: string; error?: string } = {};
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
