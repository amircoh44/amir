<?php
/**
 * Sitemap discovery + parsing for internal-link suggestions.
 *
 * Works with any SEO plugin (Yoast, Rank Math) and WordPress core sitemaps by
 * auto-discovering the sitemap from robots.txt and well-known locations, then
 * walking sitemap indexes down to the URL sets.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Sitemap
 */
class RIP_Sitemap {

	const CACHE_KEY = 'rip_sitemap_links';

	/**
	 * Sitemaps discovered on the most recent run (for diagnostics in the UI).
	 *
	 * @var string[]
	 */
	private static $discovered = array();

	/**
	 * Get internal-link candidates pulled from the site's sitemap.
	 *
	 * @param int  $limit Maximum links to return.
	 * @param bool $fresh Bypass the cache.
	 * @return array[] Each: { url, title, type }.
	 */
	public static function get_links( $limit = 500, $fresh = false ) {
		if ( ! $fresh ) {
			$cache = get_transient( self::CACHE_KEY );
			if ( is_array( $cache ) ) {
				return array_slice( $cache, 0, $limit );
			}
		}

		$sitemaps         = self::discover();
		self::$discovered = $sitemaps;

		$urls = array();
		foreach ( $sitemaps as $sitemap ) {
			$urls = array_merge( $urls, self::parse( $sitemap, 0 ) );
			if ( count( $urls ) >= $limit * 2 ) {
				break;
			}
		}

		$urls  = array_slice( array_values( array_unique( $urls ) ), 0, $limit );
		$home  = home_url( '/' );
		$links = array();

		foreach ( $urls as $url ) {
			// Skip the site root itself — rarely a useful internal link target.
			if ( untrailingslashit( $url ) === untrailingslashit( $home ) ) {
				continue;
			}

			$post_id = url_to_postid( $url );
			if ( $post_id ) {
				$links[] = array(
					'url'   => get_permalink( $post_id ),
					'title' => html_entity_decode( get_the_title( $post_id ), ENT_QUOTES, 'UTF-8' ),
					'type'  => get_post_type( $post_id ),
				);
			} else {
				$links[] = array(
					'url'   => $url,
					'title' => self::title_from_url( $url ),
					'type'  => 'url',
				);
			}
		}

		// De-duplicate by URL.
		$seen   = array();
		$unique = array();
		foreach ( $links as $link ) {
			if ( '' === $link['title'] || isset( $seen[ $link['url'] ] ) ) {
				continue;
			}
			$seen[ $link['url'] ] = true;
			$unique[]             = $link;
		}

		set_transient( self::CACHE_KEY, $unique, HOUR_IN_SECONDS );
		return array_slice( $unique, 0, $limit );
	}

	/**
	 * Sitemaps discovered during the last get_links() call.
	 *
	 * @return string[]
	 */
	public static function discovered() {
		return self::$discovered;
	}

	/**
	 * Clear the cached link set.
	 */
	public static function flush() {
		delete_transient( self::CACHE_KEY );
	}

	/**
	 * Discover sitemap URLs from robots.txt and common locations.
	 *
	 * @return string[]
	 */
	private static function discover() {
		$found = array();

		$robots = wp_remote_get( home_url( '/robots.txt' ), array( 'timeout' => 10 ) );
		if ( ! is_wp_error( $robots ) && 200 === (int) wp_remote_retrieve_response_code( $robots ) ) {
			if ( preg_match_all( '/^\s*Sitemap:\s*(\S+)/mi', wp_remote_retrieve_body( $robots ), $m ) ) {
				foreach ( $m[1] as $loc ) {
					$found[] = esc_url_raw( trim( $loc ) );
				}
			}
		}

		// Yoast / Rank Math / core fallbacks.
		foreach ( array( '/sitemap_index.xml', '/sitemap.xml', '/wp-sitemap.xml' ) as $path ) {
			$url = home_url( $path );
			if ( in_array( $url, $found, true ) ) {
				continue;
			}
			$resp = wp_remote_get( $url, array( 'timeout' => 8, 'redirection' => 3 ) );
			if ( ! is_wp_error( $resp ) && 200 === (int) wp_remote_retrieve_response_code( $resp ) ) {
				$found[] = $url;
			}
		}

		/**
		 * Filter the discovered sitemap URLs.
		 *
		 * @param string[] $found Sitemap URLs.
		 */
		return array_values( array_unique( apply_filters( 'rip_sitemaps', array_filter( $found ) ) ) );
	}

	/**
	 * Fetch + parse a sitemap, recursing into sitemap indexes.
	 *
	 * @param string $url   Sitemap URL.
	 * @param int    $depth Current recursion depth.
	 * @return string[] Page URLs.
	 */
	private static function parse( $url, $depth ) {
		if ( $depth > 2 ) {
			return array();
		}

		$resp = wp_remote_get( $url, array( 'timeout' => 15 ) );
		if ( is_wp_error( $resp ) || 200 !== (int) wp_remote_retrieve_response_code( $resp ) ) {
			return array();
		}

		$parsed = self::extract_locs( wp_remote_retrieve_body( $resp ) );
		if ( 'sitemapindex' === $parsed['type'] ) {
			$urls = array();
			foreach ( $parsed['locs'] as $child ) {
				$urls = array_merge( $urls, self::parse( $child, $depth + 1 ) );
			}
			return $urls;
		}

		return $parsed['locs'];
	}

	/**
	 * Parse a sitemap XML body into its <loc> entries. Exposed for testing.
	 *
	 * @param string $body XML string.
	 * @return array { type: 'sitemapindex'|'urlset', locs: string[] }
	 */
	public static function extract_locs( $body ) {
		$body = trim( (string) $body );
		if ( '' === $body ) {
			return array( 'type' => 'urlset', 'locs' => array() );
		}

		$previous = libxml_use_internal_errors( true );
		$xml      = simplexml_load_string( $body );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );

		if ( false === $xml ) {
			return array( 'type' => 'urlset', 'locs' => array() );
		}

		$name = $xml->getName();
		$locs = array();

		if ( 'sitemapindex' === $name ) {
			foreach ( $xml->sitemap as $sitemap ) {
				$loc = trim( (string) $sitemap->loc );
				if ( $loc ) {
					$locs[] = $loc;
				}
			}
			return array( 'type' => 'sitemapindex', 'locs' => $locs );
		}

		foreach ( $xml->url as $entry ) {
			$loc = trim( (string) $entry->loc );
			if ( $loc ) {
				$locs[] = $loc;
			}
		}
		return array( 'type' => 'urlset', 'locs' => $locs );
	}

	/**
	 * Build a readable title from a URL slug when no local post matches.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private static function title_from_url( $url ) {
		$path = trim( (string) wp_parse_url( $url, PHP_URL_PATH ), '/' );
		if ( '' === $path ) {
			return '';
		}
		$segments = explode( '/', $path );
		$slug     = end( $segments );
		$slug     = preg_replace( '/\.[a-z0-9]+$/i', '', $slug );
		return ucwords( trim( str_replace( array( '-', '_' ), ' ', $slug ) ) );
	}
}
