# Quant Learn content-pack schema (v4)

Versioned, data-driven packs drive **Learn** units. Authors add a pack module under `content/packs/`, register it in `index.ts`, place it in a **collection**’s `children`, and the existing Learn screens + Quant session shell pick it up — **no new routes per unit**.

Schema version constant: `CONTENT_PACK_SCHEMA_VERSION` in `types.ts` (currently **4**). Bump when the pack shape breaks.

**v2 added:** curriculum **links** (`before` / `after` / `prerequisites`) and named **spaced-repetition policies** (`none` | `light` | `standard` | `heavy`). Runtime still applies the **standard / current** mix only (`RUNTIME_SPACED_REP_POLICY`).

**v3 adds:** nested **collections** tree (unlimited depth). Navigation is **Learn → browse collections → units**, with UI breadcrumbs. Not fixed book/chapter levels.

**v4 adds:** unit-scoped **flash cards** (`id` / `front` / `back`) as a separate `cards[]` list on the pack. Lesson prose stays normal (`intro` / `definitions` / `examples`). Cards are **not** section-linked and do **not** replace the lesson with a deck — they power **Review cards** flip study for that unit only.

## Hierarchy

```
Learn
 └── Collection (any depth)
      ├── Collection …
      └── Unit / pack (leaf)
```

v1 tree:

```
c-foundations
 ├── u1-dice
 ├── u2-urns
 └── u3-ev
```

| Concern | Location |
|---------|----------|
| Collections registry | `content/packs/collections.ts` → `LEARN_COLLECTIONS`, `LEARN_ROOT_COLLECTION_IDS` |
| Helpers | `collectionById`, `rootCollections`, `resolveCollectionChildren`, `collectionPath`, `countLeafPacks`, `cardsInPack` |
| Learn home | `app/quant/learn/index.tsx` |
| Collection browser | `app/quant/learn/collection/[collectionId].tsx` (breadcrumbs) |
| Lesson UI | `app/quant/learn/[packId].tsx` (normal lesson + Review cards entry) |
| Card flip study | `app/quant/learn/cards.tsx` (`packId` only) |

## Collection shape

```ts
type CollectionChild =
  | { kind: 'collection'; id: string }
  | { kind: 'pack'; id: string };

type LearnCollection = {
  id: string;           // e.g. "c-foundations"
  title: string;
  blurb?: string;
  children: CollectionChild[];  // nested collections and/or leaf packs
};
```

Depth is unlimited. Placement of a pack in the tree is via some collection’s `children` — packs do **not** carry a parent id.

## Pack shape

```ts
type PackCard = {
  id: string;    // stable within the pack
  front: string; // term / prompt / formula name
  back: string;  // definition / formula / short explanation
};

type ContentPack = {
  meta: {
    id: string;                 // stable slug, e.g. "u1-dice"
    version: number;            // content revision (independent of schema)
    schemaVersion: 4;
    title: string;
    order: number;              // display hint; children[] order is authoritative
    blurb: string;
    links: {
      before: string[];         // pack ids immediately before this unit
      after: string[];          // pack ids immediately after this unit
      prerequisites: string[];  // unlock deps (future) + default SR pool source
    };
  };
  lesson: {
    intro: string;
    definitions: { term: string; body: string }[];
    examples: {
      title: string;
      prompt: string;
      answer: string;           // canonical int or reduced n/d (graded)
      steps: string[];         // revealed after Submit or Show solution
      hint?: string;           // optional — same Hint control as Practice
    }[];
  };
  cards: PackCard[];            // unit Review deck (may be empty)
  drill: {
    n: number;
    newShare: number;               // authored share for policy = standard
    newTopicTags: GeneratorId[];
    reviewTopicTags?: GeneratorId[]; // optional; else derived from prerequisites
  };
};
```

`GeneratorId` matches shipped Quant Practice skills: `"dice" | "urns" | "ev"`.

## Flash cards (unit-only)

