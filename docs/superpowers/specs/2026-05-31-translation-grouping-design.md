# Translation grouping + three new languages

Date: 2026-05-31

## Problem

Every translated version of a story shows up as its own tile on the
home page, so the four "Pip the Dragon Bakes a Loaf" stories (Swedish,
English, French, Bulgarian) appear as four separate cards even though
they're the same story. Switching between language versions of a story
already open requires going back to the home page and finding the
right tile. The list of supported story-content languages also needs
to grow by three: Macedonian, Brazilian Portuguese, European
Portuguese.

## Goals

1. The home page shows one tile per "story group" — i.e. a story plus
   all its translations. The tile renders in the user's app language
   if a version exists in that language, otherwise the next best
   match. The tile shows which other languages are available, but
   clicking the tile opens that primary version directly.
2. The story page lets you switch to another language version of the
   same group inline (small flag row near the title; click → navigate
   to the sibling story).
3. Three new supported story languages: Macedonian (`mk`), Brazilian
   Portuguese (`pt-BR`), European Portuguese (`pt-PT`).

## Non-goals

- Merging two pre-existing standalone stories into a group from the
  UI. Use the one-shot backfill script.
- Showing in-progress translations as grayed-out flags. Only `status
  === 'ready'` versions appear.
- Per-tile preferred-language memory. The tile always uses the
  current app language.
- Changing the app UI language set (still en / sv). The three new
  langs are story-content languages only.

## Data model

Add an optional `group_id?: string` to both `StoryVersion` and
`StoryIndex` (mirrored in `functions/api/_lib/types.ts` and
`apps/web/src/types.ts`). Null/undefined means "standalone" — the
story is its own group of one.

`saveStoryVersion` (in `functions/api/_lib/storage.ts`) propagates
`group_id` to the index entry alongside the existing `creator_id` and
`listed` plumbing.

New listing response shape returned by `/api/listStories`:

```ts
interface StoryGroupSummary {
  group_id: string | null;     // null when the group is a singleton
  primary: StoryIndex;          // tile renders from this
  languages: Lang[];            // every ready+listed lang in the group
}
```

The `primary` chooses the version to render based on the requested
`?lang=` query param, with fallback **lang → en → first by
updated_at**. Stories with `null` group_id form a group of one so the
shape is uniform.

`/api/getStory` gains a top-level `siblings: Array<{ id: string;
language: Lang }>` field derived from the version's `group_id` (empty
when standalone).

## Translate flow

Where `translateStory.ts` creates the new version, set
`group_id: source.group_id ?? source.id` on the new `StoryVersion`
before saving. That way the first translation of an originally-solo
story anchors the group to the source's id, and subsequent
translations of either side join the same group.

## Backfill

One-shot script `scripts/backfill-groups.ts`, wired as
`npm run backfill:groups`. Idempotent.

It stamps `group_id: 'default-pip-bread-en'` on:

- `default-pip-bread-en` (en, the anchor)
- `default-pip-bread` (sv, currently unlinked)
- `05d291ea-d4d3-4163-9835-c9a480928352` (fr, links via source_answers
  today)
- `e8b71318-1a28-453a-809e-f3aaecceec7a` (bg, same)

The anchor id and member list live in the script's source. Future
manual backfills get added by editing the script. Bob and Sarah stay
solo.

## Languages

`LANGS` becomes:

```ts
export const LANGS = [
  'en', 'sv', 'bg', 'es', 'fr',     // existing
  'mk',                              // Macedonian
  'pt-BR', 'pt-PT',                  // Brazilian + European Portuguese
] as const;
```

BCP-47 codes (`pt-BR`/`pt-PT`) preserve the variant distinction. All
existing call sites that key by `Lang` (Record types, switch
statements, etc.) get the three new entries:

- `functions/api/_lib/anthropic.ts` `LANG_NAMES`:
  - `mk: 'Macedonian (македонски)'`
  - `pt-BR: 'Brazilian Portuguese (português do Brasil)'`
  - `pt-PT: 'European Portuguese (português de Portugal)'`
- `apps/web/src/i18n/strings/{en,sv,fr,bg,es}.ts`: add
  `create.langStepMk`, `create.langStepPtBr`, `create.langStepPtPt`.
- Voices map (`apps/web/src/voices.ts`): no change today — voice
  selection works off the OpenAI TTS model independent of language —
  but verify during implementation.

