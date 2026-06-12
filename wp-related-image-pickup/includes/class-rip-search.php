<?php
/**
 * Media Library search with relevance scoring and rich filtering.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Search
 */
class RIP_Search {

	/**
	 * Run a search against the Media Library.
	 *
	 * @param array $args {
	 *     Search arguments.
	 *
	 *     @type string[] $keywords    Keywords to match.
	 *     @type string   $orientation landscape|portrait|square|any.
	 *     @type int      $min_width   Minimum pixel width.
	 *     @type int      $min_height  Minimum pixel height.
	 *     @type int      $max_size    Maximum file size in bytes (0 = no limit).
	 *     @type int      $min_size    Minimum file size in bytes.
	 *     @type string[] $mime        Allowed mime subtypes (jpeg, png, gif, webp, svg+xml).
	 *     @type string   $orderby     relevance|date|date_asc|size|size_asc|resolution|title.
	 *     @type string   $date_after  Y-m-d lower bound.
	 *     @type string   $date_before Y-m-d upper bound.
	 *     @type int      $page        1-based page number.
	 *     @type int      $per_page    Results per page.
	 * }
	 * @return array { items: array, total: int, page: int, per_page: int, keywords: string[] }
	 */
	public function query( array $args ) {
		$args = wp_parse_args(
			$args,
			array(
				'keywords'    => array(),
				'orientation' => 'any',
				'min_width'   => 0,
				'min_height'  => 0,
				'max_size'    => 0,
				'min_size'    => 0,
				'mime'        => array(),
				'orderby'     => 'relevance',
				'date_after'  => '',
				'date_before' => '',
				'page'        => 1,
				'per_page'    => (int) RIP_Plugin::get_settings( 'results_per_page', 24 ),
			)
		);

		$keywords = array_filter( array_map( 'sanitize_text_field', (array) $args['keywords'] ) );

		// Build the base query. We over-fetch (no pagination in WP_Query) so we can
		// score + filter by image metadata that is not directly queryable, then
		// paginate in PHP. Capped to keep memory bounded on large libraries.
		$mime_types = $this->mime_types( $args['mime'] );

		$query_args = array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'post_mime_type' => $mime_types,
			'posts_per_page' => 400,
			'no_found_rows'  => true,
			'fields'         => 'ids',
		);

		if ( ! empty( $keywords ) ) {
			// Use WP core search across post title/content/excerpt, then we expand
			// relevance scoring to include alt text + filename below.
			$query_args['s'] = implode( ' ', $keywords );
		}

		if ( $args['date_after'] || $args['date_before'] ) {
			$date_query = array();
			if ( $args['date_after'] ) {
				$date_query['after'] = $args['date_after'];
			}
			if ( $args['date_before'] ) {
				$date_query['before'] = $args['date_before'];
			}
			$date_query['inclusive']   = true;
			$query_args['date_query']  = array( $date_query );
		}

		// When keywords exist, WP search is OR-ish across columns but misses alt
		// text + filename. Run an unfiltered fallback so alt/filename matches are
		// not lost, then merge.
		$ids = $this->collect_ids( $query_args, $keywords );

		$items = array();
		foreach ( $ids as $id ) {
			$item = $this->build_item( $id, $keywords );
			if ( null === $item ) {
				continue;
			}
			if ( ! $this->passes_filters( $item, $args ) ) {
				continue;
			}
			$items[] = $item;
		}

		$items = $this->sort_items( $items, $args['orderby'] );

		$total    = count( $items );
		$per_page = max( 1, (int) $args['per_page'] );
		$page     = max( 1, (int) $args['page'] );
		$offset   = ( $page - 1 ) * $per_page;
		$paged    = array_slice( $items, $offset, $per_page );

