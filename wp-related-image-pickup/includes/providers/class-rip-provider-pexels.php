<?php
/**
 * Pexels stock provider.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Provider_Pexels
 */
class RIP_Provider_Pexels implements RIP_Provider_Interface {

	/**
	 * {@inheritDoc}
	 */
	public function slug() {
		return 'pexels';
	}

	/**
	 * {@inheritDoc}
	 */
	public function label() {
		return 'Pexels';
	}

	/**
	 * API key.
	 *
	 * @return string
	 */
	private function key() {
		return (string) RIP_Plugin::get_settings( 'pexels_key', '' );
	}

	/**
	 * {@inheritDoc}
	 */
	public function is_configured() {
		return '' !== $this->key();
	}

	/**
	 * {@inheritDoc}
	 */
	public function search( array $args ) {
		if ( ! $this->is_configured() ) {
			return array( 'items' => array(), 'total' => 0 );
		}

		$orientation = isset( $args['orientation'] ) ? $args['orientation'] : 'any';
		$params      = array(
			'query'    => $args['query'],
			'page'     => max( 1, (int) $args['page'] ),
			'per_page' => min( 80, max( 1, (int) $args['per_page'] ) ),
		);

		if ( in_array( $orientation, array( 'landscape', 'portrait', 'square' ), true ) ) {
			$params['orientation'] = $orientation;
		}

		$url      = add_query_arg( $params, 'https://api.pexels.com/v1/search' );
		$response = wp_remote_get(
			$url,
			array(
				'timeout' => 15,
				'headers' => array(
					'Authorization' => $this->key(),
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'items' => array(), 'total' => 0, 'error' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $body['photos'] ) || ! is_array( $body['photos'] ) ) {
			return array( 'items' => array(), 'total' => 0 );
		}

		$items = array();
		foreach ( $body['photos'] as $photo ) {
			$width  = isset( $photo['width'] ) ? (int) $photo['width'] : 0;
			$height = isset( $photo['height'] ) ? (int) $photo['height'] : 0;

			$items[] = array(
				'id'          => 'pexels_' . (int) $photo['id'],
				'remote_id'   => (string) $photo['id'],
				'title'       => isset( $photo['alt'] ) ? (string) $photo['alt'] : '',
				'alt'         => isset( $photo['alt'] ) ? (string) $photo['alt'] : '',
				'thumb'       => isset( $photo['src']['medium'] ) ? esc_url_raw( $photo['src']['medium'] ) : '',
				'url'         => isset( $photo['src']['large2x'] ) ? esc_url_raw( $photo['src']['large2x'] ) : ( isset( $photo['src']['original'] ) ? esc_url_raw( $photo['src']['original'] ) : '' ),
				'download'    => isset( $photo['src']['original'] ) ? esc_url_raw( $photo['src']['original'] ) : '',
				'width'       => $width,
				'height'      => $height,
				'orientation' => $this->orientation_of( $width, $height ),
				'aspect'      => ( $width && $height ) ? round( $width / $height, 3 ) : 0,
				'author'      => isset( $photo['photographer'] ) ? (string) $photo['photographer'] : '',
				'author_url'  => isset( $photo['photographer_url'] ) ? esc_url_raw( $photo['photographer_url'] ) : '',
				'source'      => 'pexels',
				'mime'        => 'image/jpeg',
			);
		}

		return array(
			'items' => $items,
			'total' => isset( $body['total_results'] ) ? (int) $body['total_results'] : count( $items ),
		);
	}

	/**
	 * Derive orientation from dimensions.
	 *
	 * @param int $w Width.
	 * @param int $h Height.
	 * @return string
	 */
	private function orientation_of( $w, $h ) {
		if ( ! $w || ! $h ) {
			return 'unknown';
		}
		if ( $w > $h ) {
			return 'landscape';
		}
		if ( $h > $w ) {
			return 'portrait';
		}
		return 'square';
	}
}
