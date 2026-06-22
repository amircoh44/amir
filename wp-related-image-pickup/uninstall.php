<?php
/**
 * Uninstall handler — removes plugin options.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/**
 * Remove all plugin data for the current site.
 */
function rip_uninstall_cleanup() {
	delete_option( 'rip_settings' );
	delete_option( 'rip_link_blocklist' );
	delete_option( 'rip_videos' );
	delete_option( 'rip_shortcodes' );
	delete_option( 'rip_yt_channel' );
	delete_transient( 'rip_sitemap_links' );
}

rip_uninstall_cleanup();

// Multisite: clean up per-site data too.
if ( is_multisite() ) {
	global $wpdb;
	$blog_ids = $wpdb->get_col( "SELECT blog_id FROM {$wpdb->blogs}" ); // phpcs:ignore WordPress.DB
	foreach ( $blog_ids as $blog_id ) {
		switch_to_blog( $blog_id );
		rip_uninstall_cleanup();
		restore_current_blog();
	}
}
