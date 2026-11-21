# MathA

Timed mental-math drills for iOS (and Android) via **Expo Go**. No Mac or Xcode required. Scores stay on device.

## Modes

| Mode | What you practice |
|------|-------------------|
| **Arithmetic** | Integers with + − × ÷ (exact division) |
| **Arithmetic Pro** | Parentheses / order of operations |
| **Sequence** | Next term in a 5-number pattern |

Durations for every mode: **1 / 2 / 3 / 4 / 5 minutes**.

Score = **raw correct count**. As soon as the typed answer matches, score increments and the next question appears (OpenQuant-style). Wrong digits stay until corrected — no Submit or skip button.

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

- **Home** — pick mode + duration, start a drill, or open the dashboard
- **Drill** — timed session with a mode-appropriate integer keypad (includes −); auto-advances on correct answer; **Reset** restarts the run without saving a score
- **Results** — shows raw correct count; session is saved locally
- **Dashboard** — mode picker + All / Year / Month / Week / Day filters (default **Month**); every score plotted spaced by calendar day

## Local data

Sessions are stored with AsyncStorage on the device. Clearing Expo Go’s app data clears scores. No accounts or cloud sync in v1.

## Develop

```bash
npx tsc --noEmit   # typecheck
npx expo start     # Metro bundler
```

Product direction: Kevin Corbett. Question generators are original reimplementations inspired by public OpenQuant game behavior — not a copy of their source or question bank.
