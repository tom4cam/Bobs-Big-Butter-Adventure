// One-shot: stamp the three seeded default stories with
// creator_id: 'system' and listed: true so they're permanent and
// always visible on the home page. Idempotent (running it twice is
// a no-op aside from rewriting identical content).
//
//   npm run backfill:system

import { getStoryVersion, saveStoryVersion } from '../functions/api/_lib/storage';
import { getScriptEnv } from './lib/script-env';

const env = getScriptEnv();
const SYSTEM_IDS = ['default-bobs-butter', 'default-pip-bread', 'default-pip-bread-en'];

async function backfillOne(id: string): Promise<void> {
  const latest = await getStoryVersion(env, id);
  if (!latest) {
    console.warn(`[skip] ${id}: not found`);
    return;
  }
  if (latest.creator_id === 'system' && latest.listed === true) {
    console.log(`[skip] ${id}: already system+listed`);
    return;
  }
  const updated = { ...latest, creator_id: 'system', listed: true };
  await saveStoryVersion(env, updated);
  console.log(`[ok]   ${id}: stamped system+listed`);
}

async function main() {
  for (const id of SYSTEM_IDS) await backfillOne(id);
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
