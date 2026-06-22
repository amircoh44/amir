<?php
/**
 * REST API controller.
 *
 * Exposes:
 *   GET  /rip/v1/keywords     Extract keywords from a sentence.
 *   GET  /rip/v1/search       Search the Media Library (with filters).
 *   GET  /rip/v1/stock        Search configured stock providers.
 *   POST /rip/v1/import       Import a stock image into the Media Library.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_REST
 */
class RIP_REST {

	const NS = 'rip/v1';

	/**
	 * Register hooks.
	 */
	public function hooks() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Permission callback — must be able to edit posts.
	 *
	 * @return bool
	 */
	public function can_edit() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Register all REST routes.
	 */
	public function register_routes() {
		register_rest_route(
			self::NS,
			'/keywords',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_keywords' ),
				'permission_callback' => array( $this, 'can_edit' ),
				'args'                => array(
					'text' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
					),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/search',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_search' ),
				'permission_callback' => array( $this, 'can_edit' ),
				'args'                => $this->search_args(),
			)
		);

		register_rest_route(
			self::NS,
			'/stock',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_stock' ),
				'permission_callback' => array( $this, 'can_edit' ),
				'args'                => array_merge(
					$this->search_args(),
					array(
						'provider' => array(
							'type'              => 'string',
							'default'           => '',
							'sanitize_callback' => 'sanitize_key',
						),
					)
				),
			)
		);

		register_rest_route(
			self::NS,
			'/import',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_import' ),
				'permission_callback' => function () {
					return current_user_can( 'upload_files' );
				},
				'args'                => array(
					'url'         => array( 'required' => true, 'type' => 'string' ),
					'title'       => array( 'type' => 'string', 'default' => '' ),
					'alt'         => array( 'type' => 'string', 'default' => '' ),
					'caption'     => array( 'type' => 'string', 'default' => '' ),
					'description' => array( 'type' => 'string', 'default' => '' ),
					'post_id'     => array( 'type' => 'integer', 'default' => 0 ),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/links',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_links' ),
				'permission_callback' => array( $this, 'can_edit' ),
				'args'                => array(
					'keywords'     => array( 'type' => 'string', 'default' => '' ),
					'text'         => array( 'type' => 'string', 'default' => '' ),
					'limit'        => array( 'type' => 'integer', 'default' => 300 ),
					'refresh'      => array( 'type' => 'boolean', 'default' => false ),
					'exclude_post' => array( 'type' => 'integer', 'default' => 0 ),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/import-videos',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_import_videos' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'channel' => array( 'required' => true, 'type' => 'string' ),
					'apikey'  => array( 'type' => 'string', 'default' => '' ),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/block-link',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_block_link' ),
				'permission_callback' => array( $this, 'can_edit' ),
				'args'                => array(
					'url'     => array( 'required' => true, 'type' => 'string' ),
					'blocked' => array( 'type' => 'boolean', 'default' => true ),
				),
			)
		);

		register_rest_route(
			self::NS,
			'/update-meta',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_update_meta' ),
				'permission_callback' => array( $this, 'can_edit' ),
				'args'                => array(
					'id'          => array( 'required' => true, 'type' => 'integer' ),
					'title'       => array( 'type' => 'string', 'default' => '' ),
					'alt'         => array( 'type' => 'string', 'default' => '' ),
					'caption'     => array( 'type' => 'string', 'default' => '' ),
					'description' => array( 'type' => 'string', 'default' => '' ),
				),
			)
		);
	}

	/**
	 * Shared argument schema for search-type endpoints.
	 *
	 * @return array
	 */
	private function search_args() {
		return array(
			'keywords'    => array( 'type' => 'string', 'default' => '' ),
			'text'        => array( 'type' => 'string', 'default' => '' ),
			'orientation' => array(
				'type'    => 'string',
				'default' => 'any',
				'enum'    => array( 'any', 'landscape', 'portrait', 'square' ),
			),
			'min_width'   => array( 'type' => 'integer', 'default' => 0 ),
			'min_height'  => array( 'type' => 'integer', 'default' => 0 ),
			'min_size'    => array( 'type' => 'integer', 'default' => 0 ),
			'max_size'    => array( 'type' => 'integer', 'default' => 0 ),
			'mime'        => array( 'type' => 'string', 'default' => '' ),
			'usage'       => array(
				'type'    => 'string',
				'default' => 'any',
				'enum'    => array( 'any', 'unused', 'used' ),
			),
			'max_usage'   => array( 'type' => 'integer', 'default' => 0 ),
			'icons'       => array(
				'type'    => 'string',
				'default' => 'exclude',
				'enum'    => array( 'exclude', 'only', 'any' ),
			),
			'orderby'     => array(
				'type'    => 'string',
				'default' => 'relevance',
				'enum'    => array( 'relevance', 'date', 'date_asc', 'size', 'size_asc', 'resolution', 'title', 'usage', 'usage_asc' ),
			),
			'date_after'  => array( 'type' => 'string', 'default' => '' ),
			'date_before' => array( 'type' => 'string', 'default' => '' ),
			'page'        => array( 'type' => 'integer', 'default' => 1 ),
			'per_page'    => array( 'type' => 'integer', 'default' => (int) RIP_Plugin::get_settings( 'results_per_page', 24 ) ),
		);
	}

	/**
	 * Resolve keywords from either an explicit keyword string or raw text.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return string[]
	 */
	private function resolve_keywords( WP_REST_Request $request ) {
		$explicit = trim( (string) $request->get_param( 'keywords' ) );
		if ( '' !== $explicit ) {
			return array_filter( array_map( 'trim', preg_split( '/[\s,]+/', $explicit ) ) );
		}

		$text = (string) $request->get_param( 'text' );
		return RIP_Keywords::extract( $text );
	}

	/**
	 * GET /keywords
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_keywords( WP_REST_Request $request ) {
		$keywords = RIP_Keywords::extract( (string) $request->get_param( 'text' ) );
		return rest_ensure_response(
			array(
				'keywords' => array_values( $keywords ),
			)
		);
	}

	/**
	 * GET /search — Media Library.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_search( WP_REST_Request $request ) {
		if ( ! RIP_Plugin::get_settings( 'enable_media_library', 1 ) ) {
			return rest_ensure_response(
				array( 'items' => array(), 'total' => 0, 'keywords' => array(), 'disabled' => true )
			);
		}

		$search = new RIP_Search();
		$mime   = array_filter( array_map( 'trim', explode( ',', (string) $request->get_param( 'mime' ) ) ) );

		$result = $search->query(
			array(
				'keywords'    => $this->resolve_keywords( $request ),
				'orientation' => $request->get_param( 'orientation' ),
				'min_width'   => (int) $request->get_param( 'min_width' ),
				'min_height'  => (int) $request->get_param( 'min_height' ),
				'min_size'    => (int) $request->get_param( 'min_size' ),
				'max_size'    => (int) $request->get_param( 'max_size' ),
				'mime'        => $mime,
				'usage'       => $request->get_param( 'usage' ),
				'max_usage'   => (int) $request->get_param( 'max_usage' ),
				'icons'       => $request->get_param( 'icons' ),
				'orderby'     => $request->get_param( 'orderby' ),
				'date_after'  => sanitize_text_field( (string) $request->get_param( 'date_after' ) ),
				'date_before' => sanitize_text_field( (string) $request->get_param( 'date_before' ) ),
				'page'        => (int) $request->get_param( 'page' ),
				'per_page'    => (int) $request->get_param( 'per_page' ),
			)
		);

		return rest_ensure_response( $result );
	}

	/**
	 * GET /stock — external providers.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_stock( WP_REST_Request $request ) {
		if ( ! RIP_Plugin::get_settings( 'enable_stock', 0 ) ) {
			return rest_ensure_response(
				array( 'items' => array(), 'total' => 0, 'disabled' => true )
			);
		}

		$keywords = $this->resolve_keywords( $request );
		$query    = implode( ' ', $keywords );

		if ( '' === trim( $query ) ) {
			return rest_ensure_response( array( 'items' => array(), 'total' => 0 ) );
		}

		$slug      = (string) $request->get_param( 'provider' );
		$providers = RIP_Providers::configured();

		if ( $slug ) {
			$single = RIP_Providers::get( $slug );
			$providers = ( $single && $single->is_configured() ) ? array( $slug => $single ) : array();
		}

		$items = array();
		$total = 0;
		foreach ( $providers as $provider ) {
			$result = $provider->search(
				array(
					'query'       => $query,
					'orientation' => $request->get_param( 'orientation' ),
					'page'        => (int) $request->get_param( 'page' ),
					'per_page'    => (int) $request->get_param( 'per_page' ),
				)
			);
			if ( ! empty( $result['items'] ) ) {
				$items  = array_merge( $items, $result['items'] );
				$total += isset( $result['total'] ) ? (int) $result['total'] : count( $result['items'] );
			}
		}

		return rest_ensure_response(
			array(
				'items'    => $items,
				'total'    => $total,
				'keywords' => array_values( $keywords ),
			)
		);
	}

	/**
	 * POST /import — sideload a stock image.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_import( WP_REST_Request $request ) {
		$result = RIP_Providers::import_to_library(
			(string) $request->get_param( 'url' ),
			array(
				'title'       => sanitize_text_field( (string) $request->get_param( 'title' ) ),
				'alt'         => sanitize_text_field( (string) $request->get_param( 'alt' ) ),
				'caption'     => sanitize_text_field( (string) $request->get_param( 'caption' ) ),
				'description' => sanitize_textarea_field( (string) $request->get_param( 'description' ) ),
				'post_id'     => (int) $request->get_param( 'post_id' ),
			)
		);

		if ( is_wp_error( $result ) ) {
			return new WP_Error( $result->get_error_code(), $result->get_error_message(), array( 'status' => 400 ) );
		}

		return rest_ensure_response( $result );
	}

	/**
	 * GET /links — internal-link candidates from the site's sitemap, optionally
	 * scored against the article keywords.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_links( WP_REST_Request $request ) {
		$limit = max( 10, min( 1000, (int) $request->get_param( 'limit' ) ) );
		$links = RIP_Sitemap::get_links( $limit, (bool) $request->get_param( 'refresh' ) );

		// Never offer the page currently being edited (no self-links) or home.
		$exclude_post = (int) $request->get_param( 'exclude_post' );
		if ( $exclude_post > 0 ) {
			$self_url = untrailingslashit( strtolower( (string) get_permalink( $exclude_post ) ) );
			$links    = array_values(
				array_filter(
					$links,
					static function ( $link ) use ( $self_url ) {
						return untrailingslashit( strtolower( $link['url'] ) ) !== $self_url;
					}
				)
			);
		}

		$keywords = $this->resolve_keywords( $request );

		// Score each candidate against the FULL article text (not a capped
		// keyword list): how many of the title's significant words appear.
		$text = strtolower( (string) $request->get_param( 'text' ) );
		if ( '' !== trim( $text ) ) {
			foreach ( $links as &$link ) {
				$title = strtolower( preg_replace( '/[^a-z0-9\s]/i', ' ', $link['title'] ) );
				$words = array_unique(
					array_filter(
						preg_split( '/\s+/', $title ),
						static function ( $w ) {
							return strlen( $w ) >= 4;
						}
					)
				);
				$score = 0;
				foreach ( $words as $w ) {
					if ( false !== strpos( $text, $w ) ) {
						$score++;
					}
				}
				$link['score'] = $score;
			}
			unset( $link );

			usort(
				$links,
				static function ( $a, $b ) {
					return $b['score'] <=> $a['score'];
				}
			);
		}

		return rest_ensure_response(
			array(
				'items'    => array_values( $links ),
				'total'    => count( $links ),
				'sitemaps' => RIP_Sitemap::discovered(),
				'keywords' => array_values( $keywords ),
			)
		);
	}

	/**
	 * POST /import-videos — pull a YouTube channel's videos and merge them into
	 * the saved videos list (dedup by video ID).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_import_videos( WP_REST_Request $request ) {
		$result = RIP_YouTube::import(
			(string) $request->get_param( 'channel' ),
			(string) $request->get_param( 'apikey' )
		);
		if ( is_wp_error( $result ) ) {
			return new WP_Error( $result->get_error_code(), $result->get_error_message(), array( 'status' => 400 ) );
		}

		if ( empty( $result['videos'] ) ) {
			return new WP_Error(
				'rip_no_videos',
				'rss' === $result['source']
					? __( 'No videos found in the channel feed. The channel may be empty or private.', 'wp-related-image-pickup' )
					: __( 'No videos returned — check the API key and channel.', 'wp-related-image-pickup' ),
				array( 'status' => 400 )
			);
		}

		$existing = (array) get_option( 'rip_videos', array() );
		$by_key   = array();
		foreach ( $existing as $v ) {
			if ( empty( $v['url'] ) ) {
				continue;
			}
			$key            = RIP_Admin::youtube_id( $v['url'] );
			$key            = $key ? $key : $v['url'];
			$by_key[ $key ] = $v;
		}

		$added = 0;
		foreach ( $result['videos'] as $v ) {
			$key = RIP_Admin::youtube_id( $v['url'] );
			$key = $key ? $key : $v['url'];
			if ( ! isset( $by_key[ $key ] ) ) {
				$by_key[ $key ] = array(
					'title' => sanitize_text_field( $v['title'] ),
					'url'   => esc_url_raw( $v['url'] ),
				);
				$added++;
			}
		}

		$merged = array_values( $by_key );
		update_option( 'rip_videos', $merged );
		update_option( 'rip_yt_channel', sanitize_text_field( (string) $request->get_param( 'channel' ) ) );

		$lines = array();
		foreach ( $merged as $v ) {
			$lines[] = ( ! empty( $v['title'] ) && $v['title'] !== $v['url'] ? $v['title'] . ' | ' : '' ) . $v['url'];
		}

		return rest_ensure_response(
			array(
				'added'      => $added,
				'fetched'    => count( $result['videos'] ),
				'total'      => count( $merged ),
				'channel_id' => $result['channel_id'],
				'source'     => $result['source'],
				'lines'      => implode( "\n", $lines ),
			)
		);
	}

	/**
	 * POST /block-link — block (or unblock) a page from internal-link
	 * suggestions site-wide.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_block_link( WP_REST_Request $request ) {
		$url     = esc_url_raw( (string) $request->get_param( 'url' ) );
		$blocked = (bool) $request->get_param( 'blocked' );
		$list    = RIP_Sitemap::set_blocked( $url, $blocked );

		return rest_ensure_response(
			array(
				'url'       => $url,
				'blocked'   => $blocked,
				'blocklist' => $list,
			)
		);
	}

	/**
	 * POST /update-meta — persist edited title/alt/caption/description on an
	 * existing Media Library attachment.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_update_meta( WP_REST_Request $request ) {
		$id   = (int) $request->get_param( 'id' );
		$post = get_post( $id );

		if ( ! $post || 'attachment' !== $post->post_type ) {
			return new WP_Error( 'rip_not_found', __( 'Attachment not found.', 'wp-related-image-pickup' ), array( 'status' => 404 ) );
		}
		if ( ! current_user_can( 'edit_post', $id ) ) {
			return new WP_Error( 'rip_forbidden', __( 'You are not allowed to edit this image.', 'wp-related-image-pickup' ), array( 'status' => 403 ) );
		}

		$update = array(
			'ID'           => $id,
			'post_title'   => sanitize_text_field( (string) $request->get_param( 'title' ) ),
			'post_excerpt' => sanitize_text_field( (string) $request->get_param( 'caption' ) ),
			'post_content' => sanitize_textarea_field( (string) $request->get_param( 'description' ) ),
		);
		wp_update_post( $update );
		update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( (string) $request->get_param( 'alt' ) ) );

		return rest_ensure_response( array( 'id' => $id, 'updated' => true ) );
	}
}
