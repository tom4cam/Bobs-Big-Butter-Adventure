# Bilingual Foundation + Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the English/Swedish foundation (i18n module, language data field, translated UI, language picker per story, settings cog with language toggle) and the Brennan & Linnéa personalization. This is plan 1 of 4 in the v2 series; plans 2–4 (word-timed audio, adaptive create flow, default-story seeding) all build on this layer.

**Architecture:** A tiny custom i18n module (no external library) provides a `LangProvider` context and a `useT()` hook. UI strings move into `apps/web/src/i18n/strings/{en,sv}.ts`. The active language is initialized from `navigator.language`, overridable in a header settings cog, and persisted in `localStorage`. Stories carry a `language: 'en' | 'sv'` field end-to-end, threaded from a new picker in the create flow through the Claude prompt to storage. Browser SpeechRecognition takes a language hint.

**Tech Stack:** React 18, Vite, TypeScript, react-router-dom, Anthropic SDK, Netlify Functions, Netlify Blobs, Vitest (added in this plan for pure-function tests).

---

## File Structure

**New files:**
- `apps/web/src/i18n/index.tsx` — `LangProvider`, `useT`, `useLang`, `resolveInitialLang`.
- `apps/web/src/i18n/strings/en.ts` — every English string keyed by dotted path.
- `apps/web/src/i18n/strings/sv.ts` — Swedish mirror of `en.ts`.
- `apps/web/src/i18n/index.test.ts` — Vitest unit tests for `resolveInitialLang` and `t`.
- `apps/web/src/components/SettingsCog.tsx` — header gear icon + popover with language toggle.
- `apps/web/vitest.config.ts` — Vitest config (jsdom not needed for these tests; node env is fine).

**Modified files:**
- `apps/web/package.json` — add Vitest devDependency and `test` script.
- `apps/web/src/main.tsx` — wrap `<App>` in `<LangProvider>`.
- `apps/web/src/components/Layout.tsx` — translated brand + dedication footer + mount `<SettingsCog>`.
- `apps/web/src/routes/HomePage.tsx` — translated hero, list label, empty state.
- `apps/web/src/routes/CreatePage.tsx` — translated chrome, new language-pick step prepended to the question flow, language is passed to `createStory()` and to `listenOnce()`.
- `apps/web/src/routes/StoryPage.tsx` — translated loading/failure copy and buttons.
- `apps/web/src/routes/EditPage.tsx` — translated chrome.
- `apps/web/src/routes/NotFoundPage.tsx` — translated copy.
- `apps/web/src/components/MicInput.tsx` — accepts a `language` prop and passes it through to `listenOnce`.
- `apps/web/src/speech.ts` — `listenOnce(onResult, onError, opts?: { lang?: string })`.
- `apps/web/src/api.ts` — `createStory(answers, language)` adds `language` to the POST body and `StoryAnswer`/`StoryVersion` types pick up `language`.
- `apps/web/src/types.ts` — `StoryVersion.language: 'en' | 'sv'`.
- `apps/web/src/styles.css` — small styles for `SettingsCog`, language pick step.
- `netlify/functions/_lib/types.ts` — `StoryVersion.language: 'en' | 'sv'`.
- `netlify/functions/_lib/anthropic.ts` — `generateStory(answers, language)` adds an explicit language instruction in the user message.
- `netlify/functions/_lib/build.ts` — `buildFromAnswers(id, answers, language)` and `buildAndSaveVersion({ language, ... })` thread language into the saved version. `saveGeneratingStub({ language })` records the language on the placeholder.
- `netlify/functions/createStory.ts` — read `language` from the request body, validate, pass through.
- `netlify/functions/createWorker-background.ts` — accept `language` from the dispatched body, pass through.
- `netlify/functions/updateStory.ts` and `updateWorker-background.ts` — preserve language on the existing version.
- `README.md` — bilingual mention and updated dedication line.

**Untouched in this plan:** `_lib/elevenlabs.ts`, `_lib/fal.ts`, `_lib/moderation.ts`, `_lib/storage.ts`, `media.ts`, `listStories.ts`, `getStory.ts`, `moderate.ts`. The audio player and word-timed sync are deferred to plan 2.

---

## Task 1 — Add Vitest

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`

- [ ] **Step 1: Install Vitest as a devDependency**

Run from the repo root:

```bash
npm --workspace apps/web install --save-dev vitest@^2.1.4
```

Expected: `apps/web/package.json` gains `"vitest": "^2.1.4"` under `devDependencies`. Lockfile updates.

- [ ] **Step 2: Add the test script to `apps/web/package.json`**

Add `"test": "vitest run"` to the `scripts` object. The full scripts block becomes:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 3: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Smoke-test the runner**

Run from the repo root:

```bash
npm --workspace apps/web run test -- --reporter=verbose
```

Expected: `No test files found, exiting with code 0` (or similar). The runner installs and starts cleanly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts package-lock.json
git commit -m "Add Vitest for unit tests"
```

---

## Task 2 — Create the English strings file

**Files:**
- Create: `apps/web/src/i18n/strings/en.ts`

- [ ] **Step 1: Write the strings file**

Create `apps/web/src/i18n/strings/en.ts` with every UI string this plan touches. Keys are dotted; values are plain strings. (Swedish mirror lands in Task 3.)

