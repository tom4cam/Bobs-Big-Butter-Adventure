# Default Story Seeding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two scripts the user runs once with their `.env` to (1) seed two default stories — Bob's Big Butter Adventure in English and Pip the Dragon (translated) in Swedish — and (2) generate four voice-sample MP3s for the picker. Plan 4 of 4.

**Architecture:** A Node script under `scripts/` reads a hard-coded story source (Bob's stanzas extracted from `default-story.html`; Pip's English paragraphs lifted from the existing production story) and calls the shared `_lib/build.ts:buildAndSaveVersion` directly to push the story through the same pipeline used by the create flow. For Pip-sv, Claude translates the paragraphs first. A separate script calls `synthesize()` once per voice with a short sample line and writes the MP3 to `apps/web/public/voice-samples/`. Both scripts run with `npx tsx` and require the same API keys the deployed site uses, plus `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` for Blobs writes.

**Tech Stack:** `tsx` (TypeScript runner, new devDependency), existing libs.

---

## Tasks

### Task 1 — Add `tsx` to root devDependencies

- [ ] Run `npm install --save-dev tsx@^4.19.2`.
- [ ] Add npm scripts to root `package.json`:

```json
"seed:stories": "tsx scripts/seed-default-stories.ts",
"seed:samples": "tsx scripts/seed-voice-samples.ts"
```

- [ ] Commit.

### Task 2 — Bob source data

- [ ] Create `scripts/data/bob-source.ts` with the 20 stanzas extracted from `default-story.html`'s `stanzaData` array (already cleaned text — no `<br>`). Each stanza becomes a paragraph; `image_prompt` is generated on the fly via `regenerateImagePrompt()` during seeding.
- [ ] Commit.

### Task 3 — Pip source data

- [ ] Create `scripts/data/pip-source.ts` with the 7 English paragraphs + 7 English `image_prompt`s lifted from the existing production story (id `af135405-…`). Image prompts stay English because Fal works best in English regardless of story language.
- [ ] Commit.

### Task 4 — Seed-default-stories script

- [ ] Create `scripts/seed-default-stories.ts` that:
  - For Bob (en, id `default-bobs-butter`, voice Daniel): calls `regenerateImagePrompt` per stanza to get image prompts, then `buildAndSaveVersion`.
  - For Pip-sv (id `default-pip-bread`, voice Sanna): asks Claude to translate the title + 7 paragraphs to Swedish, then calls `buildAndSaveVersion` reusing English image_prompts.
  - Idempotent: re-running overwrites both fixed IDs.
- [ ] Commit.

### Task 5 — Voice samples script

- [ ] Create `scripts/seed-voice-samples.ts` that loops over the 4 voices, calls `synthesize(sampleText, { voiceId })`, and writes the MP3 to `apps/web/public/voice-samples/{key}.mp3`.
- [ ] Commit.

### Task 6 — README updates

- [ ] Add a "Seeding default content" section under "Run locally" with the env-var checklist and `npm run seed:stories` / `npm run seed:samples` commands.
- [ ] Commit.

### Task 7 — Final verification

- [ ] Typecheck (the scripts add `scripts/` to the workspace; we'll keep them out of the project's `tsc -b` graph by living at the root and using `tsx` directly).
- [ ] Tests still pass.
- [ ] Production build succeeds.
- [ ] Push.
- [ ] **Manual** (Tom runs locally with .env present): `npm run seed:samples` then `npm run seed:stories`. Confirm `default-bobs-butter` and `default-pip-bread` show in the home carousel.

---

## Out-of-scope

- Running the seed scripts in this plan execution (no API keys here).
- A pinned ordering of default stories on the home page (they sort naturally by `updated_at`).
