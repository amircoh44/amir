<?php
/**
 * YouTube channel import — resolve a channel and pull its uploads, so the
 * videos list can be filled automatically instead of by hand.
 *
 * Two paths:
 *   - RSS (no API key): the channel's public feed — latest ~15 uploads.
 *   - Data API (optional key): the full uploads playlist, paginated.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_YouTube
 */
class RIP_YouTube {

	/**
	 * Resolve a channel ID from a raw ID, URL, or @handle.
	 *
	 * @param string $input Channel ID / URL / @handle.
	 * @return string Channel ID (UC…) or ''.
	 */
	public static function resolve_channel_id( $input ) {
		$input = trim( (string) $input );
		if ( '' === $input ) {
			return '';
		}

		// A raw UC… id or any URL containing /channel/UC…
		if ( preg_match( '#(UC[A-Za-z0-9_-]{20,})#', $input, $m ) ) {
			return $m[1];
		}

		// Build a channel URL to scrape for the id (@handle, /c/, /user/, name).
		$url = $input;
		if ( 0 !== strpos( $url, 'http' ) ) {
			if ( 0 === strpos( $url, '@' ) ) {
				$url = 'https://www.youtube.com/' . $url;
			} else {
				$url = 'https://www.youtube.com/@' . ltrim( $url, '@' );
			}
		}

		$resp = wp_remote_get(
			$url,
			array(
				'timeout' => 15,
				'headers' => array( 'Accept-Language' => 'en-US,en' ),
			)
		);
		if ( is_wp_error( $resp ) ) {
			return '';
		}

		$body = wp_remote_retrieve_body( $resp );
		if ( preg_match( '#"(?:channelId|externalId)":"(UC[A-Za-z0-9_-]{20,})"#', $body, $m ) ) {
			return $m[1];
		}
		return '';
	}

	/**
	 * Import a channel's videos (Data API if a key is given, else RSS).
	 *
	 * @param string $input  Channel ID / URL / @handle.
	 * @param string $apikey Optional YouTube Data API key.
	 * @return array|WP_Error { channel_id, videos:[ {title,url} ], source }
	 */
	public static function import( $input, $apikey = '' ) {
		$id = self::resolve_channel_id( $input );
		if ( '' === $id ) {
			return new WP_Error( 'rip_no_channel', __( 'Could not find that YouTube channel. Use the channel ID (UC…), its URL, or @handle.', 'wp-related-image-pickup' ) );
		}

		$apikey = trim( $apikey );
		if ( '' !== $apikey ) {
			$videos = self::fetch_api( $id, $apikey );
			$source = 'api';
		} else {
			$videos = self::fetch_rss( $id );
			$source = 'rss';
		}

		return array(
			'channel_id' => $id,
			'videos'     => $videos,
			'source'     => $source,
		);
	}

	/**
	 * Fetch + parse the channel RSS feed (latest ~15 uploads, no key needed).
	 *
	 * @param string $channel_id Channel ID.
	 * @return array
	 */
	public static function fetch_rss( $channel_id ) {
		$url  = 'https://www.youtube.com/feeds/videos.xml?channel_id=' . rawurlencode( $channel_id );
		$resp = wp_remote_get( $url, array( 'timeout' => 15 ) );
		if ( is_wp_error( $resp ) ) {
			return array();
		}
		return self::parse_rss( wp_remote_retrieve_body( $resp ) );
	}

	/**
	 * Parse a YouTube channel RSS feed. Exposed for testing.
	 *
	 * @param string $xml Feed XML.
	 * @return array[] [ {title,url} ]
	 */
	public static function parse_rss( $xml ) {
		$out = array();
		$xml = trim( (string) $xml );
		if ( '' === $xml ) {
			return $out;
		}

		$previous = libxml_use_internal_errors( true );
		$feed     = simplexml_load_string( $xml );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );
		if ( false === $feed ) {
			return $out;
		}

		foreach ( $feed->entry as $entry ) {
			$title = trim( (string) $entry->title );

			$href = '';
			foreach ( $entry->link as $link ) {
				$attrs = $link->attributes();
				if ( isset( $attrs['href'] ) ) {
					$href = (string) $attrs['href'];
					break;
				}
			}

			$ns  = $entry->children( 'http://www.youtube.com/xml/schemas/2015' );
			$vid = $ns ? trim( (string) $ns->videoId ) : '';
			if ( '' === $vid && preg_match( '#[?&]v=([A-Za-z0-9_-]+)#', $href, $m ) ) {
				$vid = $m[1];
			}

			$url = '' !== $vid ? 'https://www.youtube.com/watch?v=' . $vid : $href;
			if ( '' !== $url ) {
				$out[] = array(
					'title' => $title,
					'url'   => $url,
				);
			}
		}
		return $out;
	}

	/**
	 * Fetch the full uploads playlist via the YouTube Data API.
	 *
	 * @param string $channel_id Channel ID.
	 * @param string $apikey     API key.
	 * @return array
	 */
	public static function fetch_api( $channel_id, $apikey ) {
		// The uploads playlist id is the channel id with the UC prefix → UU.
		$uploads = 'UU' . substr( $channel_id, 2 );
		$videos  = array();
		$page     = '';
		$guard    = 0;

		do {
			$url = add_query_arg(
				array(
					'part'       => 'snippet',
					'playlistId' => $uploads,
					'maxResults' => 50,
					'key'        => $apikey,
					'pageToken'  => $page,
				),
				'https://www.googleapis.com/youtube/v3/playlistItems'
			);

			$resp = wp_remote_get( $url, array( 'timeout' => 20 ) );
			if ( is_wp_error( $resp ) ) {
				break;
			}
			$body = json_decode( wp_remote_retrieve_body( $resp ), true );
			if ( empty( $body['items'] ) ) {
				break;
			}

			foreach ( $body['items'] as $item ) {
				$vid   = isset( $item['snippet']['resourceId']['videoId'] ) ? $item['snippet']['resourceId']['videoId'] : '';
				$title = isset( $item['snippet']['title'] ) ? $item['snippet']['title'] : '';
				if ( $vid && 'Private video' !== $title && 'Deleted video' !== $title ) {
					$videos[] = array(
						'title' => $title,
						'url'   => 'https://www.youtube.com/watch?v=' . $vid,
					);
				}
			}

			$page = isset( $body['nextPageToken'] ) ? $body['nextPageToken'] : '';
		} while ( $page && ++$guard < 20 && count( $videos ) < 1000 );

		return $videos;
	}
}
