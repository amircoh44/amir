<?php
/**
 * Classic (TinyMCE) editor integration.
 *
 * Registers an external TinyMCE plugin + toolbar button, and enqueues the
 * modal assets on screens that load the editor.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Editor
 */
class RIP_Editor {

	/**
	 * Register hooks.
	 */
	public function hooks() {
		add_filter( 'mce_external_plugins', array( $this, 'register_tinymce_plugin' ) );
		add_filter( 'mce_buttons', array( $this, 'register_tinymce_button' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Only act on screens that actually show the editor.
	 *
	 * @return bool
	 */
	private function is_editor_screen() {
		if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
			return false;
		}
		$screen = get_current_screen();
		if ( ! $screen ) {
			return false;
		}
		return ( 'post' === $screen->base || 'post-new' === $screen->base );
	}

	/**
	 * Register the external TinyMCE plugin file.
	 *
	 * @param array $plugins Existing plugins.
	 * @return array
	 */
	public function register_tinymce_plugin( $plugins ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return $plugins;
		}
		$plugins['rip_button'] = RIP_PLUGIN_URL . 'assets/js/tinymce-plugin.js?ver=' . RIP_VERSION;
		return $plugins;
	}

	/**
	 * Add our button to the first TinyMCE toolbar row.
	 *
	 * @param array $buttons Existing buttons.
	 * @return array
	 */
	public function register_tinymce_button( $buttons ) {
		$buttons[] = 'rip_button';
		return $buttons;
	}

	/**
	 * Enqueue the modal script + styles and localize config.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_assets( $hook ) {
		if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			return;
		}

		wp_enqueue_style(
			'rip-modal',
			RIP_PLUGIN_URL . 'assets/css/modal.css',
			array(),
			RIP_VERSION
		);

		wp_enqueue_script(
			'rip-modal',
			RIP_PLUGIN_URL . 'assets/js/modal.js',
			array( 'jquery', 'wp-i18n' ),
			RIP_VERSION,
			true
		);

		$configured = array();
		foreach ( RIP_Providers::configured() as $provider ) {
			$configured[] = array(
				'slug'  => $provider->slug(),
				'label' => $provider->label(),
			);
		}

		wp_localize_script(
			'rip-modal',
			'RIP_Config',
			array(
				'restUrl'        => esc_url_raw( rest_url( RIP_REST::NS ) ),
				'nonce'          => wp_create_nonce( 'wp_rest' ),
				'postId'         => isset( $GLOBALS['post'] ) && $GLOBALS['post'] ? (int) $GLOBALS['post']->ID : 0,
				'enableMedia'    => (bool) RIP_Plugin::get_settings( 'enable_media_library', 1 ),
				'enableStock'    => (bool) RIP_Plugin::get_settings( 'enable_stock', 0 ),
				'providers'      => $configured,
				'perPage'        => (int) RIP_Plugin::get_settings( 'results_per_page', 24 ),
				'defaultSize'    => (string) RIP_Plugin::get_settings( 'default_insert_size', 'large' ),
				'canUpload'      => current_user_can( 'upload_files' ),
				'i18n'           => array(
					'title'        => __( 'Related Image Pickup', 'wp-related-image-pickup' ),
					'searchPH'     => __( 'Keywords (edit freely)…', 'wp-related-image-pickup' ),
					'noSelection'  => __( 'Select a sentence in the editor first, then click the button.', 'wp-related-image-pickup' ),
					'noResults'    => __( 'No matching images found. Try fewer or different keywords.', 'wp-related-image-pickup' ),
					'searching'    => __( 'Searching…', 'wp-related-image-pickup' ),
					'insert'       => __( 'Insert', 'wp-related-image-pickup' ),
					'importing'    => __( 'Importing…', 'wp-related-image-pickup' ),
					'mediaTab'     => __( 'Media Library', 'wp-related-image-pickup' ),
					'stockTab'     => __( 'Stock Photos', 'wp-related-image-pickup' ),
				),
			)
		);
	}
}
