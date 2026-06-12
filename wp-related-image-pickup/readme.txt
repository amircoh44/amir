=== WP Related Image Pickup ===
Contributors: amircohen
Tags: images, media library, tinymce, classic editor, stock photos, unsplash, pexels, pixabay
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.2
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Select a sentence in the Classic editor and instantly find related images from your Media Library and stock providers, with rich filtering, then insert.

== Description ==

WP Related Image Pickup speeds up illustrating articles. Highlight a sentence in the Classic (TinyMCE) editor, click the toolbar button, and the plugin pulls keywords from your selection and finds matching images you can insert straight into the post.

Developed by Amir Cohen (https://www.elite-airservices.com/).

Features:

* Keyword extraction from the selected sentence (stop-words removed).
* Relevance scoring across alt text, title, caption, filename and description.
* Filter by orientation (horizontal / vertical / square), minimum resolution, maximum file size and file type.
* Sort by relevance, date, resolution, file size or title.
* Search your Media Library and/or free stock providers (Unsplash, Pexels, Pixabay).
* Stock images are imported into your Media Library on insert.
* Multi-select, choose insert size, alignment, caption and optional link.
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

= 1.0.0 =
* Initial release.