```ts
export const en = {
  // Brand and dedication
  'brand.name': "Brennan & Linnéa's Story Maker",
  'brand.tagline': 'Tell a story. Hear it. Watch it.',
  'dedication.line': "Made with love by Uncle Tom for Brennan and Linnéa's birthdays.",

  // Home page
  'home.heroTitle': 'Make a story. Anything you want.',
  'home.heroBody': 'Pick a hero, pick a place, pick a problem. The story maker will write it, draw it, and read it out loud just for you.',
  'home.heroCta': 'Start a new story',
  'home.recentHeading': 'Recent stories',
  'home.recentLoading': 'Loading recent stories...',
  'home.recentEmpty': 'No stories yet. Tap the big yellow button to make the first one.',

  // Create page chrome
  'create.langStepTitle': 'Pick a language for your story.',
  'create.langStepEn': 'English',
  'create.langStepSv': 'Svenska (Swedish)',
  'create.hearAgain': 'Hear the question again',
  'create.skipThis': 'Skip this',
  'create.next': 'Next',
  'create.saveAnswer': 'Save answer',
  'create.makeStory': 'Make my story',
  'create.required': 'You need to answer this one.',
  'create.optional': 'This one is optional. Add more if you want, or skip ahead.',
  'create.soFar': 'So far:',
  'create.allSet': 'All set.',
  'create.allSetHint': 'Tap "Make my story" to put it all together.',
  'create.sending': 'Sending it off to the storytellers...',
  'create.typeOrSpeak': 'Please type or speak an answer first.',

  // Question prompts (the create flow's six original questions; SV mirror in sv.ts)
  'q.hero.prompt': 'Who is the hero of your story?',
  'q.hero.spoken': 'Who is the hero of your story? Tell me a name and what they are like.',
  'q.hero.placeholder': 'Example: a brave bunny named Pip who loves cookies',
  'q.setting.prompt': 'Where does the story happen?',
  'q.setting.spoken': 'Where does the story happen?',
  'q.setting.placeholder': 'Example: in a magic forest, or on a pirate ship',
  'q.goal.prompt': 'What does your hero want or need?',
  'q.goal.spoken': 'What does your hero want or need?',
  'q.goal.placeholder': 'Example: to find the world’s biggest pancake',
  'q.friend.prompt': 'Is there a friend or a helper? Who is it?',
  'q.friend.spoken': 'Is there a friend or a helper? Who is it?',
  'q.friend.placeholder': 'Example: a wise old turtle named Sage',
  'q.problem.prompt': 'What problem do they have to solve?',
  'q.problem.spoken': 'What problem do they have to solve?',
  'q.problem.placeholder': 'Example: the bridge to the pancake mountain is broken',
  'q.ending.prompt': 'How should the story end?',
  'q.ending.spoken': 'How should the story end? Happy, silly, or surprising?',
  'q.ending.placeholder': 'Example: happy and silly, with a big pancake party',

  // Story page
  'story.opening': 'Opening the story...',
  'story.notFound': 'Story not found.',
  'story.backHome': 'Back to home',
  'story.makingTitle': 'Making your story...',
  'story.makingHint': 'Writing the words, drawing the pictures, and recording the voice. This takes about a minute. The page will refresh on its own.',
  'story.failedTitle': 'Something went wrong.',
  'story.failedDefault': 'The story could not be made this time.',
  'story.tryNew': 'Try a new one',
  'story.versionPrefix': 'Version',
  'story.savedPrefix': 'saved',
  'story.editLink': 'Edit this story',
  'story.makeAnother': 'Make a new one',

  // Edit page
  'edit.loading': 'Loading the story...',
  'edit.notFound': 'Story not found.',
  'edit.sending': 'Sending the changes...',
  'edit.heading': 'Edit story',
  'edit.versionNote': 'Saving will create version {next}.',
  'edit.titleLabel': 'Title',
  'edit.paragraphLabel': 'Paragraph {n}',
  'edit.regenerateImage': 'Regenerate this picture when I save',
  'edit.cancel': 'Cancel',
  'edit.save': 'Save as new version',

  // Not found page
  'notFound.title': 'That page got lost in the woods.',
  'notFound.body': "Let's go back and pick a different path.",

  // Mic / speech
  'mic.start': 'Speak your answer',
  'mic.stop': 'Stop recording',
  'mic.unavailable': 'Voice input is not supported in this browser. You can still type your answer. (Chrome and Edge work best for voice.)',
  'mic.notHeard': 'Sorry, I did not catch that. Please try again.',

  // Settings cog
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.languageEn': 'English',
  'settings.languageSv': 'Svenska',
  'settings.close': 'Close',

  // Errors
  'error.generic': 'Something went wrong. Please try again.',
} as const;

export type StringKey = keyof typeof en;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/i18n/strings/en.ts
git commit -m "Add English i18n strings"
```

---

## Task 3 — Create the Swedish strings file

**Files:**
- Create: `apps/web/src/i18n/strings/sv.ts`

These translations are a first pass. Mark in the README that a Swedish-fluent reviewer should sweep them before a public release. The structure must mirror `en.ts` exactly — TypeScript will error on missing keys (we wire that in Task 4).

- [ ] **Step 1: Write the strings file**

```ts
import type { StringKey } from './en';

export const sv: Record<StringKey, string> = {
  // Brand and dedication
  'brand.name': 'Brennan & Linnéas Sagomakare',
  'brand.tagline': 'Berätta en saga. Hör den. Se den.',
  'dedication.line': 'Gjord med kärlek av farbror Tom till Brennans och Linnéas födelsedagar.',

  // Home page
  'home.heroTitle': 'Skapa en saga. Vad du vill.',
  'home.heroBody': 'Välj en hjälte, välj en plats, välj ett problem. Sagomakaren skriver den, ritar den och läser den högt bara för dig.',
  'home.heroCta': 'Börja en ny saga',
  'home.recentHeading': 'Senaste sagorna',
  'home.recentLoading': 'Laddar senaste sagorna...',
  'home.recentEmpty': 'Inga sagor än. Tryck på den stora gula knappen för att skapa den första.',

  // Create page chrome
  'create.langStepTitle': 'Välj ett språk för din saga.',
  'create.langStepEn': 'English',
  'create.langStepSv': 'Svenska',
  'create.hearAgain': 'Hör frågan igen',
  'create.skipThis': 'Hoppa över',
  'create.next': 'Nästa',
  'create.saveAnswer': 'Spara svar',
  'create.makeStory': 'Skapa min saga',
  'create.required': 'Du behöver svara på den här.',
  'create.optional': 'Den här är frivillig. Skriv mer om du vill, eller hoppa över.',
  'create.soFar': 'Hittills:',
  'create.allSet': 'Klart.',
  'create.allSetHint': 'Tryck på "Skapa min saga" för att sätta ihop allt.',
  'create.sending': 'Skickar iväg till sagoberättarna...',
  'create.typeOrSpeak': 'Skriv eller säg ett svar först.',

  // Question prompts
  'q.hero.prompt': 'Vem är hjälten i din saga?',
  'q.hero.spoken': 'Vem är hjälten i din saga? Säg ett namn och hur de är.',
  'q.hero.placeholder': 'Exempel: en modig kanin som heter Pip och älskar kakor',
  'q.setting.prompt': 'Var händer sagan?',
  'q.setting.spoken': 'Var händer sagan?',
  'q.setting.placeholder': 'Exempel: i en magisk skog, eller på ett piratskepp',
  'q.goal.prompt': 'Vad vill eller behöver hjälten?',
  'q.goal.spoken': 'Vad vill eller behöver hjälten?',
  'q.goal.placeholder': 'Exempel: hitta världens största pannkaka',
  'q.friend.prompt': 'Finns det en vän eller hjälpare? Vem är det?',
  'q.friend.spoken': 'Finns det en vän eller hjälpare? Vem är det?',
  'q.friend.placeholder': 'Exempel: en klok gammal sköldpadda som heter Sage',
  'q.problem.prompt': 'Vilket problem ska de lösa?',
  'q.problem.spoken': 'Vilket problem ska de lösa?',
  'q.problem.placeholder': 'Exempel: bron till pannkaksberget är trasig',
  'q.ending.prompt': 'Hur ska sagan sluta?',
  'q.ending.spoken': 'Hur ska sagan sluta? Glatt, fånigt eller överraskande?',
  'q.ending.placeholder': 'Exempel: glatt och fånigt, med en stor pannkaksfest',

  // Story page
  'story.opening': 'Öppnar sagan...',
  'story.notFound': 'Sagan hittades inte.',
  'story.backHome': 'Tillbaka till start',
  'story.makingTitle': 'Skapar din saga...',
  'story.makingHint': 'Skriver orden, ritar bilderna och spelar in rösten. Det tar ungefär en minut. Sidan uppdateras av sig själv.',
  'story.failedTitle': 'Något gick fel.',
  'story.failedDefault': 'Sagan kunde inte skapas den här gången.',
  'story.tryNew': 'Pröva en ny',
  'story.versionPrefix': 'Version',
  'story.savedPrefix': 'sparad',
  'story.editLink': 'Redigera den här sagan',
  'story.makeAnother': 'Skapa en ny',

  // Edit page
  'edit.loading': 'Laddar sagan...',
  'edit.notFound': 'Sagan hittades inte.',
  'edit.sending': 'Skickar ändringarna...',
  'edit.heading': 'Redigera saga',
  'edit.versionNote': 'När du sparar skapas version {next}.',
  'edit.titleLabel': 'Titel',
  'edit.paragraphLabel': 'Stycke {n}',
  'edit.regenerateImage': 'Rita om bilden när jag sparar',
  'edit.cancel': 'Avbryt',
  'edit.save': 'Spara som ny version',

  // Not found page
  'notFound.title': 'Den sidan tappade bort sig i skogen.',
  'notFound.body': 'Vi går tillbaka och väljer en annan stig.',

  // Mic / speech
  'mic.start': 'Säg ditt svar',
  'mic.stop': 'Sluta spela in',
  'mic.unavailable': 'Röstinmatning fungerar inte i den här webbläsaren. Du kan fortfarande skriva svaret. (Chrome och Edge fungerar bäst för röst.)',
  'mic.notHeard': 'Förlåt, jag hörde inte. Försök igen.',

  // Settings cog
  'settings.title': 'Inställningar',
  'settings.language': 'Språk',
  'settings.languageEn': 'English',
  'settings.languageSv': 'Svenska',
  'settings.close': 'Stäng',

  // Errors
  'error.generic': 'Något gick fel. Försök igen.',
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/i18n/strings/sv.ts
git commit -m "Add Swedish i18n strings (first pass, needs native reviewer)"
```

