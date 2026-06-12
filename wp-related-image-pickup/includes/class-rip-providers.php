<?php
/**
 * Stock provider registry + media-library import.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Providers
 */
class RIP_Providers {

	/**
	 * Get all registered providers.
	 *
	 * @return RIP_Provider_Interface[] Keyed by slug.
	 */
	public static function all() {
		$providers = array();

		foreach ( array( new RIP_Provider_Unsplash(), new RIP_Provider_Pexels(), new RIP_Provider_Pixabay() ) as $provider ) {
			$providers[ $provider->slug() ] = $provider;
		}

		/**
		 * Filter the registered stock providers.
		 *
		 * @param RIP_Provider_Interface[] $providers Providers keyed by slug.
		 */
		return apply_filters( 'rip_providers', $providers );
	}

	/**
	 * Get a single provider by slug.
	 *
	 * @param string $slug Provider slug.
	 * @return RIP_Provider_Interface|null
	 */
	public static function get( $slug ) {
		$all = self::all();
		return isset( $all[ $slug ] ) ? $all[ $slug ] : null;
	}

	/**
	 * Configured (ready-to-use) providers.
	 *
	 * @return RIP_Provider_Interface[]
	 */
	public static function configured() {
		return array_filter(
			self::all(),
			static function ( $provider ) {
				return $provider->is_configured();
			}
		);
	}

	/**
	 * Sideload a remote image into the Media Library.
	 *
	 * @param string $url     Remote image URL to download.
	 * @param array  $meta    {
	 *     @type string $title   Title.
	 *     @type string $alt     Alt text.
	 *     @type string $caption Caption.
	 *     @type int    $post_id Parent post to attach to.
	 * }
	 * @return array|WP_Error Attachment data on success.
	 */
	public static function import_to_library( $url, $meta = array() ) {
		if ( ! current_user_can( 'upload_files' ) ) {
			return new WP_Error( 'rip_forbidden', __( 'You are not allowed to upload files.', 'wp-related-image-pickup' ) );
		}

		$url = esc_url_raw( $url );
		if ( empty( $url ) ) {
			return new WP_Error( 'rip_bad_url', __( 'Invalid image URL.', 'wp-related-image-pickup' ) );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$tmp = download_url( $url, 30 );
		if ( is_wp_error( $tmp ) ) {
			return $tmp;
		}

		// Ensure a sane filename + extension based on the mime type.
		$filename  = self::filename_from_url( $url, $tmp );
		$file_array = array(
			'name'     => $filename,
			'tmp_name' => $tmp,
		);

		$post_id = isset( $meta['post_id'] ) ? (int) $meta['post_id'] : 0;

		$attachment_id = media_handle_sideload( $file_array, $post_id, isset( $meta['title'] ) ? $meta['title'] : '' );

		// Always clean up the temp file.
		if ( file_exists( $tmp ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}

		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}

		if ( ! empty( $meta['alt'] ) ) {
			update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $meta['alt'] ) );
		}

		$update = array( 'ID' => $attachment_id );
		if ( ! empty( $meta['title'] ) ) {
			$update['post_title'] = sanitize_text_field( $meta['title'] );
		}
		if ( ! empty( $meta['caption'] ) ) {
			$update['post_excerpt'] = sanitize_text_field( $meta['caption'] );
		}
		if ( ! empty( $meta['description'] ) ) {
			$update['post_content'] = sanitize_textarea_field( $meta['description'] );
		}
		if ( count( $update ) > 1 ) {
			wp_update_post( $update );
		}

		$src  = wp_get_attachment_image_src( $attachment_id, 'full' );
		$size = wp_get_attachment_image_src( $attachment_id, RIP_Plugin::get_settings( 'default_insert_size', 'large' ) );

		return array(
			'id'     => $attachment_id,
			'url'    => $src ? $src[0] : wp_get_attachment_url( $attachment_id ),
			'sized'  => $size ? $size[0] : ( $src ? $src[0] : wp_get_attachment_url( $attachment_id ) ),
			'width'  => $size ? (int) $size[1] : 0,
			'height' => $size ? (int) $size[2] : 0,
			'alt'    => isset( $meta['alt'] ) ? sanitize_text_field( $meta['alt'] ) : '',
		);
	}

	/**
	 * Build a safe filename for a downloaded image.
	 *
	 * @param string $url Original URL.
	 * @param string $tmp Temp file path.
	 * @return string
	 */
	private static function filename_from_url( $url, $tmp ) {
		$path = wp_parse_url( $url, PHP_URL_PATH );
		$name = $path ? wp_basename( $path ) : '';

		// Many stock URLs have no extension; derive one from the file's mime type.
		$type = wp_check_filetype( $name );
		if ( empty( $type['ext'] ) && function_exists( 'mime_content_type' ) ) {
			$mime = mime_content_type( $tmp );
			$map  = array(
				'image/jpeg' => 'jpg',
				'image/png'  => 'png',
				'image/gif'  => 'gif',
				'image/webp' => 'webp',
			);
			$ext  = isset( $map[ $mime ] ) ? $map[ $mime ] : 'jpg';
			$name = ( $name ? sanitize_file_name( $name ) : 'stock-image' ) . '.' . $ext;
		}

		if ( '' === $name ) {
			$name = 'stock-image-' . time() . '.jpg';
		}

		return sanitize_file_name( $name );
	}
}
