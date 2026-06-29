<?php
/**
 * Plugin Name:       Schlage Master Key Designer
 * Plugin URI:        https://github.com/amircoh44/amir
 * Description:        Design a Schlage-spec master key system (TMK, optional Grand Master, change keys) with two-step progression, MACS validation, interchange detection, and a downloadable PDF cut-sheet set. Use the [schlage_master_key] shortcode in any page, post, or Elementor "Shortcode" widget.
 * Version:           1.0.0
 * Requires at least: 5.0
 * Requires PHP:      7.0
 * Author:            amir
 * License:           MIT
 * Text Domain:       schlage-master-key
 *
 * ---------------------------------------------------------------------------
 * Usage:
 *   1. Zip the `schlage-master-key/` folder and upload it under
 *      Plugins → Add New → Upload Plugin, then Activate.
 *   2. Drop the shortcode  [schlage_master_key]  into a page, a Gutenberg
 *      Shortcode block, or an Elementor "Shortcode" widget.
 *
 * Prefer pasting raw HTML into an Elementor "HTML" widget instead of installing
 * a plugin? Use the self-contained file `schlage-master-key.html` — it inlines
 * everything and needs no plugin.
 * ---------------------------------------------------------------------------
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

define( 'SMK_VERSION', '1.0.0' );
define( 'SMK_URL', plugin_dir_url( __FILE__ ) );

/**
 * Register front-end assets. They are only enqueued on pages that actually use
 * the shortcode (see smk_render_shortcode), keeping other pages lean.
 */
function smk_register_assets() {
	// jsPDF + autotable from CDN (client-side PDF generation).
	wp_register_script(
		'smk-jspdf',
		'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
		array(),
		'2.5.1',
		true
	);
	wp_register_script(
		'smk-jspdf-autotable',
		'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
		array( 'smk-jspdf' ),
		'3.8.2',
		true
	);

	wp_register_style(
		'smk-app',
		SMK_URL . 'app/schlage-master-key.css',
		array(),
		SMK_VERSION
	);
	wp_register_script(
		'smk-app',
		SMK_URL . 'app/schlage-master-key.js',
		array( 'smk-jspdf', 'smk-jspdf-autotable' ),
		SMK_VERSION,
		true
	);
}
add_action( 'init', 'smk_register_assets' );

/**
 * [schlage_master_key] shortcode.
 *
 * Outputs the mount point and enqueues assets on demand. The whole app renders
 * itself into #smk-app, so the markup here is intentionally minimal.
 *
 * @return string
 */
function smk_render_shortcode() {
	wp_enqueue_style( 'smk-app' );
	wp_enqueue_script( 'smk-jspdf' );
	wp_enqueue_script( 'smk-jspdf-autotable' );
	wp_enqueue_script( 'smk-app' );

	return '<div id="smk-app"></div>';
}
add_shortcode( 'schlage_master_key', 'smk_render_shortcode' );
