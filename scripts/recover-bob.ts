// One-shot: roll default-bobs-butter's index back to v1, abandoning a
// failed v2. v2's JSON blob stays in R2 as an orphan but is no longer
// referenced. Run once; safe to re-run (saves v1 over itself).
//
//   npx tsx --env-file-if-exists=.env scripts/recover-bob.ts

import { getStoryVersion, saveStoryVersion } from '../functions/api/_lib/storage';
import { getScriptEnv } from './lib/script-env';

const env = getScriptEnv();

async function main() {
  const v1 = await getStoryVersion(env, 'default-bobs-butter', 1);
  if (!v1) throw new Error('default-bobs-butter v1 not found');
  if (v1.status !== 'ready') throw new Error(`v1 has status ${v1.status}; abort`);
  // Make sure v1 is stamped as system+listed so the home page lists it.
  const updated = { ...v1, creator_id: 'system', listed: true };
  await saveStoryVersion(env, updated);
  console.log(`Bob restored: index now points to v${updated.version} (title: "${updated.title}", status: ${updated.status})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
