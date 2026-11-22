# Quant Learn content-pack schema (v1)

Versioned, data-driven packs drive **Learn** units. Authors add a pack module under `content/packs/`, register it in `index.ts`, and the existing Learn screens + Quant session shell pick it up — **no new routes per unit**.

Schema version constant: `CONTENT_PACK_SCHEMA_VERSION` in `types.ts` (currently **1**). Bump when the pack shape breaks.

## Pack shape

```ts
type ContentPack = {
  meta: {
    id: string;                 // stable slug, e.g. "u1-dice"
    version: number;            // content revision (independent of schema)
    schemaVersion: 1;
    title: string;
    order: number;              // display order (1-based)
    blurb: string;              // one-line unit list subtitle
  };
  lesson: {
    intro: string;              // 1–2 sentences
    definitions: { term: string; body: string }[];  // 2–4 light formal defs
    examples: {                 // 2–3 worked examples
      title: string;
      prompt: string;
      steps: string[];
      answer: string;
    }[];
  };
  drill: {
    n: number;                  // fixed question count
    newShare: number;           // 0–1; review share = 1 - newShare
    newTopicTags: GeneratorId[];    // this unit's generator ids
    reviewTopicTags: GeneratorId[]; // prior units' generator ids (may be [])
  };
};
```

`GeneratorId` matches shipped Quant Practice skills: `"dice" | "urns" | "ev"`. Those map 1:1 to `lib/generators/quant/*`.

## Mix rule

For a pack with drill `{ n, newShare, newTopicTags, reviewTopicTags }`:

1. `newCount = round(n × newShare)`, `reviewCount = n − newCount`.
2. Fill `newCount` slots by cycling / picking from `newTopicTags`.
3. Fill `reviewCount` slots uniformly from `reviewTopicTags` (empty → no review).
4. Fisher–Yates shuffle the full list so review is interleaved.

v1 packs:

| Pack | N | newShare | New | Review pool |
|------|--:|---------:|-----|-------------|
| U1 Dice | 10 | 1.0 | dice | — |
| U2 Urns | 12 | 0.75 | urns | dice |
| U3 EV | 12 | 0.70 | ev | dice + urns |

## Authoring a new pack

1. Copy an existing `uN-*.ts` module; set unique `meta.id` and `meta.order`.
2. Write MathA-authored lesson copy (no Jane Street puzzle / PDF exercise wording).
3. Point `drill.newTopicTags` / `reviewTopicTags` at existing generator ids (or add a generator first).
4. Export the pack from `content/packs/index.ts` (`LEARN_PACKS` sorted by `order`).

## Unlock (v1 product choice)

All Learn units are **open** from day one. Completing a drill is optional; there is no sequential lock. (Replay regenerates questions.)

## Runtime paths

| Concern | Location |
|---------|----------|
| Types | `content/packs/types.ts` |
| Registry | `content/packs/index.ts` |
| Drill mix helper | `lib/learnDrill.ts` |
| Unit list | `app/quant/learn/index.tsx` |
| Lesson | `app/quant/learn/[packId].tsx` |
| Practice shell | `app/quant/session.tsx` (`pack` query param) |
