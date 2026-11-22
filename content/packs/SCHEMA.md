# Quant Learn content-pack schema (v3)

Versioned, data-driven packs drive **Learn** units. Authors add a pack module under `content/packs/`, register it in `index.ts` (and its parent in `modules.ts`), and the existing Learn screens + Quant session shell pick it up — **no new routes per unit**.

Schema version constant: `CONTENT_PACK_SCHEMA_VERSION` in `types.ts` (currently **3**). Bump when the pack shape breaks.

**v2 added:** curriculum **links** (`before` / `after` / `prerequisites`) and named **spaced-repetition policies** (`none` | `light` | `standard` | `heavy`). Runtime still applies the **standard / current** mix only (`RUNTIME_SPACED_REP_POLICY`).

**v3 adds:** **modules** registry + required `meta.moduleId`. Navigation is **Learn → Modules → Units** (not a flat unit list).

## Hierarchy

```
Learn
 └── Module (e.g. m1-foundations)
      ├── Unit / pack (u1-dice)
      ├── Unit / pack (u2-urns)
      └── Unit / pack (u3-ev)
```

| Concern | Location |
|---------|----------|
| Module registry | `content/packs/modules.ts` → `LEARN_MODULES` |
| Module helpers | `moduleById`, `packsForModule` in `index.ts` |
| Module list UI | `app/quant/learn/index.tsx` |
| Unit list UI | `app/quant/learn/module/[moduleId].tsx` |
| Lesson UI | `app/quant/learn/[packId].tsx` |

## Pack shape

```ts
type LearnModule = {
  id: string;           // e.g. "m1-foundations"
  title: string;
  blurb: string;
  order: number;        // among modules, 1-based
  unitIds: string[];    // pack ids in curriculum order
};

type ContentPack = {
  meta: {
    id: string;                 // stable slug, e.g. "u1-dice"
    version: number;            // content revision (independent of schema)
    schemaVersion: 3;
    moduleId: string;           // parent Learn module
    title: string;
    order: number;              // display order within the module (1-based)
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
      steps: string[];         // revealed after attempt / Show solution
      hint?: string;           // optional — try-first attempt UI (PR #9)
    }[];
  };
  drill: {
    n: number;
    newShare: number;               // authored share for policy = standard
    newTopicTags: GeneratorId[];
    reviewTopicTags?: GeneratorId[]; // optional; else derived from prerequisites
  };
};
```

`GeneratorId` matches shipped Quant Practice skills: `"dice" | "urns" | "ev"`.

## Try-first examples

Schema-ready here; attempt UI lands in **PR #9** (`cursor/try-first-learn-examples-ceb3`). Rebase that PR after this modules change merges (or stack #9 onto this branch).

| Surface | Behavior |
|---------|----------|
| Lesson (`learn/[packId]`) | Title + prompt + **Try** only — no steps/answer dump |
| Attempt (`learn/example`) | Quant pad chrome: NumberPad, Scratch, optional Hint, Submit, Show solution |
| After reveal | Canonical `answer` + `steps` |

Authors **must** supply `answer` + `steps` on every example.

## Modules (v1)

| Module | id | Units |
|--------|-----|-------|
| Probability foundations | `m1-foundations` | `u1-dice`, `u2-urns`, `u3-ev` |

## Unit links (graph)

| Field | Meaning |
|-------|---------|
| `before` | Immediate predecessors on the Learn path |
| `after` | Immediate successors |
| `prerequisites` | Units that gate unlock later; also the default set whose `newTopicTags` feed the review pool when `reviewTopicTags` is omitted |

Imported / third-party packs should set these so MathA can order units and build spaced-repetition pools without hard-coding `meta.order`.

v1 shipped packs (path within `m1-foundations`):

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

1. Copy an existing `uN-*.ts`; set unique `meta.id`, `meta.moduleId`, `meta.order`, and `meta.links`.
2. Append the pack id to the parent module’s `unitIds` in `modules.ts` (or add a new module).
3. Write MathA-authored lesson copy.
4. Set `drill.newTopicTags` and either explicit `reviewTopicTags` or rely on prerequisites.
5. Set `drill.newShare` for the standard/current mix.
6. Export from `content/packs/index.ts`.

## Runtime paths

| Concern | Location |
|---------|----------|
| Types + policies | `content/packs/types.ts` |
| Modules registry | `content/packs/modules.ts` |
| Registry + review resolve | `content/packs/index.ts` |
| Drill mix helper | `lib/learnDrill.ts` |
| Module / unit / lesson / session | `app/quant/learn/*`, `app/quant/session.tsx` |
