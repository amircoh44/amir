# WP Related Image Pickup

> Select a sentence in the WordPress **Classic (TinyMCE) editor**, and instantly find related images — from your **Media Library** and optional **stock providers** — with rich filtering, then insert them straight into the post.

**Developed by [Amir Cohen](https://www.elite-airservices.com/).**

---

## What it does

While writing an article in the Classic / "What You See Is What You Get" editor:

1. **Highlight a sentence** (or any text).
2. Click the **Related Image Pickup** toolbar button (image-with-magnifier icon) — or press <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd>, or use the right‑click *Insert* menu.
3. The plugin extracts **keywords** from your selection (stop‑words removed) and immediately searches for matching images.
4. **Filter, sort, pick** one or more images and **insert** them at the cursor — with your chosen size, alignment, caption and optional link.

Keywords appear in an editable box, so you can refine the search by hand at any time.

## Features

### Search & relevance
- Keyword extraction from the selected sentence (unicode‑aware, stop‑word filtered).
- Relevance scoring across **alt text, title, caption, filename and description** (weighted, whole‑word > partial, multi‑keyword coverage bonus).
- Editable keyword box for manual refinement.

### Filtering
- **Orientation:** horizontal (landscape) / vertical (portrait) / square / any.
- **Minimum resolution:** 640 / 1280 / 1920 (HD) / 3840 (4K).
- **Maximum file size:** 100 KB / 500 KB / 1 MB / 5 MB / any.
- **File type:** JPG / PNG / WebP / GIF / SVG (Media Library tab).
- **Usage:** Any / **Never used** / Already used — find fresh images, skip overused ones.
- **Date range** (via REST API).

### Sorting
Relevance · Newest · Oldest · Highest resolution · Largest file · Smallest file · **Least used** · **Most used** · Title (A–Z).

### Usage tracking
Each Media Library card shows how many posts already use it (**“Never used”** vs **“Used 3×”**), counting both featured-image assignments and in-content `wp-image-{id}` references as distinct posts.

### Remembered preferences
Your **alignment, size, link, position, sort and orientation** choices are stored in the browser and restored next time.

### Edit before insert
Edit **title, alt text, caption and description** per selected image; changes are saved back onto the attachment (and applied at import time for stock images).

### Auto-place
Choose **how many images to scatter** (1–20, remembered) and one click drops them at well-spaced block boundaries — **after a paragraph or before a heading**, never mid-sentence, and kept clear of existing images. Keywords are taken from the surrounding text at each spot.

### Icons mode
Any image whose **filename contains “icon”** is treated as an icon: it’s **excluded** from normal image search and auto-place (icons never get scattered as main images). In **Icons** mode you:
- choose a **side** (left / right) and **pixel size** (e.g. 50×50, remembered);
- **insert** selected icons, or **Spread by name** — each icon is dropped next to text that matches its name (e.g. a `contact-us-icon` lands beside “contact us”);
- icons are **never captioned**, and the spread pass strips captions off any icon images already in the article.

### Links mode (sitemap internal linking)
Auto-discovers your **sitemap** — works with **Yoast, Rank Math, or WordPress core** (via `robots.txt`, `sitemap_index.xml`, `wp-sitemap.xml`), walking sitemap indexes down to the URLs and resolving them to **posts / pages / products** for their titles. Then:
- review the candidate list (relevance is scored against the **whole article**, so on-topic targets are flagged **relevant**);
- **Add all relevant** auto-spreads matching links, or tick targets and **Add selected**;
- each target links the **first matching, unlinked occurrence** of its title in your article (longest titles win, word-boundary safe);
- **Re-scan** re-reads the sitemap on demand (bypasses the 1-hour cache).

**Never** links to the **page you're editing** (no self-links) or the **home page**.

**Block list:** stop pages from ever being suggested or linked — click the **block (⊘) button** on any candidate (blocks that exact URL), or manage patterns under **Settings → Related Image Pickup → Blocked link targets** (one per line). Each pattern can be:
- an **exact URL** — `https://example.com/page/`;
- a **wildcard glob** (`*` = any characters) — `*/tag/*`, `https://example.com/author/*`;
- a **bare path fragment** — `/author/`, `/category/`, `/tag/` — to block whole archive sections.

### Sources
- **Media Library** — searches images already on your site.
- **Stock providers** (optional) — **Unsplash, Pexels, Pixabay**. Chosen stock images are **auto‑imported** into the Media Library on insert (with title/alt/caption), so they live on your site like any upload.
- Both can be enabled together as separate tabs.

### Inserting
- **Multi‑select** to insert several images at once.
- Insert **size** (thumbnail/medium/large/full), **alignment** (none/left/center/right), **position** (at cursor / after the paragraph / before the paragraph), optional **caption**, and optional **link to full image**.
- Auto‑filled **alt text** from the matched metadata / selected sentence (good for SEO + accessibility).

## Installation

1. Copy the `wp-related-image-pickup` folder into `wp-content/plugins/` (or zip it and upload via **Plugins → Add New → Upload**).
2. Activate **WP Related Image Pickup**.
3. (Optional) Go to **Settings → Related Image Pickup** to enable stock providers and paste free API keys.
4. Open any post with the **Classic editor**, select a sentence, and click the toolbar button.

> **Note:** This targets the **Classic editor** (TinyMCE). For the Block editor, use the Classic block, or keep an eye on the roadmap below.

## Settings

**Settings → Related Image Pickup:**

| Setting | Description |
| --- | --- |
| Media Library | Enable searching the site's own images. |
| Stock providers | Enable Unsplash / Pexels / Pixabay search + import. |
| API keys | Free keys for each provider. |
| Results per page | 6–100. |
| Default insert size | thumbnail / medium / large / full. |

### Getting free API keys
- **Unsplash:** https://unsplash.com/developers
- **Pexels:** https://www.pexels.com/api/
- **Pixabay:** https://pixabay.com/api/docs/

## REST API

All routes require `edit_posts` (import requires `upload_files`) and a `wp_rest` nonce.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/wp-json/rip/v1/keywords` | Extract keywords from `text`. |
| GET | `/wp-json/rip/v1/search` | Search the Media Library (filters/sort). |
| GET | `/wp-json/rip/v1/stock` | Search configured stock providers. |
| POST | `/wp-json/rip/v1/import` | Sideload a stock image into the Media Library. |
| POST | `/wp-json/rip/v1/update-meta` | Persist edited title/alt/caption/description on an attachment. |
| GET | `/wp-json/rip/v1/links` | Internal-link candidates from the sitemap (excludes self/home/blocked). |
| POST | `/wp-json/rip/v1/block-link` | Block/unblock a page from link suggestions. |

## Architecture

```
wp-related-image-pickup/
├── wp-related-image-pickup.php      Main plugin file / bootstrap
├── uninstall.php                    Cleanup on uninstall
├── includes/
│   ├── class-rip-plugin.php         Orchestrator + settings accessor
│   ├── class-rip-keywords.php       Sentence → keywords
│   ├── class-rip-search.php         Media Library search + scoring + filters + icons
│   ├── class-rip-sitemap.php        Sitemap discovery + parsing (internal links)
│   ├── class-rip-rest.php           REST controller
│   ├── class-rip-editor.php         TinyMCE button + asset enqueue
│   ├── class-rip-admin.php          Settings page
│   ├── class-rip-providers.php      Provider registry + import-to-library
│   └── providers/
│       ├── interface-rip-provider.php
│       ├── class-rip-provider-unsplash.php
│       ├── class-rip-provider-pexels.php
│       └── class-rip-provider-pixabay.php
└── assets/
    ├── js/tinymce-plugin.js         Toolbar button
    ├── js/modal.js                  Picker UI + REST calls
    └── css/modal.css                Styles
```

## Security

- All endpoints check capabilities (`edit_posts` / `upload_files`) and the REST nonce.
- Input is sanitized; output is escaped.
- Stock imports use core `download_url()` + `media_handle_sideload()`.

## Roadmap ideas

- Dominant‑color filter and related‑keyword suggestions.
- Gutenberg (Block editor) format/toolbar integration.
- "Set as featured image" action.
- Per‑provider attribution insertion.
- Configurable auto‑place count and minimum spacing.

## License

GPL‑2.0‑or‑later.
