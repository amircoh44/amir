<?php
/**
 * Stock image provider interface.
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Interface RIP_Provider_Interface
 *
 * Each external provider (Unsplash, Pexels, Pixabay) implements this so the
 * REST controller can treat them uniformly.
 */
interface RIP_Provider_Interface {

	/**
	 * Machine slug, e.g. "unsplash".
	 *
	 * @return string
	 */
	public function slug();

	/**
	 * Human label, e.g. "Unsplash".
	 *
	 * @return string
	 */
	public function label();

	/**
	 * Whether the provider has the credentials it needs to run.
	 *
	 * @return bool
	 */
	public function is_configured();

	/**
	 * Search the provider.
	 *
	 * @param array $args {
	 *     @type string $query       Search query string.
	 *     @type string $orientation landscape|portrait|square|any.
	 *     @type int    $page        1-based page.
	 *     @type int    $per_page    Results per page.
	 * }
	 * @return array { items: array, total: int } Normalized result items.
	 */
	public function search( array $args );
}
