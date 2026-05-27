// Translates the en.ts string table into Bulgarian, Spanish (Latin
// American), and French (European) via Claude. Reads en.ts at runtime,
// writes apps/web/src/i18n/strings/{bg,es,fr}.ts. Idempotent: re-running
// re-translates and overwrites. Requires ANTHROPIC_API_KEY in env.

import Anthropic from '@anthropic-ai/sdk';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { en } from '../apps/web/src/i18n/strings/en';

interface Target { code: 'bg' | 'es' | 'fr'; name: string; varName: string }
const TARGETS: Target[] = [
  { code: 'bg', name: 'Bulgarian (Български)', varName: 'bg' },
  { code: 'es', name: 'simple, warm Spanish (Latin American Spanish, neutral)', varName: 'es' },
  { code: 'fr', name: 'simple, warm French (European French / fr-FR)', varName: 'fr' },
];

/** Sanitise typographic quotation marks that break JSON.parse.
 *  We replace every curly/typographic dquote variant with \" (escaped),
 *  and every curly single-quote with a plain apostrophe.
 *  „ (U+201E low-9 dquote) and " (U+201C) and " (U+201D) are all handled. */
function sanitiseJsonQuotes(s: string): string {
  // Curly / typographic double quotes (opening, closing, low-9) → \"
  // eslint-disable-next-line no-regex-spaces
  s = s.replace(/[“”„‟«»]/g, '\\"');
  // Curly single quotes / apostrophes → plain apostrophe
  s = s.replace(/[‘’‚‛]/g, "'");
  return s;
}

async function translateOne(client: Anthropic, model: string, name: string): Promise<Record<string, string>> {
  const sourceJson = JSON.stringify(en, null, 2);
  const res = await client.messages.create({
    model,
    max_tokens: 8000,
    system:
      `Translate every value in the given JSON object into ${name}. ` +
      `This is the UI for a children's story-making web app for kids aged 3-8. ` +
      `Keep names like "storytime", "Daniel", "Rachel", "Sanna", "Adam", "Brennan", "Linnéa" unchanged. ` +
      `Translations should be short, warm, and kid-friendly. Preserve punctuation style. ` +
      `CRITICAL: Return ONLY strict JSON — no markdown code fences, no prose before or after the JSON object. ` +
      `Do NOT use typographic/curly quotation marks inside JSON string values. ` +
      `If a translation needs quotation marks, omit them or rephrase to avoid them. ` +
      `Do NOT translate keys, only values.`,
    messages: [{ role: 'user', content: sourceJson }],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error(`Claude returned no text for ${name}`);
  const raw = block.text.trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`${name}: no JSON object found in response`);
  let jsonStr = raw.slice(start, end + 1);
  jsonStr = sanitiseJsonQuotes(jsonStr);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const errMsg = String(e);
    const posMatch = errMsg.match(/position (\d+)/);
    const pos = posMatch ? parseInt(posMatch[1], 10) : 0;
    console.error(`  parse error for ${name}, JSON around position ${pos}:`);
    console.error(JSON.stringify(jsonStr.slice(Math.max(0, pos - 60), pos + 80)));
    throw e;
  }
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  for (const t of TARGETS) {
    console.log(`Translating to ${t.name}...`);
    const translated = await translateOne(client, model, t.name);
    // Verify shape: every en key must be present
    const missing = Object.keys(en).filter((k) => !(k in translated));
    if (missing.length > 0) throw new Error(`${t.code}: missing keys: ${missing.join(', ')}`);
    const out = `export const ${t.varName} = ${JSON.stringify(translated, null, 2)} as const;\n`;
    const path = resolve(__dirname, `../apps/web/src/i18n/strings/${t.code}.ts`);
    await writeFile(path, out, 'utf8');
    console.log(`  wrote ${path}`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
