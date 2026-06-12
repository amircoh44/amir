<?php
/**
 * Main plugin loader / orchestrator.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Plugin
 *
 * Wires together the editor integration, REST API and admin settings.
 */
final class RIP_Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var RIP_Plugin|null
	 */
	private static $instance = null;

	/**
	 * Editor integration handler.
	 *
	 * @var RIP_Editor
	 */
	public $editor;

	/**
	 * REST controller.
	 *
	 * @var RIP_REST
	 */
	public $rest;

	/**
	 * Admin settings handler.
	 *
	 * @var RIP_Admin
	 */
	public $admin;

	/**
	 * Get the singleton instance.
	 *
	 * @return RIP_Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor — instantiate sub-components.
	 */
	private function __construct() {
		load_plugin_textdomain( 'wp-related-image-pickup', false, dirname( RIP_PLUGIN_BASENAME ) . '/languages' );

		$this->editor = new RIP_Editor();
		$this->rest   = new RIP_REST();
		$this->admin  = new RIP_Admin();

		$this->editor->hooks();
		$this->rest->hooks();
		$this->admin->hooks();
	}

	/**
	 * Read the merged plugin settings.
	 *
	 * @param string|null $key     Optional specific key.
	 * @param mixed       $default Default value when key missing.
	 * @return mixed
	 */
	public static function get_settings( $key = null, $default = null ) {
		$defaults = array(
			'enable_media_library' => 1,
			'enable_stock'         => 0,
			'unsplash_key'         => '',
			'pexels_key'           => '',
			'pixabay_key'          => '',
			'results_per_page'     => 24,
			'default_insert_size'  => 'large',
		);

		$settings = wp_parse_args( get_option( 'rip_settings', array() ), $defaults );

		if ( null === $key ) {
			return $settings;
		}

		return isset( $settings[ $key ] ) ? $settings[ $key ] : $default;
	}
}
