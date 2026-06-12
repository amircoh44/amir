<?php
/**
 * Unsplash stock provider.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Provider_Unsplash
 */
class RIP_Provider_Unsplash implements RIP_Provider_Interface {

	/**
	 * {@inheritDoc}
	 */
	public function slug() {
		return 'unsplash';
	}

	/**
	 * {@inheritDoc}
	 */
	public function label() {
		return 'Unsplash';
	}

	/**
	 * API access key.
	 *
	 * @return string
	 */
	private function key() {
		return (string) RIP_Plugin::get_settings( 'unsplash_key', '' );
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
			'per_page' => min( 30, max( 1, (int) $args['per_page'] ) ),
		);

		// Unsplash uses landscape|portrait|squarish.
		if ( 'landscape' === $orientation ) {
			$params['orientation'] = 'landscape';
		} elseif ( 'portrait' === $orientation ) {
			$params['orientation'] = 'portrait';
		} elseif ( 'square' === $orientation ) {
			$params['orientation'] = 'squarish';
		}

		$url      = add_query_arg( $params, 'https://api.unsplash.com/search/photos' );
		$response = wp_remote_get(
			$url,
			array(
				'timeout' => 15,
				'headers' => array(
					'Authorization' => 'Client-ID ' . $this->key(),
					'Accept-Version' => 'v1',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return array( 'items' => array(), 'total' => 0, 'error' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $body['results'] ) || ! is_array( $body['results'] ) ) {
			return array( 'items' => array(), 'total' => 0 );
		}

		$items = array();
		foreach ( $body['results'] as $photo ) {
			$width  = isset( $photo['width'] ) ? (int) $photo['width'] : 0;
			$height = isset( $photo['height'] ) ? (int) $photo['height'] : 0;

			$items[] = array(
				'id'          => 'unsplash_' . sanitize_text_field( $photo['id'] ),
				'remote_id'   => sanitize_text_field( $photo['id'] ),
				'title'       => isset( $photo['description'] ) ? (string) $photo['description'] : ( isset( $photo['alt_description'] ) ? (string) $photo['alt_description'] : '' ),
				'alt'         => isset( $photo['alt_description'] ) ? (string) $photo['alt_description'] : '',
				'thumb'       => isset( $photo['urls']['small'] ) ? esc_url_raw( $photo['urls']['small'] ) : '',
				'url'         => isset( $photo['urls']['full'] ) ? esc_url_raw( $photo['urls']['full'] ) : '',
				'download'    => isset( $photo['urls']['raw'] ) ? esc_url_raw( $photo['urls']['raw'] ) : ( isset( $photo['urls']['full'] ) ? esc_url_raw( $photo['urls']['full'] ) : '' ),
				'width'       => $width,
				'height'      => $height,
				'orientation' => $this->orientation_of( $width, $height ),
				'aspect'      => ( $width && $height ) ? round( $width / $height, 3 ) : 0,
				'author'      => isset( $photo['user']['name'] ) ? (string) $photo['user']['name'] : '',
				'author_url'  => isset( $photo['user']['links']['html'] ) ? esc_url_raw( $photo['user']['links']['html'] ) : '',
				'source'      => 'unsplash',
				'mime'        => 'image/jpeg',
			);
		}

		return array(
			'items' => $items,
			'total' => isset( $body['total'] ) ? (int) $body['total'] : count( $items ),
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
