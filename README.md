# MathA

Timed mental-math drills for iOS (and Android) via **Expo Go**. No Mac or Xcode required. Scores stay on device.

## Modes (timed mental math)

| Mode | What you practice |
|------|-------------------|
| **Arithmetic** | Integers with + − × ÷ (exact division) |
| **Arithmetic Pro** | Parentheses / order of operations |
| **Sequence** | Next term in a 5-number pattern |

Durations for every mode: **30 seconds / 1 / 2 / 3 / 4 / 5 minutes**.

Score = **raw correct count**. As soon as the typed answer matches, score increments and the next question appears (OpenQuant-style). Wrong digits stay until corrected — no Submit or skip button.

## Quant (probability)

Separate Home entry — not mixed with timed drills or mental-math Practice.

**Learn** — data-driven content packs (`content/packs/`): lesson (intro, defs, worked examples) → mixed drill with spaced review. v1 units: Counting & dice (10 @ 100%), Urns & conditional (12 @ ~75/25), Expected value (12 @ ~70/30). Packs declare `links` (before/after/prerequisites) and schema includes named SR policies (`none`/`light`/`standard`/`heavy`; runtime = standard). All units open. Schema: `content/packs/SCHEMA.md`.

**Practice** — pure skill reps (100% that generator):

| Skill | What you practice | Fixed N |
|-------|-------------------|--------:|
| **Dice & counting** | Two fair dice; P(sum = k) | 12 |
| **Urns & conditional** | Without-replacement / conditional draws | 12 |
| **Expected value** | Fair-die mean, linearity / indicators | 10 |

Untimed. Enter a number or fraction (`11/13`, reduced equivalents, or matching decimals), tap **Submit** — advances whether right or wrong. End **Review** lists each prompt, your answer, and right/wrong (correct answer on misses). No timer, no 3-2-1, no dashboard Elo writes.

Optional **Scratch** opens a finger-draw pad (question on top; up to **5 pages** with tabs; **Clear** = current page, **Clear all** = wipe all; **Done** collapses). Uses `react-native-signature-canvas` in Expo Go.

Generators are MathA-authored procedural templates (schemas inspired by public MIT Unbluffable quant families; no Jane Street puzzle text).

## Prerequisites

- Node.js 20+ (LTS recommended)
- Phone with [Expo Go](https://expo.dev/go) (iOS App Store or Google Play)
- Same Wi‑Fi as your computer, or use tunnel mode

## Persistent preview (Expo Go + web)

No local Metro needed for review. Project: [expo.dev/@kc432/matha](https://expo.dev/accounts/kc432/projects/matha).

| Surface | Stable URL |
|---------|------------|
| **Expo Go** (phone) | `exp://u.expo.dev/545e69a7-5bad-4e33-a3c0-a8fd883ed1a7?runtime-version=exposdk%3A58.0.0&channel-name=preview` |
| **QR** (same channel) | [qr.expo.dev … channel=preview](https://qr.expo.dev/eas-update?projectId=545e69a7-5bad-4e33-a3c0-a8fd883ed1a7&runtimeVersion=exposdk:58.0.0&channel=preview) |
| **Web** | [https://matha.expo.app](https://matha.expo.app) |

Open the `exp://` link or QR in **Expo Go** (SDK 58). Or open the [latest update](https://expo.dev/accounts/kc432/projects/matha/updates) on the Expo dashboard → **Preview**.

### Republish after merges to `main`

```bash
git checkout main && git pull
npm install   # if lockfile changed
npm run update:preview    # Expo Go channel
npm run deploy:web        # https://matha.expo.app
```

Requires `EXPO_TOKEN` (or `eas login`). `update:preview` publishes JS/assets to the `preview` channel; the Expo Go URL above stays the same and always loads the latest update on that channel.

## Run with Expo Go (local / tunnel)

```bash
git clone https://github.com/kcorbett43/MathA.git
cd MathA
npm install
npx expo start
```

Then:

1. Open **Expo Go** on your phone.
2. Scan the QR code from the terminal (Camera app on iOS, or Expo Go’s scanner on Android).
3. If the device can’t reach the bundler, restart with a tunnel:

```bash
npx expo start --tunnel
```

Optional local web preview (layout differs from phone):

```bash
npx expo start --web
```

## App map

- **Home** — pick mode + duration, start a drill, open **Quant**, or open the dashboard
- **Drill** — timed session with a mode-appropriate integer keypad (includes −); auto-advances on correct answer; **Reset** restarts without saving; **Home** abandons without saving
- **Results** — shows raw correct count; session is saved locally
- **Dashboard** — mode picker + All / Year / Month / Week / Day filters (default **Month**); every score plotted spaced by calendar day
- **Quant** — Learn (units → lesson → mixed drill) or Practice (skills) → fixed-N session (fraction keypad + Submit) → review (session-local only)

## Local data

Sessions are stored with AsyncStorage on the device. Clearing Expo Go’s app data clears scores. No accounts or cloud sync in v1.

## Develop

```bash
npx tsc --noEmit   # typecheck
npx expo start     # Metro bundler
```

Product direction: Kevin Corbett. Question generators are original reimplementations inspired by public OpenQuant game behavior — not a copy of their source or question bank.

### Competition practice

Home → **Competition** offers three independent Group D practice events, separate
from Drill. Each uses the shared 30 sec / 1 / 2 / 3 / 4 / 5 min duration selector
(default: 3 min), countdown, immediate answer checking, and Reset/Home controls.

| Event | Points per correct answer | Progression |
| --- | --- | --- |
| Multiplication | 5 | One-digit factors through three-digit × three-digit |
| Division | 5 | Exact integer quotients, progressing to three-digit quotient and divisor |
| Addition & Subtraction | 10 | Signed vertical sums, progressing to ten operands with two decimal places |

The generators infer operand digit widths and signs from the 60-question
[USMMF Group D sample sheets](https://www.usmentalmath.org/events/competitions/).
They generate fresh operands, rather than replaying the sample questions. After
question 60 the last question's difficulty repeats indefinitely. This is practice
based on the published samples, not an official MM Go implementation.

Correct answers advance automatically. Mistakes can be edited with backspace;
there is no skip or combined event. Decimal answers accept equivalent forms
(e.g. `12.3` for `12.30`). Reset discards the current session and restarts at
question 1; Home abandons without saving. Completed sessions save points and
correct counts, with dashboard histories filtered by event and duration. Existing
Drill scores keep their original correct-count scoring.

Run `npm run test:competition` for generator, progression, scoring, decimal, and
duration checks. In runtimes that block tsx's IPC socket, run
`node --import tsx scripts/test-competition.ts` instead.
