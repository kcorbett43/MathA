# Quant Learn content-pack schema (v5)

Versioned, data-driven units drive **Learn**. Authors may still add a pack module under `content/packs/`, register it in `registry.ts`, and place it in a **collection**’s `children`. At runtime, shipped packs are **seeded into the persistent content store** — the same store that holds imported `.matha` packages.

Schema version constant: `CONTENT_PACK_SCHEMA_VERSION` in `types.ts` (currently **5**). Bump when the pack *shape* breaks.

**Storage vs content:** `CONTENT_STORE_SCHEMA_VERSION` is the AsyncStorage blob migration version. **Curriculum updates use package `revision`** (shipped sync and `.matha` reimport). Do not bump store schema just to change lesson copy.

Interchange contract: project doc `matha-import-spec.md`. Format version: `MATHA_FORMAT_VERSION = 1`.

## Hierarchy

```
Learn
 └── Collection (any depth)
      ├── Collection …
      └── Unit (leaf)
```

Activities on a unit are **independently optional**. UI shows Lesson / Practice / Review only when present. **Empty units are rejected**.

## Identities and progress

| Rule | Detail |
|------|--------|
| Namespace | Prefer package-prefixed ids for package, collections, units, questions, cards, sources |
| Store keys | Unit/collection ids are **globally unique**; cross-package collision → block install |
| Progress | Keyed by `(packageId, unitId, cardId\|questionId)` — see `content/store/ids.ts` |
| Cloze identity | Card id is the progress identity; text/position edits do not rename — bump id if meaning changes |

## Content store

| Rule | Detail |
|------|--------|
| Persistence | AsyncStorage key `matha.content.v1` |
| Model | Shipped + imported share `StoreUnit` / `StoreCollection` |
| Progress | Separate key `matha.progress.v1` |
| Shipped updates | `syncShippedPackage` on bootstrap — same revision rules as import |
| Soft delete | Removed ids → `active: false`; same id returning → **reactivate** + keep history |
| Editability | Imported content read-only; update via reimport |

## Unit shape (canonical v5)

Store units are **canonical only**: `lesson?` / `practice?` / `review?`.

```ts
type ContentPack = {
  meta: PackMeta;
  lesson?: PackLesson;
  practice?: PackPractice;
  review?: PackReview;
  // Legacy authoring only (TS modules) — normalized away before store write:
  cards?: PackCard[];
  drill?: PackDrill;
};
```

### Normalization (one-way)

- Legacy `drill` → `practice` when `practice` absent; legacy `cards` → `review` when `review` absent.
- **Conflict:** both legacy and modern in a `.matha` unit → **validation error**. TS seed: modern wins, legacy dropped (warning).
- Store never persists `cards` / `drill` mirrors.

### Practice

```ts
practice: {
  sessionSize: number;
  mix: { authored: number; generated: number }; // each ≥ 0, sum === 1
  generators?: GeneratorId[];
  generatorNewShare?: number;   // in .matha — generated-slot new/review mix
  reviewGenerators?: GeneratorId[];
  questions?: AuthoredQuestion[];
}
```

| Rule | Detail |
|------|--------|
| Rounding | `authoredCount = round(n × authored)`, rest generated |
| Repeat | If authoredCount &gt; unique questions, **cycle** the pool |
| Manual | Included in authored pool; session: Show solution → Got it / Missed it |
| Unknown generators | **Hard-fail** (deliberate first-release policy) |

### Review sources → cards

| Kind | Rule |
|------|------|
| `basic` | Exactly **1** card |
| `reversible` | Directions `forward` / `reverse` — **no duplicate** directions |
| `cloze` | Each `clozeIndex` must exist in `{{cN::…}}` markers |

### Lesson examples

May set `answerType` (default `rational` for Quant).

## `.matha` package layout

```
example.matha
├── manifest.json
├── tree.json
├── units/<unitId>/unit.json
└── assets/
```

Import: **File → Preview → Place → Atomic install** (`app/quant/learn/import.tsx`).

### Reimport / shipped sync

| Situation | Behavior |
|-----------|----------|
| Same revision + same content | No-op |
| Same revision + different content | **Reject** |
| Downgrade (rev &lt; installed) | **Reject** |
| Newer revision | Replace content; preserve progress for unchanged triples |
| Deleted id | `active: false`; history kept |
| Same id returns | Reactivate; progress retained |

## Spaced-repetition (generated slots)

`generatorNewShare` / `reviewGenerators` (or links-derived pool) drive generated-slot mix. Runtime policy default: `standard`.

## Authoring

### TS shipped pack

1. Add/update `uN-*.ts`; **bump `meta.version`** when content changes (drives shipped package revision).
2. Register in `registry.ts`; place in `collections.ts`.
3. Existing installs pick up changes via `syncShippedPackage` on next launch.

### `.matha`

1. Copy `content/matha/examples/{probability,biology,vocabulary}/`.
2. `npm run build:matha` → fixtures; import via Learn → **Import .matha**.
3. `npm run test:matha` for acceptance.

## Runtime paths

| Concern | Location |
|---------|----------|
| Types | `content/packs/types.ts` |
| Normalize / fingerprint | `content/packs/normalize.ts` |
| Content store + shipped sync | `content/store/*` |
| Progress keys | `content/store/ids.ts` |
| `.matha` parse / validate / install | `content/matha/*` |
| Practice mix | `lib/learnDrill.ts` |
| Manual self-mark session | `app/quant/session.tsx` |
| Learn UI | `app/quant/learn/*` |
