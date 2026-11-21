# MathA

Mental math practice for iOS (and Android) via Expo. No Mac or Xcode required — preview on your phone with Expo Go.

## Prerequisites

- Node.js 20+ recommended
- [Expo Go](https://expo.dev/go) on your iPhone (App Store) or Android device

## Run locally

```bash
npm install
npx expo start
```

This opens the Expo dev tools in the terminal (and usually a browser tab). Then:

1. Open **Expo Go** on your phone.
2. Scan the QR code from the terminal (iOS Camera app or Expo Go’s scanner).
3. The app loads over your local network — phone and computer must be on the same Wi‑Fi.

### Useful flags

```bash
npx expo start --tunnel   # if LAN/QR doesn’t connect
npx expo start --web      # quick browser preview (optional)
```

## What’s in this MVP

- **Home** — start a timed drill
- **Drill** — 60-second session with addition, subtraction, and multiplication; on-screen number pad
- **Results** — correct count, attempts, and accuracy

Design is intentionally minimal so product direction can come later.

## Project layout

- `app/` — Expo Router screens (`index`, `drill`, `results`)
- `components/NumberPad.tsx` — answer input
- `lib/math.ts` — question generation and session length
