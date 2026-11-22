# Quant Learn content-pack schema (v5)

Versioned, data-driven units drive **Learn**. Authors may still add a pack module under `content/packs/`, register it in `registry.ts`, and place it in a **collection**’s `children`. At runtime, shipped packs are **seeded into the persistent content store** — the same store that holds imported `.matha` packages.

Schema version constant: `CONTENT_PACK_SCHEMA_VERSION` in `types.ts` (currently **5**). Bump when the pack shape breaks.

**v2:** curriculum **links** + named **spaced-repetition policies**.  
**v3:** nested **collections** tree.  
**v4:** unit-scoped **flash cards** (`cards[]`).  
**v5:** optional **lesson / practice / review**; authored answer types; review kinds (basic / reversible / cloze); **content store** + **`.matha` import**.

Interchange contract: project doc `matha-import-spec.md` (native ZIP format). Format version: `MATHA_FORMAT_VERSION = 1`.

## Hierarchy

```
Learn
 └── Collection (any depth)
      ├── Collection …
      └── Unit (leaf)
```

Activities on a unit are **independently optional**. UI shows Lesson / Practice / Review only when present. **Empty units are rejected** (no lesson, practice, or review).

## Content store

| Rule | Detail |
|------|--------|
| Persistence | AsyncStorage key `matha.content.v1` |
| Model | Shipped + imported share `StoreUnit` / `StoreCollection` |
| Progress | Separate key `matha.progress.v1` — never required in share packages |
| Editability | Imported content is read-only; update via reimport |
| Soft delete | Removed ids marked `active: false`; history kept |

Bootstrap: `bootstrapContentStore()` seeds shipped TS packs (`matha.shipped.probability-foundations`) on first launch.

## Unit shape (v5)

```ts
type ContentPack = {
  meta: PackMeta;           // id, version, schemaVersion, title, order, blurb, links, tags?, attribution?, packageId?
  lesson?: PackLesson;      // intro?, definitions[], examples[]
  practice?: PackPractice;  // sessionSize, mix, generators?, questions?
  review?: PackReview;      // sources[] → expand to cards
  // Legacy (normalized on load):
  cards?: PackCard[];
  drill?: PackDrill;
};
```

### Practice

```ts
practice: {
  sessionSize: number;
  mix: { authored: number; generated: number }; // shares
  generators?: GeneratorId[];  // built-in only: dice | urns | ev
  questions?: AuthoredQuestion[];
  // store/runtime only (not in .matha):
  generatorNewShare?: number;
  reviewGenerators?: GeneratorId[];
}
```

**Answer types:** `rational` | `integer` | `text` (+ `aliases`) | `choice` | `multiChoice` | `manual`.  
Unknown generator ids **hard-fail** validation (never silent discard).  
`manual` imports with a preview warning; auto sessions grade only auto types.

### Review

```ts
review: {
  sources: [{
    id, kind: 'basic' | 'reversible' | 'cloze',
    front?, back?, text?,  // cloze uses {{cN::answer}} or {{cN::answer::hint}}
    cards: [{ id, direction?, clozeIndex? }],
    tags?
  }]
}
```

Progress keys off **card id**. Helper: `expandReviewCards` / `cardsInPack`.

### Lesson examples

Examples may set `answerType` (default `rational` for Quant). Same grading helpers as practice.

## `.matha` package layout

```
example.matha                          # ZIP
├── manifest.json                      # packageId, revision, formatVersion, scope, attribution?
├── tree.json                          # collections + ordered children (omit for bare unit)
├── units/
│   └── <unitId>/
│       ├── unit.json
│       └── assets/
└── assets/
```

Import flow: **File → Preview → Place → Atomic install** (`content/matha/*`, UI `app/quant/learn/import.tsx`).

### Reimport rules

| Situation | Behavior |
|-----------|----------|
| Same revision + same content | No-op |
| Bumped revision | Replace content; preserve progress for unchanged ids |
| New id | Old id treated as deleted |
| Deleted from package | `active: false`; history kept |
| Placement | Preserved on update |
| Id collision (other package) | Block install |

## Collections

Unchanged from v3/v4: `children[]` order is authoritative; packs do not store a parent id.

## Spaced-repetition (generated slots)

Named policies still apply to **generated** practice slots for shipped curriculum (`generatorNewShare` / links). Runtime policy: `RUNTIME_SPACED_REP_POLICY = 'standard'`.

## Authoring

### TS shipped pack

1. Add `uN-*.ts` (may still use legacy `cards` / `drill` — normalized to `review` / `practice`).
2. Register in `registry.ts`; place in `collections.ts`.
3. Seed runs on next fresh store (or bump store / clear AsyncStorage in dev).

### `.matha` package

1. Author JSON under `content/matha/examples/<name>/` (see probability, biology, vocabulary).
2. `npm run build:matha` → `content/matha/fixtures/*.matha`.
3. Import in-app via **Learn → Import .matha**, or run `npm run test:matha`.

## Runtime paths

| Concern | Location |
|---------|----------|
| Types | `content/packs/types.ts` |
| Normalize / expand | `content/packs/normalize.ts` |
| TS registry | `content/packs/registry.ts`, `collections.ts` |
| Content store | `content/store/*` |
| `.matha` parse / validate / install | `content/matha/*` |
| Practice mix | `lib/learnDrill.ts` |
| Grading | `content/matha/grade.ts`, `lib/fraction.ts` |
| Learn UI | `app/quant/learn/*` |
