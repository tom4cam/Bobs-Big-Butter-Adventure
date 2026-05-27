// POST /api/updateStoryListing  { id: string, listed: boolean }
// Owner-gated. Updates the latest version's listed flag in place.

import type { Env } from './_lib/env';
import { getStoryVersion, setStoryListed } from './_lib/storage';
import { readCreatorId } from './_lib/creatorId';
import { badRequest, json, serverError } from './_lib/util';

function forbidden(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { id?: string; listed?: boolean };
  try { body = await request.json(); }
  catch (e) { return badRequest((e as Error).message || 'Bad JSON'); }
  if (!body.id || typeof body.id !== 'string') return badRequest('id required');
  if (typeof body.listed !== 'boolean') return badRequest('listed must be boolean');

  const cookieId = readCreatorId(request);
  const latest = await getStoryVersion(env, body.id);
  if (!latest) return badRequest('story not found');

  if (!latest.creator_id || latest.creator_id === 'system') {
    return forbidden("This is a default story and can't be changed");
  }
  if (!cookieId || cookieId !== latest.creator_id) {
    return forbidden('Only the creator can change this');
  }

  try {
    const updated = await setStoryListed(env, body.id, body.listed);
    return json(updated);
  } catch (e) {
    console.error('updateStoryListing failed', e);
    return serverError((e as Error).message);
  }
};
