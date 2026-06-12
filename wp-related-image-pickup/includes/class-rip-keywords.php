<?php
/**
 * Keyword extraction from a selected sentence.
 *
 * Turns a free-text selection into a ranked set of search keywords by
 * stripping stop-words, punctuation and very short tokens, then de-duplicating
 * while preserving order of appearance.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Keywords
 */
class RIP_Keywords {

	/**
	 * Common English stop-words to drop from keyword extraction.
	 *
	 * @return string[]
	 */
	public static function stopwords() {
		$words = array(
			'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for',
			'from', 'had', 'has', 'have', 'he', 'her', 'his', 'how', 'i', 'if', 'in',
			'into', 'is', 'it', 'its', 'me', 'my', 'no', 'not', 'of', 'on', 'or',
			'our', 'out', 'over', 'she', 'so', 'than', 'that', 'the', 'their',
			'them', 'then', 'there', 'these', 'they', 'this', 'to', 'too', 'us',
			'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
			'will', 'with', 'would', 'you', 'your', 'about', 'after', 'again',
			'all', 'also', 'any', 'because', 'before', 'being', 'between', 'both',
			'can', 'did', 'do', 'does', 'down', 'during', 'each', 'few', 'further',
			'here', 'just', 'more', 'most', 'now', 'off', 'once', 'only', 'other',
			'own', 'same', 'should', 'some', 'such', 'up', 'very', 'via',
		);

		/**
		 * Filter the list of stop-words used during keyword extraction.
		 *
		 * @param string[] $words Stop-words.
		 */
		return apply_filters( 'rip_stopwords', $words );
	}

	/**
	 * Extract clean keywords from an arbitrary text selection.
	 *
	 * @param string $text  Raw selected text.
	 * @param int    $limit Maximum number of keywords to return.
	 * @return string[] Ordered, de-duplicated keywords.
	 */
	public static function extract( $text, $limit = 8 ) {
		$text = wp_strip_all_tags( (string) $text );
		$text = html_entity_decode( $text, ENT_QUOTES, 'UTF-8' );
		$text = strtolower( $text );

		// Replace any non letter/number/space (unicode aware) with a space.
		$text = preg_replace( '/[^\p{L}\p{N}\s]+/u', ' ', $text );
		$text = preg_replace( '/\s+/u', ' ', $text );
		$text = trim( $text );

		if ( '' === $text ) {
			return array();
		}

		$tokens    = explode( ' ', $text );
		$stopwords = array_flip( self::stopwords() );
		$keywords  = array();

		foreach ( $tokens as $token ) {
			$token = trim( $token );

			// Drop short tokens and stop-words. Keep pure numbers out too.
			if ( strlen( $token ) < 3 ) {
				continue;
			}
			if ( isset( $stopwords[ $token ] ) ) {
				continue;
			}
			if ( ctype_digit( $token ) ) {
				continue;
			}
			if ( ! in_array( $token, $keywords, true ) ) {
				$keywords[] = $token;
			}
		}

		$keywords = array_slice( $keywords, 0, max( 1, (int) $limit ) );

		/**
		 * Filter the extracted keywords before searching.
		 *
		 * @param string[] $keywords Extracted keywords.
		 * @param string   $text     Original text.
		 */
		return apply_filters( 'rip_extracted_keywords', $keywords, $text );
	}
}
