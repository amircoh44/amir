=== WP Related Image Pickup ===
Contributors: amircohen
Tags: images, media library, tinymce, classic editor, stock photos, unsplash, pexels, pixabay
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.2
Stable tag: 1.1.0
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

= 1.1.0 =
* Insert position: at cursor, after the paragraph, or before it (never mid-sentence).
* Remembers your alignment, size, link, sort and position choices.
* Edit title, alt text, caption and description per image before inserting (saved to the attachment).
* Usage tracking: see how many posts already use each image, filter to never-used images, and sort by least/most used.
* Auto-place: scatter a chosen number (1–10) of related images at well-spaced spots, kept clear of other images.

= 1.0.0 =
* Initial release.