Stale literal type union at `functions/api/_lib/build.ts:178`
(`language: 'en' | 'sv' | 'bg' | 'es' | 'fr'`) gets replaced with
`language: Lang` so future LANGS edits don't break the build.

## Flags

Centralize the Lang → emoji map in `apps/web/src/lang.ts`:

```ts
export const LANG_FLAG: Record<Lang, string> = {
  en: '🇬🇧', sv: '🇸🇪', bg: '🇧🇬', es: '🇪🇸', fr: '🇫🇷',
  mk: '🇲🇰', 'pt-BR': '🇧🇷', 'pt-PT': '🇵🇹',
};
```

Used by both `HomePage` tiles and the `StoryPage` sibling row.

## Frontend

### `apps/web/src/api.ts`

`listStories(lang)` takes the current app language and posts/gets
`/api/listStories?lang=<code>`. Returns `StoryGroupSummary[]`.

### `apps/web/src/routes/HomePage.tsx`

Render a tile per `StoryGroupSummary`:

```
+------------------------------------------------+
| [cover]   Pip the Dragon Bakes a Loaf          |
|           v1   🇬🇧  🇸🇪  🇫🇷  🇧🇬                 |
+------------------------------------------------+
```

- Title and cover come from `group.primary`.
- Flag row uses `group.languages`, with `group.primary.language`'s
  flag rendered larger / bolder.
- Whole-card click navigates to `/s/${group.primary.id}`.

### `apps/web/src/routes/StoryPage.tsx`

Just under the story title, render the same flag row driven by
`siblings`. Click on a non-current flag navigates to
`/s/${sibling.id}`. Hide the row entirely when `siblings.length === 0`
(standalone story).

## Backend

### `functions/api/_lib/storage.ts`

New helper:

```ts
export function groupStoryIndexes(
  indexes: StoryIndex[],
  preferredLang: Lang | null,
): StoryGroupSummary[]
```

- Bucket by `group_id ?? id`.
- For each bucket pick primary: `preferredLang` match → `'en'` match
  → most-recent by `updated_at`.
- Build the `languages` array from the bucket members'
  `.<latest version>.language`. (The index doesn't currently store
  language. Either: (a) extend the index to carry it, or (b) the
  helper fetches each version. Option (a) is one more line in
  `saveStoryVersion` and an O(N) backfill on first deploy via a
  one-time read-modify-write — preferred. Decision: extend
  `StoryIndex` with `language: Lang`.)
- Sort the resulting groups by `primary.updated_at` descending.

### `functions/api/listStories.ts`

Parse `?lang=<code>`, call `listStoryIndexes` + `groupStoryIndexes`,
return the array.

### `functions/api/getStory.ts`

After loading the requested version, if `version.group_id` is set,
list `STORIES` with prefix scanning and collect the latest version's
language for each story whose index has the same `group_id`. Attach
`siblings` (excluding the current story itself). When `group_id` is
null, set `siblings: []`.

## Breaking changes

`/api/listStories` and `/api/getStory` response shapes change. The
frontend and backend ship in one deploy, so there's no version skew
window worth handling. Old browser tabs will get stale responses
until refresh; acceptable.

## Implementation order

1. Types (`group_id` everywhere, BCP-47 codes, LANG_FLAG map,
   language on StoryIndex).
2. Backend storage / list / get + grouping helper.
3. `translateStory.ts` stamps `group_id` on new translations.
4. Frontend list + home tiles + sibling row.
5. `scripts/backfill-groups.ts` and the index-language one-shot.
6. New i18n strings for `langStepMk/PtBr/PtPt` in each locale file.
7. Manual sanity check (or new vitest) on `groupStoryIndexes`.

## Files touched (estimate)

- `functions/api/_lib/types.ts`
- `apps/web/src/types.ts`
- `functions/api/_lib/storage.ts`
- `functions/api/_lib/anthropic.ts`
- `functions/api/_lib/build.ts` (fix stale literal union)
- `functions/api/listStories.ts`
- `functions/api/getStory.ts`
- `functions/api/translateStory.ts`
- `apps/web/src/api.ts`
- `apps/web/src/routes/HomePage.tsx`
- `apps/web/src/routes/StoryPage.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/lang.ts` (new — LANG_FLAG map)
- `apps/web/src/i18n/strings/*.ts` (per-locale `create.langStepXx`)
- `scripts/backfill-groups.ts` (new) + `package.json` script entry

Roughly a dozen files, mostly small touches except `HomePage` /
`StoryPage` / the storage helper.