---

## Task 4 — Build the i18n module (TDD)

**Files:**
- Create: `apps/web/src/i18n/index.tsx`
- Test: `apps/web/src/i18n/index.test.ts`

The i18n module exposes:
- `Lang = 'en' | 'sv'`
- `resolveInitialLang(navigatorLang: string, stored: string | null): Lang` — pure function
- `t(key, lang, vars?): string` — pure function with `{name}` interpolation
- `<LangProvider>` React context
- `useT(): (key, vars?) => string`
- `useLang(): { lang, setLang }`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/i18n/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveInitialLang, t } from './index';

describe('resolveInitialLang', () => {
  it('honours a stored "en" preference even if browser is sv', () => {
    expect(resolveInitialLang('sv-SE', 'en')).toBe('en');
  });

  it('honours a stored "sv" preference even if browser is en', () => {
    expect(resolveInitialLang('en-US', 'sv')).toBe('sv');
  });

  it('falls back to Swedish when browser is sv-* and nothing stored', () => {
    expect(resolveInitialLang('sv-SE', null)).toBe('sv');
    expect(resolveInitialLang('sv', null)).toBe('sv');
  });

  it('falls back to English for anything else', () => {
    expect(resolveInitialLang('en-US', null)).toBe('en');
    expect(resolveInitialLang('fr-FR', null)).toBe('en');
    expect(resolveInitialLang('', null)).toBe('en');
  });

  it('ignores invalid stored values', () => {
    expect(resolveInitialLang('sv-SE', 'fr')).toBe('sv');
    expect(resolveInitialLang('en-US', '')).toBe('en');
  });
});

