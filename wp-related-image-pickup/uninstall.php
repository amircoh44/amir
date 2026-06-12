<?php
/**
 * Uninstall handler — removes plugin options.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'rip_settings' );

// Multisite: clean up per-site options too.
if ( is_multisite() ) {
	global $wpdb;
	$blog_ids = $wpdb->get_col( "SELECT blog_id FROM {$wpdb->blogs}" ); // phpcs:ignore WordPress.DB
	foreach ( $blog_ids as $blog_id ) {
		switch_to_blog( $blog_id );
		delete_option( 'rip_settings' );
		restore_current_blog();
	}
}
