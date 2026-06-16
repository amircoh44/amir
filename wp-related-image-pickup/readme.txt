=== WP Related Image Pickup ===
Contributors: amircohen
Tags: images, media library, tinymce, classic editor, stock photos, unsplash, pexels, pixabay
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.2
Stable tag: 1.6.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Select a sentence in the Classic editor and instantly find related images from your Media Library and stock providers, with rich filtering, then insert.

== Description ==

WP Related Image Pickup speeds up illustrating articles. Highlight a sentence in the Classic (TinyMCE) editor, click the toolbar button, and the plugin pulls keywords from your selection and finds matching images you can insert straight into the post.

Developed by Amir Cohen (https://www.elite-airservices.com/).

Features:

* Keyword extraction from the selected sentence (stop-words removed).
* Relevance scoring across alt text, title, caption, filename and description.
* Filter by orientation (horizontal / vertical / square), minimum resolution, maximum file size, file type and usage.
* Sort by relevance, date, resolution, file size, usage (least/most used) or title.
* See how often each image is already used; filter to fresh, never-used images.
* Search your Media Library and/or free stock providers (Unsplash, Pexels, Pixabay).
* Stock images are imported into your Media Library on insert.
* Multi-select, choose insert size, alignment, position (cursor / after / before paragraph), caption and optional link — remembered between sessions.
* Edit title, alt, caption and description per image before inserting.
* Auto-place a chosen number of related images at well-spaced, professional spots.
* Icons mode: handle "icon" images separately — float left/right at a chosen px size, spread by name, never captioned.
* Links mode: pull your sitemap (Yoast / Rank Math / core) and add internal links to matching words.
* Auto-filled alt text for SEO and accessibility.

== Installation ==

1. Upload the `wp-related-image-pickup` folder to `/wp-content/plugins/`.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Optional: visit Settings > Related Image Pickup to enable stock providers and add free API keys.
4. Edit a post with the Classic editor, select a sentence, and click the Related Image Pickup button.

== Frequently Asked Questions ==

= Does it work with the Block editor (Gutenberg)? =

It targets the Classic editor (TinyMCE). Use the Classic block within Gutenberg, or the Classic Editor plugin. Native block support is on the roadmap.

= Do I need API keys? =

Only if you enable stock providers. Searching your own Media Library needs no keys.

= Where do stock images go? =

When you insert a stock image it is downloaded into your Media Library first, then inserted, so it is hosted on your own site.

== Changelog ==

= 1.6.1 =
* Auto-place now prefers never-used images (then least-used) and varies the pick among the most relevant ones, so it stops reusing the same images. New "Prefer fresh" toggle (on by default, remembered).

= 1.6.0 =
* Links mode is now a readable, full-width list (no more cramped grid).
* Colour-coded link targets by kind — homepage, author, tag, category, product, page, post and other — each fully recolourable from a legend, so seeding links is easy to scan.
* Reaffirmed: never links to the page being edited or the home page.

= 1.5.0 =
* Blocked link targets now accept wildcard globs (e.g. star-slash-tag-slash-star) and bare path fragments (e.g. /author/, /category/), so you can block whole tag, author or category sections — not just exact URLs.

= 1.4.0 =
* Links mode: "Re-scan" button to re-read the sitemap (bypasses the hourly cache).
* Auto internal-link spread now scores against the whole article, so "Add all relevant" links the topics actually covered.
* Never links to the page you are editing (no self-links) or the home page.
* Block list: stop specific pages from ever being suggested/linked — block inline from the Links list, or manage them in Settings.

= 1.3.0 =
* Icons mode: images whose filename contains "icon" are kept out of normal image results and auto-place. Place icons by side (left/right) and pixel size; "Spread by name" drops each icon next to text matching its name. Icons are never captioned (existing icon captions are stripped).
* Links mode: auto-discovers your sitemap (Yoast, Rank Math or WordPress core), lists posts/pages/products, and adds internal links into matching words — apply all relevant or pick your own.

= 1.2.0 =
* Auto-place: choose how many images to scatter (1–20) via a number box next to the button.
* Asset version bump so updated scripts/styles refresh (no stale cache).

= 1.1.0 =
* Insert position: at cursor, after the paragraph, or before it (never mid-sentence).
* Remembers your alignment, size, link, sort and position choices.
* Edit title, alt text, caption and description per image before inserting (saved to the attachment).
* Usage tracking: see how many posts already use each image, filter to never-used images, and sort by least/most used.
* Auto-place: scatter a chosen number (1–20) of related images at well-spaced spots, kept clear of other images.

= 1.0.0 =
* Initial release.