describe('t', () => {
  it('returns the English string for a known key', () => {
    expect(t('home.heroCta', 'en')).toBe('Start a new story');
  });

  it('returns the Swedish string for a known key', () => {
    expect(t('home.heroCta', 'sv')).toBe('Börja en ny saga');
  });

  it('falls back to English when a Swedish key is somehow missing', () => {
    // This guards against future drift between en.ts and sv.ts.
    expect(t('error.generic', 'sv')).toBe('Något gick fel. Försök igen.');
  });

  it('returns the raw key when neither table has it (safety net)', () => {
    // @ts-expect-error — intentionally unknown key
    expect(t('does.not.exist', 'en')).toBe('does.not.exist');
  });

  it('interpolates {name}-style placeholders in a vars-bearing string', () => {
    // `edit.versionNote` has a {next} placeholder.
    expect(t('edit.versionNote', 'en', { next: '3' })).toBe('Saving will create version 3.');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
npm --workspace apps/web run test
```

Expected: tests fail with `Cannot find module './index'` or `resolveInitialLang is not exported`.

- [ ] **Step 3: Write the i18n module**

Create `apps/web/src/i18n/index.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type StringKey } from './strings/en';
import { sv } from './strings/sv';

export type Lang = 'en' | 'sv';
const STORAGE_KEY = 'storyMaker.lang';

const TABLES: Record<Lang, Record<StringKey, string>> = { en, sv };

export function resolveInitialLang(navigatorLang: string, stored: string | null): Lang {
  if (stored === 'en' || stored === 'sv') return stored;
  return navigatorLang.toLowerCase().startsWith('sv') ? 'sv' : 'en';
}

export function t(key: StringKey, lang: Lang, vars?: Record<string, string>): string {
  const raw = TABLES[lang]?.[key] ?? TABLES.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

interface LangContextValue {
  lang: Lang;
  setLang: (next: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const nav = typeof navigator !== 'undefined' ? navigator.language : '';
    return resolveInitialLang(nav, stored);
  });

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}

export function useT() {
  const { lang } = useLang();
  return useCallback((key: StringKey, vars?: Record<string, string>) => t(key, lang, vars), [lang]);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
npm --workspace apps/web run test
```

Expected: all 9 assertions across 2 `describe` blocks pass.

- [ ] **Step 5: Confirm typecheck still passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/i18n/index.tsx apps/web/src/i18n/index.test.ts
git commit -m "Add i18n module with LangProvider, useT, and language resolver"
```

---

## Task 5 — Wrap the app in LangProvider

**Files:**
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Replace the contents of `main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './routes/HomePage';
import { CreatePage } from './routes/CreatePage';
import { StoryPage } from './routes/StoryPage';
import { EditPage } from './routes/EditPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { LangProvider } from './i18n';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/s/:id" element={<StoryPage />} />
          <Route path="/s/:id/v/:version" element={<StoryPage />} />
          <Route path="/s/:id/edit" element={<EditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Confirm typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/main.tsx
git commit -m "Wrap app in LangProvider"
```

---

## Task 6 — Build the SettingsCog component

**Files:**
- Create: `apps/web/src/components/SettingsCog.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Create `SettingsCog.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useLang, useT } from '../i18n';

export function SettingsCog() {
  const t = useT();
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="settings-cog" ref={popoverRef}>
      <button
        type="button"
        className="cog-btn"
        aria-label={t('settings.title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {'⚙'}
      </button>
      {open && (
        <div className="cog-popover" role="dialog" aria-label={t('settings.title')}>
          <div className="cog-row">
            <span className="cog-label">{t('settings.language')}</span>
            <div className="cog-segmented">
              <button
                type="button"
                className={lang === 'en' ? 'on' : ''}
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
              >
                {t('settings.languageEn')}
              </button>
              <button
                type="button"
                className={lang === 'sv' ? 'on' : ''}
                onClick={() => setLang('sv')}
                aria-pressed={lang === 'sv'}
              >
                {t('settings.languageSv')}
              </button>
            </div>
          </div>
          <button type="button" className="cog-close" onClick={() => setOpen(false)}>
            {t('settings.close')}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Append styles for the cog and popover to `styles.css`**

Append at the bottom of `apps/web/src/styles.css`:

```css
/* Settings cog */
.settings-cog { position: relative; }
.cog-btn {
  background: var(--paper);
  border: 3px solid var(--ink);
  border-radius: 999px;
  width: 48px; height: 48px;
  font-size: 22px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow);
}
.cog-btn:hover { background: var(--accent-soft); }
.cog-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 10;
  background: var(--paper);
  border: 3px solid var(--ink);
  border-radius: 18px;
  padding: 16px;
  box-shadow: var(--shadow);
  min-width: 240px;
}
.cog-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.cog-label { font-weight: 700; color: var(--ink-soft); }
.cog-segmented { display: inline-flex; gap: 0; border: 3px solid var(--ink); border-radius: 12px; overflow: hidden; }
.cog-segmented button {
  background: var(--paper);
  border: none;
  font: inherit;
  font-weight: 700;
  padding: 10px 14px;
  cursor: pointer;
}
.cog-segmented button.on { background: var(--sun); }
.cog-segmented button + button { border-left: 3px solid var(--ink); }
.cog-close {
  width: 100%;
  background: var(--accent-soft);
  border: 3px solid var(--ink);
  border-radius: 12px;
  padding: 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.cog-close:hover { background: var(--accent); color: var(--paper); }
```

- [ ] **Step 3: Confirm typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/SettingsCog.tsx apps/web/src/styles.css
git commit -m "Add SettingsCog with language toggle"
```

---

## Task 7 — Translate Layout (brand + dedication + cog)

**Files:**
- Modify: `apps/web/src/components/Layout.tsx`

- [ ] **Step 1: Replace the contents of `Layout.tsx`**

```tsx
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { SettingsCog } from './SettingsCog';

export function Layout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="page">
      <div className="header">
        <Link to="/" className="brand">
          {t('brand.name')}
          <small>{t('brand.tagline')}</small>
        </Link>
        <SettingsCog />
      </div>
      {children}
      <div className="footer">{t('dedication.line')}</div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Smoke-test in the browser**

Start the dev server:

```bash
npm run dev
```

Open http://localhost:8888 in a browser. Verify:
- Header shows "Brennan & Linnéa's Story Maker" with the tagline.
- A gear icon sits at the right of the header.
- Clicking the gear shows the popover; toggling between EN and SV instantly flips the brand, tagline, and footer dedication.
- Reloading the page preserves the chosen language.

Stop the dev server (`Ctrl+C`) when done.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/Layout.tsx
git commit -m "Translate Layout: bilingual brand, dedication, settings cog"
```

---

## Task 8 — Translate HomePage

**Files:**
- Modify: `apps/web/src/routes/HomePage.tsx`

- [ ] **Step 1: Replace the contents of `HomePage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { listStories } from '../api';
import { useT } from '../i18n';
import type { StorySummary } from '../types';

export function HomePage() {
  const t = useT();
  const [recent, setRecent] = useState<StorySummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listStories()
      .then((items) => setRecent(items))
      .catch(() => { /* swallow: home still works without recent list */ })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <Layout>
      <div className="hero">
        <h1>{t('home.heroTitle')}</h1>
        <p>{t('home.heroBody')}</p>
        <Link to="/create" className="btn sun">{t('home.heroCta')}</Link>
      </div>

      <h2 style={{ marginTop: 8 }}>{t('home.recentHeading')}</h2>
      {!loaded && <div className="subtle">{t('home.recentLoading')}</div>}
      {loaded && recent.length === 0 && (
        <div className="note">{t('home.recentEmpty')}</div>
      )}
      {recent.length > 0 && (
        <div className="recent-list">
          {recent.map((s) => (
            <Link key={s.id} to={`/s/${s.id}`} className="recent-card">
              <div className="thumb">
                {s.cover_image_url
                  ? <img src={s.cover_image_url} alt={s.title} />
                  : <span style={{ fontSize: 60 }}>{'\u{1F4D6}'}</span>}
              </div>
              <div className="meta">
                <b>{s.title}</b>
                <span>v{s.latest_version}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
```

- [ ] **Step 2: Confirm typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Smoke-test**

`npm run dev`, open the home page, switch EN ↔ SV via the cog; verify hero, list heading, and empty state all swap.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/HomePage.tsx
git commit -m "Translate HomePage"
```

---

## Task 9 — Add `language` to types and API

**Files:**
- Modify: `apps/web/src/types.ts`
- Modify: `netlify/functions/_lib/types.ts`
- Modify: `apps/web/src/api.ts`

- [ ] **Step 1: Update the frontend type**

In `apps/web/src/types.ts`, change `StoryVersion` to:

```ts
export interface StoryVersion {
  id: string;
  version: number;
  title: string;
  paragraphs: Paragraph[];
  narration_url: string | null;
  source_answers: StoryAnswer[];
  created_at: string;
  status: StoryStatus;
  error?: string;
  language: 'en' | 'sv';
}
```

(All other fields unchanged; only `language` is added.)

- [ ] **Step 2: Update the backend type**

In `netlify/functions/_lib/types.ts`, add the same `language` field to the `StoryVersion` interface:

```ts
export interface StoryVersion {
  id: string;
  version: number;
  title: string;
  paragraphs: Paragraph[];
  narration_url: string | null;
  source_answers: StoryAnswer[];
  created_at: string;
  status: StoryStatus;
  error?: string;
  language: 'en' | 'sv';
}
```

- [ ] **Step 3: Update `createStory` in `api.ts` to send language**

In `apps/web/src/api.ts`, change the `createStory` signature and body:

```ts
export async function createStory(answers: StoryAnswer[], language: 'en' | 'sv'): Promise<StoryVersion> {
  const res = await fetch(`${FN_BASE}/createStory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, language }),
  });
  return jsonOrThrow<StoryVersion>(res);
}
```

- [ ] **Step 4: Confirm typecheck fails in the expected places**

```bash
npm run typecheck
```

Expected: type errors in `CreatePage.tsx` (calls `createStory(payload)` without language) and in backend files that construct `StoryVersion` without `language`. We fix these in the following tasks.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/types.ts apps/web/src/api.ts netlify/functions/_lib/types.ts
git commit -m "Add language field to StoryVersion and createStory API"
```

(Typecheck is intentionally red at this commit — the next tasks make it green.)

---

## Task 10 — Thread `language` through the backend pipeline

**Files:**
- Modify: `netlify/functions/_lib/anthropic.ts`
- Modify: `netlify/functions/_lib/build.ts`
- Modify: `netlify/functions/createStory.ts`
- Modify: `netlify/functions/createWorker-background.ts`
- Modify: `netlify/functions/updateStory.ts`
- Modify: `netlify/functions/updateWorker-background.ts`
- Modify: `netlify/functions/_lib/storage.ts` (no change to the file unless the stored shape is wrong — see step below)

- [ ] **Step 1: Update `generateStory` to take a language**

In `netlify/functions/_lib/anthropic.ts`, change `generateStory`:

```ts
const LANG_NAMES: Record<'en' | 'sv', string> = { en: 'English', sv: 'Swedish (svenska)' };

export async function generateStory(answers: StoryAnswer[], language: 'en' | 'sv'): Promise<GeneratedStory> {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const formattedAnswers = answers
    .map((a) => `${a.question}\n${a.answer}`)
    .join('\n\n');

  const langName = LANG_NAMES[language];
  const languageInstruction = `Write the title and every paragraph's "text" in ${langName}. Keep every "image_prompt" in English so the image model understands it.`;

  const response = await client.messages.create({
    model,
    max_tokens: 2500,
    system: STORY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here are the kid's answers. Use them to write the story.\n\n${formattedAnswers}\n\n${languageInstruction}\n\nReturn only the JSON object.`,
      },
    ],
  });
  // ...rest of the function is unchanged...
```

Leave everything below `response.content.find(...)` exactly as it is.

- [ ] **Step 2: Update `build.ts` to carry language**

In `netlify/functions/_lib/build.ts`:

Update `saveGeneratingStub` to accept and store the language:

```ts
export async function saveGeneratingStub(opts: {
  id: string;
  version: number;
  sourceAnswers: StoryAnswer[];
  language: 'en' | 'sv';
}): Promise<StoryVersion> {
  const stub: StoryVersion = {
    id: opts.id,
    version: opts.version,
    title: 'Your new story',
    paragraphs: [],
    narration_url: null,
    source_answers: opts.sourceAnswers,
    created_at: new Date().toISOString(),
    status: 'generating',
    language: opts.language,
  };
  await saveStoryVersion(stub);
  return stub;
}
```

Update `saveFailedVersion` similarly:

```ts
export async function saveFailedVersion(opts: {
  id: string;
  version: number;
  sourceAnswers: StoryAnswer[];
  error: string;
  language: 'en' | 'sv';
}): Promise<void> {
  const rec: StoryVersion = {
    id: opts.id,
    version: opts.version,
    title: 'Story did not finish',
    paragraphs: [],
    narration_url: null,
    source_answers: opts.sourceAnswers,
    created_at: new Date().toISOString(),
    status: 'failed',
    error: opts.error,
    language: opts.language,
  };
  await saveStoryVersion(rec);
}
```

Update `BuildOptions` and `buildAndSaveVersion`:

```ts
interface BuildOptions {
  id?: string;
  version: number;
  title?: string;
  sourceAnswers: StoryAnswer[];
  language: 'en' | 'sv';
  paragraphs: { text: string; image_prompt?: string; image_url: string | null; regenerate_image?: boolean }[];
}

export async function buildAndSaveVersion(opts: BuildOptions): Promise<StoryVersion> {
  const id = opts.id ?? randomUUID();
  const title = opts.title?.trim() || 'A Brand New Story';

  const tasks = opts.paragraphs.map(async (p, i) => {
    // ...existing image task, unchanged...
  });

  const narrationText = opts.paragraphs.map((p) => p.text).join('\n\n');
  const narrationTask = synthesize(narrationText).then((audio) =>
    storeMedia(`${id}-v${opts.version}.mp3`, audio, 'audio/mpeg')
  );

  const [paragraphs, narrationUrl] = await Promise.all([Promise.all(tasks), narrationTask]);

  const version: StoryVersion = {
    id,
    version: opts.version,
    title,
    paragraphs,
    narration_url: narrationUrl,
    source_answers: opts.sourceAnswers,
    created_at: new Date().toISOString(),
    status: 'ready',
    language: opts.language,
  };
  await saveStoryVersion(version);
  return version;
}
```

Update `buildFromAnswers`:

```ts
export async function buildFromAnswers(id: string, answers: StoryAnswer[], language: 'en' | 'sv'): Promise<StoryVersion> {
  await moderateAnswers(answers);
  const generated = await safelyGenerate(answers, language);
  return buildAndSaveVersion({
    id,
    version: 1,
    title: generated.title,
    sourceAnswers: answers,
    language,
    paragraphs: generated.paragraphs.map((p) => ({
      text: p.text,
      image_prompt: p.image_prompt,
      image_url: null,
    })),
  });
}

async function safelyGenerate(answers: StoryAnswer[], language: 'en' | 'sv'): Promise<GeneratedStory> {
  const generated = await generateStory(answers, language);
  const fullText = `${generated.title}\n\n${generated.paragraphs.map((p) => p.text).join('\n\n')}`;
  const result = await moderate(fullText);
  if (result.flagged) {
    throw new ModerationError(
      'The story came out a little off. Try asking again with different details.'
    );
  }
  return generated;
}
```

- [ ] **Step 3: Update `createStory.ts` to read `language` from the request**

Replace the existing `CreateStoryRequest` and the handler body inside `netlify/functions/createStory.ts`:

```ts
interface CreateStoryRequest {
  answers: StoryAnswer[];
  language: 'en' | 'sv';
}

// inside the handler, after parsing the body and before validating answers:
if (body.language !== 'en' && body.language !== 'sv') {
  return badRequest('language must be "en" or "sv"');
}
```

Pass `language` to `saveGeneratingStub` and into the background fetch body:

```ts
await saveGeneratingStub({ id, version: 1, sourceAnswers: trimmed, language: body.language });
// ...
await fetch(`${siteUrl}/.netlify/functions/createWorker-background`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, version: 1, answers: trimmed, language: body.language }),
});
```

And include `language` in the optimistic response:

```ts
return json({
  id, version: 1, status: 'generating',
  title: 'Your new story', paragraphs: [], narration_url: null,
  source_answers: trimmed, created_at: new Date().toISOString(),
  language: body.language,
}, 202);
```

- [ ] **Step 4: Update `createWorker-background.ts` to accept and pass `language`**

```ts
interface WorkerRequest {
  id: string;
  version: number;
  answers: StoryAnswer[];
  language: 'en' | 'sv';
}

// ...inside the handler:
if (body.language !== 'en' && body.language !== 'sv') {
  console.error('background worker missing language', body);
  return new Response('bad request', { status: 400 });
}

try {
  const story = await buildFromAnswers(body.id, body.answers, body.language);
  console.log('story built', story.id, story.title, story.paragraphs.length, 'paragraphs');
} catch (e) {
  const message = e instanceof ModerationError
    ? e.message
    : `Something went wrong while making the story: ${(e as Error).message}`;
  console.error('background worker failed', e);
  try {
    await saveFailedVersion({
      id: body.id,
      version: body.version || 1,
      sourceAnswers: body.answers,
      error: message,
      language: body.language,
    });
  } catch (saveErr) {
    console.error('Could not record failure state', saveErr);
  }
}
```

- [ ] **Step 5: Forward language through `updateStory.ts`**

Language is **not** in the update request body — it's immutable per story. The trigger already loads the previous version via `getStoryVersion`; reuse `previous.language` when dispatching the worker and when writing the stub. Replace `updateStory.ts` with:

```ts
import type { Context } from '@netlify/functions';
import { saveGeneratingStub } from './_lib/build';
import { getStoryIndex, getStoryVersion } from './_lib/storage';
import { badRequest, json, notFound, readJson, serverError } from './_lib/util';

interface UpdateStoryRequest {
  id: string;
  title: string;
  paragraphs: { text: string; image_url: string | null; image_prompt?: string; regenerate_image?: boolean }[];
}

export default async (req: Request, _ctx: Context): Promise<Response> => {
  if (req.method !== 'POST') return badRequest('POST only');
  let body: UpdateStoryRequest;
  try {
    body = await readJson<UpdateStoryRequest>(req);
  } catch (e) {
    return badRequest((e as Error).message);
  }
  if (!body.id) return badRequest('Missing story id');
  if (!Array.isArray(body.paragraphs) || body.paragraphs.length === 0) {
    return badRequest('paragraphs must be a non empty array');
  }
  const idx = await getStoryIndex(body.id);
  if (!idx) return notFound('That story does not exist.');
  const previous = await getStoryVersion(body.id, idx.latest_version);
  if (!previous) return notFound('That story version is missing.');

  const language = previous.language ?? 'en';
  const nextVersion = idx.latest_version + 1;
  try {
    await saveGeneratingStub({
      id: body.id,
      version: nextVersion,
      sourceAnswers: previous.source_answers ?? [],
      language,
    });
  } catch (e) {
    console.error('updateStory stub failed', e);
    return serverError((e as Error).message);
  }

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || `https://${req.headers.get('host') || ''}`;
  try {
    await fetch(`${siteUrl}/.netlify/functions/updateWorker-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: body.id,
        version: nextVersion,
        title: body.title || idx.title,
        sourceAnswers: previous.source_answers ?? [],
        language,
        paragraphs: body.paragraphs.map((p) => ({
          text: p.text,
          image_url: p.image_url ?? null,
          image_prompt: p.image_prompt,
          regenerate_image: !!p.regenerate_image,
        })),
      }),
    });
  } catch (e) {
    console.error('Failed to dispatch update worker', e);
    return serverError('Could not start the editor');
  }

  return json({
    id: body.id,
    version: nextVersion,
    status: 'generating',
    title: body.title || idx.title,
    paragraphs: [],
    narration_url: null,
    source_answers: previous.source_answers ?? [],
    created_at: new Date().toISOString(),
    language,
  }, 202);
};
```

- [ ] **Step 6: Forward language through `updateWorker-background.ts`**

Replace the file with:

```ts
import type { Context } from '@netlify/functions';
import { buildAndSaveVersion, saveFailedVersion } from './_lib/build';
import type { StoryAnswer } from './_lib/types';

interface WorkerRequest {
  id: string;
  version: number;
  title: string;
  sourceAnswers: StoryAnswer[];
  language: 'en' | 'sv';
  paragraphs: { text: string; image_url: string | null; image_prompt?: string; regenerate_image?: boolean }[];
}

export default async (req: Request, _ctx: Context): Promise<Response> => {
  let body: WorkerRequest;
  try {
    body = await req.json();
  } catch (e) {
    console.error('update worker bad body', e);
    return new Response('bad request', { status: 400 });
  }
  if (body.language !== 'en' && body.language !== 'sv') {
    console.error('update worker missing language', body);
    return new Response('bad request', { status: 400 });
  }
  try {
    const story = await buildAndSaveVersion({
      id: body.id,
      version: body.version,
      title: body.title,
      sourceAnswers: body.sourceAnswers,
      language: body.language,
      paragraphs: body.paragraphs,
    });
    console.log('story updated', story.id, 'v' + story.version);
  } catch (e) {
    console.error('update worker failed', e);
    try {
      await saveFailedVersion({
        id: body.id,
        version: body.version,
        sourceAnswers: body.sourceAnswers,
        language: body.language,
        error: `Something went wrong while saving the new version: ${(e as Error).message}`,
      });
    } catch (saveErr) {
      console.error('Could not record failure state', saveErr);
    }
  }
  return new Response(null, { status: 202 });
};
```

- [ ] **Step 7: Confirm typecheck is green across the workspace**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add netlify/functions/_lib/anthropic.ts netlify/functions/_lib/build.ts netlify/functions/createStory.ts netlify/functions/createWorker-background.ts netlify/functions/updateStory.ts netlify/functions/updateWorker-background.ts
git commit -m "Thread language through Claude prompt and story build pipeline"
```

---

## Task 11 — Browser STT language hint

**Files:**
- Modify: `apps/web/src/speech.ts`
- Modify: `apps/web/src/components/MicInput.tsx`

- [ ] **Step 1: Update `listenOnce` to accept a language**

In `apps/web/src/speech.ts`, change the signature:

```ts
export function listenOnce(
  onResult: (transcript: string) => void,
  onError?: (err: string) => void,
  opts?: { lang?: string }
): ListenHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError?.('Speech recognition is not available in this browser. Please type your answer.');
    return null;
  }
  const r = new Ctor();
  r.lang = opts?.lang ?? 'en-US';
  // ...rest unchanged...
}
```

- [ ] **Step 2: Pass the language through `MicInput`**

Update `apps/web/src/components/MicInput.tsx`:

```tsx
interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
  language: 'en' | 'sv';
}

export function MicInput({ value, onChange, placeholder, ariaLabel, language }: Props) {
  // ...existing state...

  const startListening = () => {
    setError(null);
    setListening(true);
    const sttLang = language === 'sv' ? 'sv-SE' : 'en-US';
    handleRef.current = listenOnce(
      (transcript) => {
        setListening(false);
        if (transcript) onChange((value ? value + ' ' : '') + transcript);
      },
      (err) => {
        setListening(false);
        setError(err);
      },
      { lang: sttLang }
    );
    if (!handleRef.current) setListening(false);
  };

  // ...rest unchanged...
}
```

- [ ] **Step 3: Confirm typecheck passes**

```bash
npm run typecheck
```

Expected: errors only in `CreatePage.tsx` (which still calls `<MicInput>` without `language`). Resolved in Task 12.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/speech.ts apps/web/src/components/MicInput.tsx
git commit -m "Pass language hint to browser SpeechRecognition via MicInput"
```

---

## Task 12 — Translate CreatePage and add language pick step

**Files:**
- Modify: `apps/web/src/routes/CreatePage.tsx`

This is the largest single edit in the plan. The full replacement keeps the existing question structure but:
- Pulls every visible string from `useT()`.
- Pulls question prompts/spoken/placeholders from `useT()` via the existing key names.
- Prepends a *language pick* step (only the language picker — the full "what kind of story?" opener lands in plan 3).
- Pre-selects the language from the UI language but lets the kid switch.
- Passes the chosen language to `createStory()` and to `<MicInput>`.

- [ ] **Step 1: Replace the contents of `CreatePage.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MicInput } from '../components/MicInput';
import { createStory } from '../api';
import { cancelSpeech, speak } from '../speech';
import { useLang, useT } from '../i18n';
import type { Lang } from '../i18n';
import type { StoryAnswer } from '../types';
import type { StringKey } from '../i18n/strings/en';

interface Question {
  id: string;
  promptKey: StringKey;
  spokenKey: StringKey;
  placeholderKey: StringKey;
  required: boolean;
}

const QUESTIONS: Question[] = [
  { id: 'hero', promptKey: 'q.hero.prompt', spokenKey: 'q.hero.spoken', placeholderKey: 'q.hero.placeholder', required: true },
  { id: 'setting', promptKey: 'q.setting.prompt', spokenKey: 'q.setting.spoken', placeholderKey: 'q.setting.placeholder', required: true },
  { id: 'goal', promptKey: 'q.goal.prompt', spokenKey: 'q.goal.spoken', placeholderKey: 'q.goal.placeholder', required: true },
  { id: 'friend', promptKey: 'q.friend.prompt', spokenKey: 'q.friend.spoken', placeholderKey: 'q.friend.placeholder', required: false },
  { id: 'problem', promptKey: 'q.problem.prompt', spokenKey: 'q.problem.spoken', placeholderKey: 'q.problem.placeholder', required: false },
  { id: 'ending', promptKey: 'q.ending.prompt', spokenKey: 'q.ending.spoken', placeholderKey: 'q.ending.placeholder', required: false },
];

export function CreatePage() {
  const t = useT();
  const { lang: uiLang } = useLang();
  const navigate = useNavigate();

  // Story language is initialized from UI language but pickable per story.
  const [storyLang, setStoryLang] = useState<Lang | null>(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spokenForRef = useRef<number>(-1);

  const q = QUESTIONS[step];
  const totalDone = Object.keys(answers).length;
  const minDone = QUESTIONS.filter((x) => x.required).length;
  const canFinish = totalDone >= minDone;
  const isLastQuestion = step >= QUESTIONS.length - 1;

  useEffect(() => {
    if (!storyLang) return;
    if (!q) return;
    if (spokenForRef.current === step) return;
    spokenForRef.current = step;
    speak(t(q.spokenKey));
    return () => cancelSpeech();
  }, [step, q, storyLang, t]);

  useEffect(() => () => cancelSpeech(), []);

  // Step 0: pick the story's language.
  if (!storyLang) {
    return (
      <Layout>
        <div className="card">
          <div className="question">{t('create.langStepTitle')}</div>
          <div className="row" style={{ marginTop: 16 }}>
            <button type="button" className="btn" onClick={() => setStoryLang('en')}>
              {t('create.langStepEn')}
            </button>
            <button type="button" className="btn secondary" onClick={() => setStoryLang('sv')}>
              {t('create.langStepSv')}
            </button>
          </div>
          <p className="subtle" style={{ marginTop: 16 }}>
            {t('home.heroBody')}
          </p>
        </div>
      </Layout>
    );
  }

  // Once we run past the last question.
  if (!q) {
    return (
      <Layout>
        <div className="card">
          <div className="question">{t('create.allSet')}</div>
          <p>{t('create.allSetHint')}</p>
        </div>
      </Layout>
    );
  }

  const acceptCurrent = () => {
    const trimmed = current.trim();
    if (!trimmed) {
      setError(t('create.typeOrSpeak'));
      return;
    }
    setError(null);
    setAnswers((prev) => ({ ...prev, [q.id]: trimmed }));
    setCurrent('');
    setStep((s) => s + 1);
  };

  const skipOptional = () => {
    setError(null);
    setCurrent('');
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const payload: StoryAnswer[] = QUESTIONS
      .filter((qq) => answers[qq.id])
      .map((qq) => ({ question: t(qq.promptKey), answer: answers[qq.id] }));
    try {
      const story = await createStory(payload, storyLang);
      navigate(`/s/${story.id}`);
    } catch (e) {
      setSubmitting(false);
      setError((e as Error).message);
    }
  };

  if (submitting) {
    return (
      <Layout>
        <div className="card loading">
          <div className="spinner" />
          <div className="question">{t('create.sending')}</div>
        </div>
      </Layout>
    );
  }

  // We don't show progress for the language-pick step, so step 0 of QUESTIONS is the first slot.
  const progressPct = Math.min(100, Math.round((step / QUESTIONS.length) * 100));

  return (
    <Layout>
      <div className="progress" aria-hidden="true">
        <div style={{ width: `${progressPct}%` }} />
      </div>
      <div className="card">
        <div className="question">{t(q.promptKey)}</div>
        <p className="subtle">
          {q.required ? t('create.required') : t('create.optional')}
        </p>
        <button type="button" className="btn ghost" onClick={() => speak(t(q.spokenKey))}>
          {t('create.hearAgain')}
        </button>

        <div style={{ marginTop: 16 }}>
          <MicInput
            value={current}
            onChange={setCurrent}
            placeholder={t(q.placeholderKey)}
            ariaLabel={t(q.promptKey)}
            language={storyLang}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <div className="row between" style={{ marginTop: 16 }}>
          <div className="row">
            {!q.required && (
              <button type="button" className="btn ghost" onClick={skipOptional}>
                {t('create.skipThis')}
              </button>
            )}
          </div>
          <div className="row">
            {canFinish && !isLastQuestion && (
              <button type="button" className="btn secondary" onClick={submit}>
                {t('create.makeStory')}
              </button>
            )}
            <button type="button" className="btn" onClick={acceptCurrent}>
              {isLastQuestion ? t('create.saveAnswer') : t('create.next')}
            </button>
            {canFinish && isLastQuestion && (
              <button type="button" className="btn sun" onClick={submit}>
                {t('create.makeStory')}
              </button>
            )}
          </div>
        </div>
      </div>

      {totalDone > 0 && (
        <div className="card">
          <div className="subtle" style={{ marginBottom: 6 }}>{t('create.soFar')}</div>
          <ul className="answer-list">
            {QUESTIONS.filter((qq) => answers[qq.id]).map((qq) => (
              <li key={qq.id}>
                <b>{t(qq.promptKey)}</b><br />
                {answers[qq.id]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Layout>
  );
}
```

- [ ] **Step 2: Initialize `storyLang` from UI language (avoid a click for monolingual users)**

Refine the `useState<Lang | null>(null)` initializer so that if the user has clearly already picked their UI language, the story language defaults the same way but still shows the pick step (so they can switch). Replace the `useState` line with:

```tsx
const [storyLang, setStoryLang] = useState<Lang | null>(null);
const suggestedLang: Lang = uiLang;

// In the pick step JSX, highlight the suggested language:
<button type="button" className={`btn${suggestedLang === 'en' ? ' sun' : ''}`} onClick={() => setStoryLang('en')}>
  {t('create.langStepEn')}
</button>
<button type="button" className={`btn${suggestedLang === 'sv' ? ' sun' : ''}`} onClick={() => setStoryLang('sv')}>
  {t('create.langStepSv')}
</button>
```

(Replace the two language buttons in step 1 with this version. `suggestedLang` is just a visual hint — both buttons remain clickable.)

- [ ] **Step 3: Confirm typecheck passes**

```bash
npm run typecheck
```

Expected: no errors anywhere in the workspace.

- [ ] **Step 4: Smoke-test the create flow**

`npm run dev`, then:
- Open `/create` in English UI. Verify the language pick step appears, the English button is highlighted as suggested. Click English. The question prompts and helper buttons render in English.
- Toggle the UI to Swedish via the cog. Open `/create` again. Swedish is suggested. Pick Swedish. Question prompts render in Swedish.
- Pick a hero, setting, and goal. Click "Make my story" / "Skapa min saga". The request should reach `/createStory` with `language: 'sv'` (verify in the network panel). The resulting story page should display Swedish text.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/CreatePage.tsx
git commit -m "Translate CreatePage and add per-story language pick step"
```

---

## Task 13 — Translate StoryPage, EditPage, NotFoundPage

**Files:**
- Modify: `apps/web/src/routes/StoryPage.tsx`
- Modify: `apps/web/src/routes/EditPage.tsx`
- Modify: `apps/web/src/routes/NotFoundPage.tsx`

- [ ] **Step 1: Translate StoryPage chrome**

In `apps/web/src/routes/StoryPage.tsx`, add the imports and hook calls at the top of the component:

```tsx
import { useLang, useT } from '../i18n';
// ...
export function StoryPage() {
  const t = useT();
  const { lang } = useLang();
  // ...existing useParams, useState, useRef, useEffect...
```

Replace the following literals (line numbers may shift after edits — match on text):

- `<p>Opening the story...</p>` → `<p>{t('story.opening')}</p>`
- `{error ?? 'Story not found.'}` → `{error ?? t('story.notFound')}`
- `<Link to="/" className="btn">Back to home</Link>` → `<Link to="/" className="btn">{t('story.backHome')}</Link>`
- `<div className="question">Making your story...</div>` → `<div className="question">{t('story.makingTitle')}</div>`
- The `<p className="subtle">…</p>` block starting "Writing the words, drawing the pictures…" → `<p className="subtle">{t('story.makingHint')}</p>`
- `<div className="question">Something went wrong.</div>` → `<div className="question">{t('story.failedTitle')}</div>`
- `<p>{story.error ?? 'The story could not be made this time.'}</p>` → `<p>{story.error ?? t('story.failedDefault')}</p>`
- `<Link to="/create" className="btn">Try a new one</Link>` → `<Link to="/create" className="btn">{t('story.tryNew')}</Link>`
- `<Link to="/" className="btn ghost">Back to home</Link>` → `<Link to="/" className="btn ghost">{t('story.backHome')}</Link>`
- `<Link to={`/s/${story.id}/edit`} className="btn secondary">Edit this story</Link>` → `…>{t('story.editLink')}</Link>`
- `<Link to="/create" className="btn">Make a new one</Link>` → `<Link to="/create" className="btn">{t('story.makeAnother')}</Link>`
- The version meta line `Version {story.version} (saved {formatDate(story.created_at)})` → `{t('story.versionPrefix')} {story.version} ({t('story.savedPrefix')} {formatDate(story.created_at, lang)})`

Update the `formatDate` helper at the bottom of the file to take a language:

```ts
function formatDate(s: string, lang: 'en' | 'sv'): string {
  try {
    const d = new Date(s);
    const locale = lang === 'sv' ? 'sv-SE' : 'en-US';
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return s;
  }
}
```

The image `alt` attribute can stay in English for now — alt text is non-blocking polish.

- [ ] **Step 2: Translate EditPage chrome**

Replace `apps/web/src/routes/EditPage.tsx` end-to-end with:

```tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getStory, updateStory } from '../api';
import { useT } from '../i18n';
import type { Paragraph, StoryVersion } from '../types';

interface DraftParagraph extends Paragraph {
  regenerate_image?: boolean;
}

export function EditPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<StoryVersion | null>(null);
  const [title, setTitle] = useState('');
  const [paragraphs, setParagraphs] = useState<DraftParagraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getStory(id)
      .then((s) => {
        setStory(s);
        setTitle(s.title);
        setParagraphs(s.paragraphs.map((p) => ({ ...p })));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const updateParagraph = (i: number, patch: Partial<DraftParagraph>) => {
    setParagraphs((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const save = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const next = await updateStory(
        id,
        paragraphs.map((p) => ({
          text: p.text,
          image_url: p.regenerate_image ? null : p.image_url,
          image_prompt: p.image_prompt,
          regenerate_image: !!p.regenerate_image,
        })),
        title
      );
      navigate(`/s/${next.id}/v/${next.version}`);
    } catch (e) {
      setSaving(false);
      setError((e as Error).message);
    }
  };

  if (loading) {
    return <Layout><div className="card loading"><div className="spinner" /><p>{t('edit.loading')}</p></div></Layout>;
  }
  if (error || !story) {
    return <Layout><div className="error">{error ?? t('edit.notFound')}</div></Layout>;
  }
  if (saving) {
    return (
      <Layout>
        <div className="card loading">
          <div className="spinner" />
          <div className="question">{t('edit.sending')}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="story-title">{t('edit.heading')}</h1>
      <p className="story-meta">{t('edit.versionNote', { next: String(story.version + 1) })}</p>

      <div className="card">
        <label className="question" htmlFor="title">{t('edit.titleLabel')}</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {paragraphs.map((p, i) => (
        <div className="card" key={i}>
          <div className="question">{t('edit.paragraphLabel', { n: String(i + 1) })}</div>
          <textarea
            value={p.text}
            rows={5}
            onChange={(e) => updateParagraph(i, { text: e.target.value })}
            aria-label={t('edit.paragraphLabel', { n: String(i + 1) })}
          />
          <div className="row" style={{ marginTop: 12 }}>
            <label className="row" style={{ gap: 8 }}>
              <input
                type="checkbox"
                checked={!!p.regenerate_image}
                onChange={(e) => updateParagraph(i, { regenerate_image: e.target.checked })}
              />
              {t('edit.regenerateImage')}
            </label>
          </div>
          {p.image_url && !p.regenerate_image && (
            <div style={{ marginTop: 12 }}>
              <img src={p.image_url} alt={t('edit.paragraphLabel', { n: String(i + 1) })} style={{ maxWidth: 240, borderRadius: 16, border: '3px solid var(--ink)' }} />
            </div>
          )}
        </div>
      ))}

      <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}>
        <Link to={`/s/${story.id}`} className="btn ghost">{t('edit.cancel')}</Link>
        <button type="button" className="btn sun" onClick={save}>{t('edit.save')}</button>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 3: Translate NotFoundPage**

Replace `apps/web/src/routes/NotFoundPage.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useT } from '../i18n';

export function NotFoundPage() {
  const t = useT();
  return (
    <Layout>
      <div className="hero">
        <h1>{t('notFound.title')}</h1>
        <p>{t('notFound.body')}</p>
        <Link to="/" className="btn">{t('story.backHome')}</Link>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 4: Confirm typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Smoke-test each page**

`npm run dev`. Visit:
- `/s/<existing-story-id>` — verify all loading/edit links translate when the cog flips language. For an `existing-story-id` use any prior story already in Netlify Blobs (or a freshly-created one from Task 12's smoke test).
- `/s/<existing-story-id>/edit` — verify chrome translates.
- `/does-not-exist` — verify the 404 copy translates.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/StoryPage.tsx apps/web/src/routes/EditPage.tsx apps/web/src/routes/NotFoundPage.tsx
git commit -m "Translate StoryPage, EditPage, and NotFoundPage chrome"
```

---

## Task 14 — Update README with bilingual mention and new dedication

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README top section**

Replace the opening of `README.md` (lines 1–10 approximately, "Built for Brennan, by Tom Caswell.") so the title, opening blurb, and dedication read:

```markdown
# Brennan & Linnéa's Story Maker

A small web app that lets kids make their own illustrated, narrated stories in English or Swedish.

A kid picks a language, answers a few simple questions (by voice or by typing), and the app writes a short story, draws a cartoon for each paragraph, and reads it out loud. Each story gets its own link, and stories can be edited into new versions later.

Built with love by Uncle Tom for Brennan and Linnéa's birthdays.
```

Leave the rest of the README intact for now.

- [ ] **Step 2: Add a short "Languages" note under "Stack"**

Insert a new bullet under the "Stack" list:

```markdown
* Languages: English and Swedish, picked per story. UI language is bilingual and detected from the browser, overridable via the settings cog.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Update README: bilingual mention and Brennan & Linnéa dedication"
```

---

## Task 15 — End-to-end verification, push, and deploy

**Files:** none modified; verification only.

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Run unit tests**

```bash
npm --workspace apps/web run test
```

Expected: all i18n tests pass.

- [ ] **Step 3: Run the full dev stack and walk through both languages**

```bash
npm run dev
```

In the browser, complete this smoke sequence:
1. Home loads in the browser's default language (or English fallback). Cog toggles to the other language and back; the choice persists across reload.
2. `/create` shows the language pick step. Pick English. Answer hero/setting/goal. Submit. The created story renders in English with English page chrome.
3. Repeat with `/create` → Swedish. The created story renders in Swedish with Swedish page chrome.
4. From a story page, the audio still plays (no changes to the audio player in this plan).
5. Toggle the cog to Swedish on a freshly-created English story. The story text stays in English (correct — it was generated in English), but the chrome translates.

If any step fails, fix it before proceeding to Step 4.

- [ ] **Step 4: Push to GitHub**

```bash
git push origin main
```

Expected: the commit lands on `tom4cam/Story-Maker`. The Netlify continuous-deploy hook fires (verify in the Netlify dashboard) and the site deploys.

- [ ] **Step 5: Smoke-test the live site**

Visit `https://brennans-story-maker.netlify.app/`. Verify the header brand reads "Brennan & Linnéa's Story Maker" (or the Swedish equivalent if your browser language is Swedish), the cog works, and `/create` shows the language pick step.

---

## Out-of-scope (deferred to plans 2–4)

- **Plan 2 — Word-timed audio and custom audio player.** ElevenLabs `/with-timestamps`, `narration_words` on `StoryVersion`, 5-word sliding-window highlight, click-to-seek, custom play/pause + progress bar UI.
- **Plan 3 — Adaptive create flow and voice picker.** Story-type opener with chips, moderation redirect with safe suggestions, `askVoice` Netlify Function, browser TTS fallback, "Say it simpler" per-question button, "Help me answer" yes/no helper, slow-speech toggle in the settings cog, voice picker with samples, `voice_id` on `StoryVersion`.
- **Plan 4 — Default story seeding.** `scripts/seed-default-stories.ts`, `scripts/data/pip-source.ts`, sample voice MP3s.

Each follow-up plan assumes this one has shipped.
