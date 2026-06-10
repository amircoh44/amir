# The Super Siddur — app (Expo)

One codebase → **iOS, Android, and Web**, built with Expo (SDK 56), expo-router,
React Native + React Native Web, and TypeScript. This replaces the old vanilla-JS
PWA. The siddur is **offline-first**: the Hebrew calendar, real astronomical
zmanim, the halachic clock, gematria, and the Kotel bearing are all computed
on-device with no network.

## Run it

```bash
cd super-siddur/client
npm install
npx expo start          # press w for web, i for iOS sim, a for Android
# or target one platform:
npm run web
npm run ios
npm run android
```

To produce a static web build: `npx expo export --platform web` (output in `dist/`).

## Layout

```
src/
  core/            platform-agnostic logic (no UI) — shared by every platform & unit-testable
    engine.ts        Hebrew calendar, astronomical zmanim, gematria, city DB
    halachic.ts      sha'ah / da'kah zmanit math for the halachic clock
    geo.ts           great-circle bearing & distance to the Kotel
  store/
    settings.tsx     location / time-format / nusach (persisted, offline)
    storage.ts       cross-platform key-value persistence
  constants/theme.ts warm parchment & gold design tokens (light/dark)
  hooks/use-theme.ts active palette + tokens
  ui/primitives.tsx  Screen / Card / Txt building blocks
  components/
    zmanim-clock.tsx the analog halachic clock (no SVG dep — pure Views)
  app/             expo-router file-based routes
    _layout.tsx              providers + root stack
    (tabs)/_layout.tsx       bottom tabs: Today · Prayers · Tehillim · Zmanim · Compass
    (tabs)/index.tsx         Today — Hebrew date (sunset rollover), next zman, omer
    (tabs)/zmanim.tsx        full zmanim table + halachic clock + city picker
    (tabs)/prayers.tsx       service list
    (tabs)/tehillim.tsx      Psalms 1–150 grid
    (tabs)/compass.tsx       bearing to the Kotel
    prayer/[id].tsx          prayer/chapter detail (text wiring next)
```

## Status

**Working now:** navigation, theme (light/dark), Hebrew date with sunset rollover,
the full zmanim table, the halachic (sha'ah/da'kah zmanit) clock with live local +
halachic time, city picker, omer counter, and the Kotel compass — all offline.
Verified: `tsc --noEmit` clean and `expo export --platform web` bundles all routes.

**Next:** wire the full prayer/Tehillim **text** into `prayer/[id]` (Hebrew +
transliteration + English, nusach variants, day-sensitive insertions, "Daven With
Me" guided mode), live device-heading on the compass (magnetometer), settings
screen, hidden admin, and the marketplace client against the FastAPI backend.

## Backend

The app talks to the existing FastAPI backend (`super-siddur/backend`). Nothing
network-dependent is required for the core davening experience.
