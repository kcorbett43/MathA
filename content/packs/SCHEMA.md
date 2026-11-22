# Quant Learn content-pack schema (v2)

Versioned, data-driven packs drive **Learn** units. Authors add a pack module under `content/packs/`, register it in `index.ts`, and the existing Learn screens + Quant session shell pick it up — **no new routes per unit**.

Schema version constant: `CONTENT_PACK_SCHEMA_VERSION` in `types.ts` (currently **2**). Bump when the pack shape breaks.

**v2 adds:** curriculum **links** (`before` / `after` / `prerequisites`) and named **spaced-repetition policies** (`none` | `light` | `standard` | `heavy`). Runtime still applies the **standard / current** mix only (`RUNTIME_SPACED_REP_POLICY`).

## Pack shape

```ts
type ContentPack = {
  meta: {
    id: string;                 // stable slug, e.g. "u1-dice"
    version: number;            // content revision (independent of schema)
    schemaVersion: 2;
    title: string;
    order: number;              // display order (1-based)
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
      steps: string[];
      answer: string;
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

## Unit links (graph)

| Field | Meaning |
|-------|---------|
| `before` | Immediate predecessors on the Learn path |
| `after` | Immediate successors |
| `prerequisites` | Units that gate unlock later; also the default set whose `newTopicTags` feed the review pool when `reviewTopicTags` is omitted |

Imported / third-party packs should set these so MathA can order units and build spaced-repetition pools without hard-coding `meta.order`.

v1 shipped packs (path):

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

1. Copy an existing `uN-*.ts`; set unique `meta.id`, `meta.order`, and `meta.links` (`before` / `after` / `prerequisites`).
2. Write MathA-authored lesson copy.
3. Set `drill.newTopicTags` and either explicit `reviewTopicTags` or rely on prerequisites.
4. Set `drill.newShare` for the standard/current mix.
5. Export from `content/packs/index.ts`.

## Runtime paths

| Concern | Location |
|---------|----------|
| Types + policies | `content/packs/types.ts` |
| Registry + review resolve | `content/packs/index.ts` |
| Drill mix helper | `lib/learnDrill.ts` |
| Unit list / lesson / session | `app/quant/learn/*`, `app/quant/session.tsx` |
