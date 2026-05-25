// One-off recovery: revert a story to a specific version by re-pointing
// its index and deleting later version blobs.
//
//   npm run revert -- <storyId> <targetVersion>
//
// Example: npm run revert -- default-bobs-butter 1

import { getStore } from '@netlify/blobs';
import { getStoryVersion, saveStoryVersion } from '../netlify/functions/_lib/storage';

function storeOptions(name: string) {
  const base = { name, consistency: 'strong' as const };
  if (process.env.NETLIFY_BLOBS_CONTEXT) return base;
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) return { ...base, siteID, token };
  return base;
}

async function main() {
  const id = process.argv[2];
  const targetStr = process.argv[3];
  if (!id || !targetStr) {
    console.error('usage: tsx scripts/revert-story.ts <storyId> <targetVersion>');
    process.exit(1);
  }
  const target = parseInt(targetStr, 10);
  if (!Number.isFinite(target) || target < 1) {
    console.error('targetVersion must be a positive integer');
    process.exit(1);
  }
  const v = await getStoryVersion(id, target);
  if (!v) {
    console.error(`Version ${target} of "${id}" not found in blobs.`);
    process.exit(1);
  }
  await saveStoryVersion(v); // overwrites index.json so latest_version=target

  // Delete any later versions.
  const stories = getStore(storeOptions('stories'));
  let n = target + 1;
  while (true) {
    const key = `${id}/v${n}.json`;
    const exists = await stories.get(key);
    if (!exists) break;
    await stories.delete(key);
    console.log(`  deleted ${key}`);
    n += 1;
  }
  console.log(`Reverted "${id}" to v${target}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
