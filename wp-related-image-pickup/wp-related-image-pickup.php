<?php
/**
 * Plugin Name:       WP Related Image Pickup
 * Plugin URI:        https://www.elite-airservices.com/
 * Description:        Select a sentence in the Classic (TinyMCE) editor and instantly find related images from your Media Library — and optional stock providers — with rich filtering by orientation, resolution, size, type, color and more. Insert straight into the post.
 * Version:           1.9.0
 * Requires at least: 5.0
 * Requires PHP:      7.2
 * Author:            Amir Cohen
 * Author URI:        https://www.elite-airservices.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-related-image-pickup
 * Domain Path:       /languages
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

define( 'RIP_VERSION', '1.9.0' );
define( 'RIP_PLUGIN_FILE', __FILE__ );
define( 'RIP_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'RIP_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'RIP_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

// Autoload-ish manual includes (kept simple, no Composer dependency).
require_once RIP_PLUGIN_DIR . 'includes/class-rip-keywords.php';
require_once RIP_PLUGIN_DIR . 'includes/class-rip-search.php';
require_once RIP_PLUGIN_DIR . 'includes/class-rip-sitemap.php';
require_once RIP_PLUGIN_DIR . 'includes/providers/interface-rip-provider.php';
require_once RIP_PLUGIN_DIR . 'includes/providers/class-rip-provider-unsplash.php';
require_once RIP_PLUGIN_DIR . 'includes/providers/class-rip-provider-pexels.php';
require_once RIP_PLUGIN_DIR . 'includes/providers/class-rip-provider-pixabay.php';
require_once RIP_PLUGIN_DIR . 'includes/class-rip-providers.php';
require_once RIP_PLUGIN_DIR . 'includes/class-rip-rest.php';
require_once RIP_PLUGIN_DIR . 'includes/class-rip-editor.php';
require_once RIP_PLUGIN_DIR . 'includes/class-rip-admin.php';
require_once RIP_PLUGIN_DIR . 'includes/class-rip-plugin.php';

/**
 * Boot the plugin once all plugins are loaded.
 */
function rip_bootstrap() {
	return RIP_Plugin::instance();
}
add_action( 'plugins_loaded', 'rip_bootstrap' );

/**
 * Activation: store default options if not present.
 */
function rip_activate() {
	$defaults = array(
		'enable_media_library' => 1,
		'enable_stock'         => 0,
		'unsplash_key'         => '',
		'pexels_key'           => '',
		'pixabay_key'          => '',
		'results_per_page'     => 24,
		'default_insert_size'  => 'large',
	);

	$existing = get_option( 'rip_settings', array() );
	update_option( 'rip_settings', wp_parse_args( $existing, $defaults ) );
}
register_activation_hook( __FILE__, 'rip_activate' );
