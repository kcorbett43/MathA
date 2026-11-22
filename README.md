# MathA

Timed mental-math drills for iOS (and Android) via **Expo Go**. No Mac or Xcode required. Scores stay on device.

## Modes (timed mental math)

| Mode | What you practice |
|------|-------------------|
| **Arithmetic** | Integers with + − × ÷ (exact division) |
| **Arithmetic Pro** | Parentheses / order of operations |
| **Sequence** | Next term in a 5-number pattern |

Durations for every mode: **1 / 2 / 3 / 4 / 5 minutes**.

Score = **raw correct count**. As soon as the typed answer matches, score increments and the next question appears (OpenQuant-style). Wrong digits stay until corrected — no Submit or skip button.

## Quant (probability)

Separate Home entry — not mixed with timed drills or mental-math Practice.

| Skill | What you practice | Fixed N |
|-------|-------------------|--------:|
| **Dice & counting** | Two fair dice; P(sum = k) | 12 |
| **Urns & conditional** | Without-replacement / conditional draws | 12 |
| **Expected value** | Fair-die mean, linearity / indicators | 10 |

Untimed. Enter a number or fraction (`11/13`, reduced equivalents, or matching decimals), tap **Submit** — advances whether right or wrong. End **Review** lists each prompt, your answer, and right/wrong (correct answer on misses). No timer, no 3-2-1, no dashboard Elo writes.

Generators are MathA-authored procedural templates (schemas inspired by public MIT Unbluffable quant families; no Jane Street puzzle text).

## Prerequisites

- Node.js 20+ (LTS recommended)
- Phone with [Expo Go](https://expo.dev/go) (iOS App Store or Google Play)
- Same Wi‑Fi as your computer, or use tunnel mode

## Run with Expo Go

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

Optional web preview (layout differs from phone):

```bash
npx expo start --web
```

## App map

- **Home** — pick mode + duration, start a drill, open **Quant**, or open the dashboard
- **Drill** — timed session with a mode-appropriate integer keypad (includes −); auto-advances on correct answer; **Reset** restarts without saving; **Home** abandons without saving
- **Results** — shows raw correct count; session is saved locally
- **Dashboard** — mode picker + All / Year / Month / Week / Day filters (default **Month**); every score plotted spaced by calendar day
- **Quant** — skill list → fixed-N session (fraction keypad + Submit) → review (session-local only)

## Local data

Sessions are stored with AsyncStorage on the device. Clearing Expo Go’s app data clears scores. No accounts or cloud sync in v1.

## Develop

```bash
npx tsc --noEmit   # typecheck
npx expo start     # Metro bundler
```

Product direction: Kevin Corbett. Question generators are original reimplementations inspired by public OpenQuant game behavior — not a copy of their source or question bank.
