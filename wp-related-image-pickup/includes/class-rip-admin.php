<?php
/**
 * Admin settings page (Settings → Related Image Pickup).
 *
 * @package WP_Related_Image_Pickup
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class RIP_Admin
 */
class RIP_Admin {

	/**
	 * Register hooks.
	 */
	public function hooks() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_css' ) );
		add_filter( 'plugin_action_links_' . RIP_PLUGIN_BASENAME, array( $this, 'action_links' ) );
	}

	/**
	 * Enqueue the settings-page stylesheet (only on our screen).
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_admin_css( $hook ) {
		if ( 'settings_page_rip-settings' !== $hook ) {
			return;
		}
		wp_enqueue_style(
			'rip-admin',
			RIP_PLUGIN_URL . 'assets/css/admin.css',
			array(),
			RIP_VERSION
		);
	}

	/**
	 * Add the options page.
	 */
	public function add_menu() {
		add_options_page(
			__( 'Related Image Pickup', 'wp-related-image-pickup' ),
			__( 'Related Image Pickup', 'wp-related-image-pickup' ),
			'manage_options',
			'rip-settings',
			array( $this, 'render_page' )
		);
	}

	/**
	 * Add a Settings link on the plugins list.
	 *
	 * @param array $links Existing links.
	 * @return array
	 */
	public function action_links( $links ) {
		$url  = admin_url( 'options-general.php?page=rip-settings' );
		$link = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'wp-related-image-pickup' ) . '</a>';
		array_unshift( $links, $link );
		return $links;
	}

	/**
	 * Register the settings, sections and fields.
	 */
	public function register_settings() {
		register_setting(
			'rip_settings_group',
			'rip_settings',
			array( $this, 'sanitize' )
		);
	}

	/**
	 * Sanitize the settings payload.
	 *
	 * @param array $input Raw input.
	 * @return array
	 */
	public function sanitize( $input ) {
		$out = array();

		$out['enable_media_library'] = empty( $input['enable_media_library'] ) ? 0 : 1;
		$out['enable_stock']         = empty( $input['enable_stock'] ) ? 0 : 1;
		$out['unsplash_key']         = isset( $input['unsplash_key'] ) ? sanitize_text_field( $input['unsplash_key'] ) : '';
		$out['pexels_key']           = isset( $input['pexels_key'] ) ? sanitize_text_field( $input['pexels_key'] ) : '';
		$out['pixabay_key']          = isset( $input['pixabay_key'] ) ? sanitize_text_field( $input['pixabay_key'] ) : '';

		$per_page                 = isset( $input['results_per_page'] ) ? (int) $input['results_per_page'] : 24;
		$out['results_per_page']  = max( 6, min( 100, $per_page ) );

		$allowed_sizes            = array( 'thumbnail', 'medium', 'large', 'full' );
		$size                     = isset( $input['default_insert_size'] ) ? $input['default_insert_size'] : 'large';
		$out['default_insert_size'] = in_array( $size, $allowed_sizes, true ) ? $size : 'large';

		return $out;
	}

	/**
	 * Render the settings page.
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$s = RIP_Plugin::get_settings();
		?>
		<div class="wrap rip-admin">
			<h1><span class="rip-admin-logo" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="13" height="13" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m16 13-3-3-5 5"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M21 21l-1.2-1.2"/></svg>
			</span><?php esc_html_e( 'WP Related Image Pickup', 'wp-related-image-pickup' ); ?></h1>
			<p class="rip-admin-lede">
				<?php esc_html_e( 'Select a sentence in the Classic editor and find related images to insert. Configure sources and defaults below.', 'wp-related-image-pickup' ); ?>
			</p>

			<form method="post" action="options.php">
				<?php settings_fields( 'rip_settings_group' ); ?>

				<div class="rip-admin-card">
				<h2 class="title"><?php esc_html_e( 'Image sources', 'wp-related-image-pickup' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Media Library', 'wp-related-image-pickup' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="rip_settings[enable_media_library]" value="1" <?php checked( $s['enable_media_library'], 1 ); ?> />
								<?php esc_html_e( 'Search images already in this site\'s Media Library', 'wp-related-image-pickup' ); ?>
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Stock providers', 'wp-related-image-pickup' ); ?></th>
						<td>
							<label>
								<input type="checkbox" name="rip_settings[enable_stock]" value="1" <?php checked( $s['enable_stock'], 1 ); ?> />
								<?php esc_html_e( 'Also search free stock providers and import on insert', 'wp-related-image-pickup' ); ?>
							</label>
							<p class="description">
								<?php esc_html_e( 'Add at least one API key below. Keys are free to obtain from each provider.', 'wp-related-image-pickup' ); ?>
							</p>
						</td>
					</tr>
				</table>
				</div>

				<div class="rip-admin-card">
				<h2 class="title"><?php esc_html_e( 'Stock provider API keys', 'wp-related-image-pickup' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="rip_unsplash"><?php esc_html_e( 'Unsplash Access Key', 'wp-related-image-pickup' ); ?></label></th>
						<td>
							<input type="text" id="rip_unsplash" class="regular-text" name="rip_settings[unsplash_key]" value="<?php echo esc_attr( $s['unsplash_key'] ); ?>" autocomplete="off" />
							<p class="description"><a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Get an Unsplash API key', 'wp-related-image-pickup' ); ?></a></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="rip_pexels"><?php esc_html_e( 'Pexels API Key', 'wp-related-image-pickup' ); ?></label></th>
						<td>
							<input type="text" id="rip_pexels" class="regular-text" name="rip_settings[pexels_key]" value="<?php echo esc_attr( $s['pexels_key'] ); ?>" autocomplete="off" />
							<p class="description"><a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Get a Pexels API key', 'wp-related-image-pickup' ); ?></a></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="rip_pixabay"><?php esc_html_e( 'Pixabay API Key', 'wp-related-image-pickup' ); ?></label></th>
						<td>
							<input type="text" id="rip_pixabay" class="regular-text" name="rip_settings[pixabay_key]" value="<?php echo esc_attr( $s['pixabay_key'] ); ?>" autocomplete="off" />
							<p class="description"><a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Get a Pixabay API key', 'wp-related-image-pickup' ); ?></a></p>
						</td>
					</tr>
				</table>
				</div>

				<div class="rip-admin-card">
				<h2 class="title"><?php esc_html_e( 'Defaults', 'wp-related-image-pickup' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="rip_perpage"><?php esc_html_e( 'Results per page', 'wp-related-image-pickup' ); ?></label></th>
						<td>
							<input type="number" id="rip_perpage" min="6" max="100" step="1" name="rip_settings[results_per_page]" value="<?php echo esc_attr( $s['results_per_page'] ); ?>" />
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="rip_size"><?php esc_html_e( 'Default insert size', 'wp-related-image-pickup' ); ?></label></th>
						<td>
							<select id="rip_size" name="rip_settings[default_insert_size]">
								<?php
								foreach ( array(
									'thumbnail' => __( 'Thumbnail', 'wp-related-image-pickup' ),
									'medium'    => __( 'Medium', 'wp-related-image-pickup' ),
									'large'     => __( 'Large', 'wp-related-image-pickup' ),
									'full'      => __( 'Full size', 'wp-related-image-pickup' ),
								) as $val => $label ) {
									printf(
										'<option value="%s" %s>%s</option>',
										esc_attr( $val ),
										selected( $s['default_insert_size'], $val, false ),
										esc_html( $label )
									);
								}
								?>
							</select>
						</td>
					</tr>
				</table>
				</div>

				<?php submit_button(); ?>
			</form>

			<hr />
			<p class="description">
				<?php
				printf(
					/* translators: %s: developer name */
					esc_html__( 'Developed by %s.', 'wp-related-image-pickup' ),
					'<a href="https://www.elite-airservices.com/" target="_blank" rel="noopener noreferrer">Amir Cohen</a>'
				);
				?>
			</p>
		</div>
		<?php
	}
}