		return array(
			'items'    => $paged,
			'total'    => $total,
			'page'     => $page,
			'per_page' => $per_page,
			'keywords' => array_values( $keywords ),
		);
	}

	/**
	 * Map requested mime subtypes to full mime type strings.
	 *
	 * @param string[] $subtypes Subtypes like jpeg, png.
	 * @return string[]
	 */
	private function mime_types( $subtypes ) {
		$map = array(
			'jpeg' => 'image/jpeg',
			'jpg'  => 'image/jpeg',
			'png'  => 'image/png',
			'gif'  => 'image/gif',
			'webp' => 'image/webp',
			'svg'  => 'image/svg+xml',
			'avif' => 'image/avif',
		);

		$subtypes = array_filter( array_map( 'sanitize_key', (array) $subtypes ) );

		if ( empty( $subtypes ) ) {
			return 'image';
		}

		$types = array();
		foreach ( $subtypes as $sub ) {
			if ( isset( $map[ $sub ] ) ) {
				$types[] = $map[ $sub ];
			}
		}

		return ! empty( $types ) ? array_values( array_unique( $types ) ) : 'image';
	}

	/**
	 * Collect candidate attachment IDs, merging keyword search with an alt-text
	 * and filename meta search so nothing relevant is missed.
	 *
	 * @param array    $query_args Base WP_Query args.
	 * @param string[] $keywords   Keywords.
	 * @return int[]
	 */
	private function collect_ids( $query_args, $keywords ) {
		$primary = new WP_Query( $query_args );
		$ids     = $primary->posts;

		if ( empty( $keywords ) ) {
			return array_map( 'intval', $ids );
		}

		// Secondary pass: match alt text via meta and slug/filename via name.
		$meta_args = $query_args;
		unset( $meta_args['s'] );

		$meta_queries = array( 'relation' => 'OR' );
		foreach ( $keywords as $kw ) {
			$meta_queries[] = array(
				'key'     => '_wp_attachment_image_alt',
				'value'   => $kw,
				'compare' => 'LIKE',
			);
		}
		$meta_args['meta_query'] = $meta_queries; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query

		$secondary = new WP_Query( $meta_args );

		$ids = array_merge( $ids, $secondary->posts );

		return array_values( array_unique( array_map( 'intval', $ids ) ) );
	}

	/**
	 * Build a normalized result item with a relevance score.
	 *
	 * @param int      $id       Attachment ID.
	 * @param string[] $keywords Keywords for scoring.
	 * @return array|null
	 */
	private function build_item( $id, $keywords ) {
		$meta = wp_get_attachment_metadata( $id );
		$file = get_attached_file( $id );
		$post = get_post( $id );

		if ( ! $post ) {
			return null;
		}

		$width  = isset( $meta['width'] ) ? (int) $meta['width'] : 0;
		$height = isset( $meta['height'] ) ? (int) $meta['height'] : 0;

		$orientation = 'unknown';
		if ( $width && $height ) {
			if ( $width > $height ) {
				$orientation = 'landscape';
			} elseif ( $height > $width ) {
				$orientation = 'portrait';
			} else {
				$orientation = 'square';
			}
		}

		$filesize = 0;
		if ( isset( $meta['filesize'] ) ) {
			$filesize = (int) $meta['filesize'];
		} elseif ( $file && file_exists( $file ) ) {
			$filesize = (int) filesize( $file );
		}

		$alt       = (string) get_post_meta( $id, '_wp_attachment_image_alt', true );
		$thumb     = wp_get_attachment_image_src( $id, 'medium' );
		$full      = wp_get_attachment_image_src( $id, 'full' );
		$filename  = $file ? wp_basename( $file ) : '';

		$item = array(
			'id'          => $id,
			'title'       => $post->post_title,
			'alt'         => $alt,
			'caption'     => $post->post_excerpt,
			'description' => $post->post_content,
			'filename'    => $filename,
			'url'         => $full ? $full[0] : wp_get_attachment_url( $id ),
			'thumb'       => $thumb ? $thumb[0] : ( $full ? $full[0] : wp_get_attachment_url( $id ) ),
			'width'       => $width,
			'height'      => $height,
			'orientation' => $orientation,
			'aspect'      => ( $width && $height ) ? round( $width / $height, 3 ) : 0,
			'filesize'    => $filesize,
			'mime'        => $post->post_mime_type,
			'date'        => $post->post_date_gmt,
			'source'      => 'media_library',
			'sizes'       => $this->available_sizes( $id ),
		);

		$item['score'] = $this->score( $item, $keywords );

		return $item;
	}

	/**
	 * Available registered sizes for the insert dialog.
	 *
	 * @param int $id Attachment ID.
	 * @return array
	 */
	private function available_sizes( $id ) {
		$out   = array();
		$names = array( 'thumbnail', 'medium', 'large', 'full' );

		foreach ( $names as $name ) {
			$src = wp_get_attachment_image_src( $id, $name );
			if ( $src ) {
				$out[ $name ] = array(
					'url'    => $src[0],
					'width'  => (int) $src[1],
					'height' => (int) $src[2],
				);
			}
		}

		return $out;
	}

	/**
	 * Compute a relevance score for an item against the keywords.
	 *
	 * Field weights: alt > title > caption > filename > description.
	 *
	 * @param array    $item     Result item.
	 * @param string[] $keywords Keywords.
	 * @return float
	 */
	private function score( $item, $keywords ) {
		if ( empty( $keywords ) ) {
			// No keywords → neutral score, ordering falls back to other criteria.
			return 0.0;
		}

		$fields = array(
			'alt'         => 5.0,
			'title'       => 4.0,
			'caption'     => 2.5,
			'filename'    => 2.0,
			'description' => 1.0,
		);

		$score   = 0.0;
		$matched = 0;

		foreach ( $keywords as $kw ) {
			$kw   = strtolower( $kw );
			$hit  = false;

			foreach ( $fields as $field => $weight ) {
				$haystack = strtolower( (string) $item[ $field ] );
				if ( '' === $haystack ) {
					continue;
				}

				// Whole-word match scores higher than a substring match.
				if ( preg_match( '/\b' . preg_quote( $kw, '/' ) . '\b/u', $haystack ) ) {
					$score += $weight;
					$hit    = true;
				} elseif ( false !== strpos( $haystack, $kw ) ) {
					$score += $weight * 0.5;
					$hit    = true;
				}
			}

			if ( $hit ) {
				$matched++;
			}
		}

		// Bonus for matching multiple distinct keywords (coverage).
		if ( count( $keywords ) > 0 ) {
			$score += ( $matched / count( $keywords ) ) * 3.0;
		}

		return round( $score, 3 );
	}

	/**
	 * Apply post-query filters that depend on image metadata.
	 *
	 * @param array $item Result item.
	 * @param array $args Search args.
	 * @return bool
	 */
	private function passes_filters( $item, $args ) {
		if ( 'any' !== $args['orientation'] && $item['orientation'] !== $args['orientation'] ) {
			return false;
		}
		if ( $args['min_width'] && $item['width'] < (int) $args['min_width'] ) {
			return false;
		}
		if ( $args['min_height'] && $item['height'] < (int) $args['min_height'] ) {
			return false;
		}
		if ( $args['min_size'] && $item['filesize'] < (int) $args['min_size'] ) {
			return false;
		}
		if ( $args['max_size'] && $item['filesize'] > (int) $args['max_size'] ) {
			return false;
		}

		return true;
	}

	/**
	 * Sort the result items by the requested criterion.
	 *
	 * @param array  $items   Items.
	 * @param string $orderby Order key.
	 * @return array
	 */
	private function sort_items( $items, $orderby ) {
		$comparators = array(
			'relevance'  => function ( $a, $b ) {
				if ( $a['score'] === $b['score'] ) {
					return strtotime( $b['date'] ) <=> strtotime( $a['date'] );
				}
				return $b['score'] <=> $a['score'];
			},
			'date'       => function ( $a, $b ) {
				return strtotime( $b['date'] ) <=> strtotime( $a['date'] );
			},
			'date_asc'   => function ( $a, $b ) {
				return strtotime( $a['date'] ) <=> strtotime( $b['date'] );
			},
			'size'       => function ( $a, $b ) {
				return $b['filesize'] <=> $a['filesize'];
			},
			'size_asc'   => function ( $a, $b ) {
				return $a['filesize'] <=> $b['filesize'];
			},
			'resolution' => function ( $a, $b ) {
				return ( $b['width'] * $b['height'] ) <=> ( $a['width'] * $a['height'] );
			},
			'title'      => function ( $a, $b ) {
				return strcasecmp( $a['title'], $b['title'] );
			},
		);

		$cmp = isset( $comparators[ $orderby ] ) ? $comparators[ $orderby ] : $comparators['relevance'];
		usort( $items, $cmp );

		return $items;
	}
}
