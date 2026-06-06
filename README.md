# React + TypeScript + Vite

This app has two views, switched from the header nav:

1. **Audio Reactive Image Visualizer** — the original app.
2. **Siddur Text** — a report of Jewish prayer-book (סידור) text, organized by
   *nusach* (rite), showing **Hebrew text only**.

## Siddur Text report

Hebrew text is sourced from [Sefaria](https://www.sefaria.org)'s public corpus.
Four nuschaot are included:

| Nusach | Source text |
| --- | --- |
| Ashkenaz (אשכנז) | Siddur Ashkenaz |
| Sefard (ספרד) | Siddur Sefard |
| Edot HaMizrach / North African (עדות המזרח) | Siddur Edot HaMizrach |
| Chabad / Ari (חב"ד) | Weekday Siddur Chabad |

> Sefaria has no complete standalone Yemenite (Teiman) siddur; Edot HaMizrach is
> the closest Mizrahi / North-African rite available.

### Included vs. excluded content

The text is filtered to a **weekday + blessings + minor-occasion** scope
(`FILTERS` in `scripts/download-siddur.mjs`):

- **Included:** weekday Shacharit/Mincha/Maariv, all blessings (food, wedding,
  priestly, lifecycle), Rosh Chodesh (new month) + Birkat HaLevana, the month of
  Nissan incl. **Birkat HaIlanot** (tree blessing), **Chanukah**, **Purim**, and
  Chol HaMoed / Tu BiShvat additions (which appear inline in the weekday
  services).
- **Excluded:** Shabbat services, and the full festival / Yom Tov services
  (Shalosh Regalim, Pesach Haggadah, Sukkot/Lulav, Shavuot, Simchat Torah,
  Dew/Rain, festival piyutim), plus fast days and festival-prep orders.

Notes: Sefaria's **Ashkenaz** siddur has no wedding blessings. **Tu BiShvat** and
**Chol HaMoed** have no standalone order in Sefaria — they appear only as inline
additions inside the kept weekday prayers.

### Features

- **Search widget** at the top — filter the table of contents by section title,
  or search the full prayer text (matches are highlighted).
- **Missing-text tab** — lists any section that has a heading but no Hebrew text
  in the source; such sections are also flagged with ⚠ in the directory.
- **Download** the Hebrew-only plain-text file for the selected nusach.

### Refreshing the data

The text data lives under `public/siddur/` — one directory per nusach, each with
a structured `<key>.json` (used by the app) and a flat Hebrew `<key>.txt` (the
"download" file). To re-download from Sefaria:

```bash
npm run download:siddur
```

The downloader (`scripts/download-siddur.mjs`) fetches the **Hebrew** `merged.json`
for each nusach from Sefaria's public Google Cloud Storage export, strips HTML
markup (keeping the Hebrew letters and nikkud), and writes the directory tree.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
