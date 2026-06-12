<?php
/**
 * Pixabay stock provider.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Provider_Pixabay
 */
class RIP_Provider_Pixabay implements RIP_Provider_Interface {

	/**
	 * {@inheritDoc}
	 */
	public function slug() {
		return 'pixabay';
	}

	/**
	 * {@inheritDoc}
	 */
	public function label() {
		return 'Pixabay';
	}

	/**
	 * API key.
	 *
	 * @return string
	 */
	private function key() {
		return (string) RIP_Plugin::get_settings( 'pixabay_key', '' );
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
			'key'        => $this->key(),
			'q'          => $args['query'],
			'image_type' => 'photo',
			'page'       => max( 1, (int) $args['page'] ),
			'per_page'   => min( 200, max( 3, (int) $args['per_page'] ) ),
			'safesearch' => 'true',
		);

		// Pixabay supports horizontal|vertical|all.
		if ( 'landscape' === $orientation ) {
			$params['orientation'] = 'horizontal';
		} elseif ( 'portrait' === $orientation ) {
			$params['orientation'] = 'vertical';
		}

		$url      = add_query_arg( $params, 'https://pixabay.com/api/' );
		$response = wp_remote_get( $url, array( 'timeout' => 15 ) );

		if ( is_wp_error( $response ) ) {
			return array( 'items' => array(), 'total' => 0, 'error' => $response->get_error_message() );
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $body['hits'] ) || ! is_array( $body['hits'] ) ) {
			return array( 'items' => array(), 'total' => 0 );
		}

		$items = array();
		foreach ( $body['hits'] as $hit ) {
			$width  = isset( $hit['imageWidth'] ) ? (int) $hit['imageWidth'] : 0;
			$height = isset( $hit['imageHeight'] ) ? (int) $hit['imageHeight'] : 0;

			$items[] = array(
				'id'          => 'pixabay_' . (int) $hit['id'],
				'remote_id'   => (string) $hit['id'],
				'title'       => isset( $hit['tags'] ) ? (string) $hit['tags'] : '',
				'alt'         => isset( $hit['tags'] ) ? (string) $hit['tags'] : '',
				'thumb'       => isset( $hit['webformatURL'] ) ? esc_url_raw( $hit['webformatURL'] ) : '',
				'url'         => isset( $hit['largeImageURL'] ) ? esc_url_raw( $hit['largeImageURL'] ) : '',
				'download'    => isset( $hit['largeImageURL'] ) ? esc_url_raw( $hit['largeImageURL'] ) : '',
				'width'       => $width,
				'height'      => $height,
				'orientation' => $this->orientation_of( $width, $height ),
				'aspect'      => ( $width && $height ) ? round( $width / $height, 3 ) : 0,
				'author'      => isset( $hit['user'] ) ? (string) $hit['user'] : '',
				'author_url'  => isset( $hit['pageURL'] ) ? esc_url_raw( $hit['pageURL'] ) : '',
				'source'      => 'pixabay',
				'mime'        => 'image/jpeg',
			);
		}

		return array(
			'items' => $items,
			'total' => isset( $body['totalHits'] ) ? (int) $body['totalHits'] : count( $items ),
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
