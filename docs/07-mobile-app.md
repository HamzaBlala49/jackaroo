# Jackaroo Mobile — Expo / React Native (Arabic, LAN, offline)

> A separate app from the web client, sharing the same pure game engine.
> Everything runs on-device. No accounts, no backend, no external server.

## What it delivers

- **Arabic-first UI (RTL)** — all screens, prompts, rules and results are in Arabic.
- **Wooden-on-red theme** — deep red felt table, warm wooden board and cards,
  gold accents, cream/ivory cells.
- **Four game modes**
  - **فردي (Solo)** — 1 human + 3 heuristic bots. Bots only pick actions the
    engine itself advertises, so they can never cheat.
  - **على نفس الجهاز (Pass & Play)** — 2–4 humans on one phone with a
    handover screen that hides the hand until the next player confirms.
  - **استضافة LAN (Host)** — this phone runs the authoritative engine plus a
    tiny TCP server (`react-native-tcp-socket`, port 4242). Shows its IP;
    friends join from their phones over the same Wi-Fi.
  - **انضمام LAN (Join)** — enter the host IP and play.
- **No external server** — the host phone is the server. If a player drops
  mid-match, a bot silently takes their seat.
- **Four board shapes** — دائري (circle), مربع (square), سداسي (hexagon),
  بيضاوي (oval). Same 72-cell topology and identical rules; only geometry changes.
- **Wooden sounds** — 8 generated WAV clips (~105 KB total): tap, card, move,
  enter, capture, home, win, deal. Played with `expo-audio`, plus haptics.
- **Juicy motion** — marbles spring to their destination with a squash-and-stretch
  bounce; cards lift when selected; confetti on victory; haptics on landings,
  captures and wins.
- **Small app size** — no bundled fonts (system Arabic fonts), no raster art
  (the icon is 75 KB and everything else is SVG), ~105 KB of audio.

## Running

```bash
# from the repo root
pnpm build:packages      # compile the shared @jackaroo/* packages once

cd apps/mobile
npx expo start           # Expo Go → solo + pass & play work immediately
```

### LAN mode (needs a development build)

`react-native-tcp-socket` is a native module, so LAN hosting/joining needs an
Expo development build rather than Expo Go:

```bash
cd apps/mobile
npx expo run:android     # or: npx expo run:ios
# or build with EAS:
# eas build --profile development --platform android
```

Solo and pass & play never touch the native module, so they run fine in Expo Go.

## Architecture

```text
apps/mobile/src/
  App.tsx                 screen router + settings bootstrap
  theme.ts                wood/red palette, spacing, RTL text styles
  i18n.ts                 every Arabic string in one file
  audio.ts                expo-audio sound kit (lazy players, ~105 KB)
  haptics.ts              expo-haptics wrappers
  state/settings.ts       AsyncStorage-backed settings
  game/
    useLocalGame.ts       solo + pass&play engine hook (bots, handover)
    bots.ts               heuristic bot that only uses engine-legal actions
  net/
    protocol.ts           newline-delimited JSON messages
    HostServer.ts         authoritative TCP host (engine + personalised snapshots)
    ClientConnection.ts   TCP client that mirrors snapshots
  components/
    Board.tsx             SVG board (shapes, marbles, highlights, previews)
    Card.tsx              wooden playing card (SVG front + wood-grain back)
    HandTray.tsx          bottom hand + prompt + action chips
    Hud.tsx               turn banner + player chips
    Confetti.tsx          built-in Animated win confetti
    RulesContent.tsx      Arabic rulebook
    UI.tsx                WoodButton, Panel, Screen, TouchableScale
  screens/
    HomeScreen.tsx        mode picker + settings
    SetupScreen.tsx       solo/pass setup
    HostScreen.tsx        LAN lobby (IP, players, bots) + host game view
    JoinScreen.tsx        LAN join + client game view
    LocalGameScreen.tsx   solo/pass game + results
    GameScreen.tsx        shared match UI (all modes)
    RulesScreen.tsx       full Arabic rules
```

### Why the same rules everywhere

The mobile app imports `@jackaroo/game-engine`, `@jackaroo/game-board`,
`@jackaroo/game-config` and `@jackaroo/game-types` directly from the monorepo —
the exact packages the web and API use. The 72-cell topology, card effects,
captures, safe cells and win conditions are therefore identical across web,
mobile and server, and covered by the same 80 engine tests.

### Personalised hands over LAN

The host never broadcasts the raw `GameState`. After every action it calls
`createGameSnapshot(state, { viewerId })` per connection, so each phone receives
only its own hand plus public information — the same privacy model as the
online server.
