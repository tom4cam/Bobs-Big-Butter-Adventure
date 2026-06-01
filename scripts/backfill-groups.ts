// One-shot: stamp group_id on a curated set of stories so they group
// together on the home page. Edit the GROUPS table below to add more
// groups in the future. Idempotent.
//
//   npm run backfill:groups

import { getStoryVersion, saveStoryVersion } from '../functions/api/_lib/storage';
import { getScriptEnv } from './lib/script-env';

interface Group { group_id: string; member_ids: string[] }

const GROUPS: Group[] = [
  {
    group_id: 'default-pip-bread-en',
    member_ids: [
      'default-pip-bread-en',                       // en
      'default-pip-bread',                          // sv
      '05d291ea-d4d3-4163-9835-c9a480928352',       // fr
      'e8b71318-1a28-453a-809e-f3aaecceec7a',       // bg
    ],
  },
];

async function main() {
  const env = getScriptEnv();
  let updated = 0;
  let skipped = 0;
  for (const g of GROUPS) {
    for (const id of g.member_ids) {
      const latest = await getStoryVersion(env, id);
      if (!latest) {
        console.warn(`[skip] ${id}: not found`);
        skipped += 1;
        continue;
      }
      if (latest.group_id === g.group_id) {
        console.log(`[skip] ${id}: already in group ${g.group_id}`);
        skipped += 1;
        continue;
      }
      const next = { ...latest, group_id: g.group_id };
      await saveStoryVersion(env, next);
      console.log(`[ok]   ${id}: -> group ${g.group_id}`);
      updated += 1;
    }
  }
  console.log(`Done. ${updated} updated, ${skipped} skipped.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