| Surface | Behavior |
|---------|----------|
| Lesson | Normal intro / definitions / examples — **not** a card deck |
| Lesson entry | **Review cards** opens flip study when `cards.length > 0` |
| Flip study (`learn/cards?packId=…`) | Front → tap flip → Previous / Next / Done |

Helper: `cardsInPack(pack)` → `pack.cards`.

Author cards for definitions and formulas the learner should retain; keep lesson copy independent.

## Try-first examples

Worked examples are **not** solution dumps on the lesson screen.

| Surface | Behavior |
|---------|----------|
| Lesson (`learn/[packId]`) | Title + prompt + **Try** only — no steps/answer |
| Attempt (`learn/example`) | Same Quant drill chrome: answer box, NumberPad, Scratch, optional Hint, **Submit**, **Show solution** |
| After Submit | Grade with `answersMatch`; reveal Correct / Not quite, canonical `answer`, and `steps` |
| After Show solution | Reveal `answer` + `steps` without requiring an attempt |

Authors **must** supply `answer` + `steps` on every example so grading and reveal work.

## Unit links (graph)

| Field | Meaning |
|-------|---------|
| `before` | Immediate predecessors on the Learn path |
| `after` | Immediate successors |
| `prerequisites` | Units that gate unlock later; also the default set whose `newTopicTags` feed the review pool when `reviewTopicTags` is omitted |

v1 shipped packs (path within `c-foundations`):

```
u1-dice  →  u2-urns  →  u3-ev
```

| Pack | before | after | prerequisites |
|------|--------|-------|---------------|
| `u1-dice` | — | `u2-urns` | — |
| `u2-urns` | `u1-dice` | `u3-ev` | `u1-dice` |
| `u3-ev` | `u2-urns` | — | `u1-dice`, `u2-urns` |

**Unlock (product):** all units remain **open** in v1 UI. `prerequisites` is schema-ready for a future sequential mode.

## Spaced-repetition policies

Named policies in `SPACED_REP_POLICIES` (`types.ts`):

| Id | Review share | Notes |
|----|-------------:|-------|
| `none` | 0% | 100% new |
| `light` | ~15% | |
| `standard` | ~25–30% | **Current curriculum** — uses each pack’s authored `drill.newShare` |
| `heavy` | ~40% | |

- **Runtime today:** always `RUNTIME_SPACED_REP_POLICY = 'standard'` → apply pack `newShare` (U1 100%, U2 ~75/25, U3 ~70/30).
- **Later:** learner picks a policy; non-`standard` policies use `1 − policy.reviewShare` as `newShare` (pack `newShare` ignored).

## Mix rule (runtime)

1. Resolve **review pool**: `drill.reviewTopicTags` if non-empty; else union of `newTopicTags` from packs listed in `links.prerequisites` (fallback `links.before`).
2. Resolve **newShare** from the active policy (see above).
3. `newCount = round(n × newShare)`, `reviewCount = n − newCount` (0 if pool empty).
4. Fill slots from `newTopicTags` / review pool; Fisher–Yates interleave.

## Authoring a new pack

1. Copy an existing `uN-*.ts`; set unique `meta.id`, `meta.order`, and `meta.links`.
2. Append `{ kind: 'pack', id }` to a collection’s `children` in `collections.ts` (or add a nested collection).
3. Write MathA-authored lesson copy (`intro` / `definitions` / `examples`).
4. Add `cards[]` for the unit Review deck (stable `id`s within the pack).
5. Set `drill.newTopicTags` and either explicit `reviewTopicTags` or rely on prerequisites.
6. Set `drill.newShare` for the standard/current mix.
7. Export from `content/packs/index.ts`.

## Runtime paths

| Concern | Location |
|---------|----------|
| Types + policies | `content/packs/types.ts` |
| Collections registry | `content/packs/collections.ts` |
| Registry + review / card resolve | `content/packs/index.ts` |
| Drill mix helper | `lib/learnDrill.ts` |
| Collection / lesson / cards / try-first / session | `app/quant/learn/*`, `app/quant/session.tsx` |
