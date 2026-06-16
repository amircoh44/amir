/**
 * Related Image Pickup — modal UI.
 *
 * Builds the picker modal, talks to the REST API, renders the filterable result
 * grid, and inserts the chosen image(s) into the active TinyMCE editor.
 *
 * Exposes window.RIP.open( { selection, editorId, editor } ).
 *
 * @package WP_Related_Image_Pickup
 */
( function ( $ ) {
	'use strict';

	var cfg = window.RIP_Config || {};
	var i18n = cfg.i18n || {};

	var PREFS_KEY = 'rip_prefs_v1';

	/**
	 * Read remembered user preferences (align, size, link, position, sort…).
	 *
	 * @return {Object}
	 */
	function loadPrefs() {
		try {
			return JSON.parse( window.localStorage.getItem( PREFS_KEY ) ) || {};
		} catch ( e ) {
			return {};
		}
	}

	/**
	 * Merge + persist a patch of preferences.
	 *
	 * @param {Object} patch Keys to store.
	 * @return {Object} The merged prefs.
	 */
	function savePrefs( patch ) {
		var p = $.extend( loadPrefs(), patch || {} );
		try {
			window.localStorage.setItem( PREFS_KEY, JSON.stringify( p ) );
		} catch ( e ) {}
		return p;
	}

	/**
	 * Clamp an auto-place count to a sensible 1–20 range.
	 *
	 * @param {*} v Raw value.
	 * @return {number}
	 */
	function clampCount( v ) {
		return Math.max( 1, Math.min( 20, parseInt( v, 10 ) || 2 ) );
	}

	/**
	 * Clamp an icon pixel size to a sensible 16–256 range.
	 *
	 * @param {*} v Raw value.
	 * @return {number}
	 */
	function clampIconSize( v ) {
		return Math.max( 16, Math.min( 256, parseInt( v, 10 ) || 50 ) );
	}

	// Link-kind colour coding (user-customisable, remembered).
	var LINK_KINDS = [
		[ 'home', 'Homepage', '#ef4444' ],
		[ 'author', 'Author pages', '#f59e0b' ],
		[ 'tag', 'Tag pages', '#10b981' ],
		[ 'category', 'Category pages', '#3b82f6' ],
		[ 'product', 'Products', '#a855f7' ],
		[ 'page', 'Pages', '#6366f1' ],
		[ 'post', 'Posts', '#0ea5e9' ],
		[ 'url', 'Other', '#94a3b8' ]
	];

	/**
	 * Resolve the colour map for link kinds (defaults merged with saved prefs).
	 *
	 * @return {Object}
	 */
	function linkColors() {
		var map = {};
		LINK_KINDS.forEach( function ( k ) {
			map[ k[ 0 ] ] = k[ 2 ];
		} );
		var saved = loadPrefs().linkColors || {};
		Object.keys( saved ).forEach( function ( k ) {
			if ( /^#[0-9a-f]{6}$/i.test( saved[ k ] ) ) {
				map[ k ] = saved[ k ];
			}
		} );
		return map;
	}

	/**
	 * Colour for a given link kind.
	 *
	 * @param {string} kind Link kind.
	 * @return {string}
	 */
	function colorFor( kind ) {
		var map = linkColors();
		return map[ kind ] || map.url;
	}

	/**
	 * Human label for a link kind.
	 *
	 * @param {string} kind Link kind.
	 * @return {string}
	 */
	function kindLabel( kind ) {
		for ( var i = 0; i < LINK_KINDS.length; i++ ) {
			if ( LINK_KINDS[ i ][ 0 ] === kind ) {
				return LINK_KINDS[ i ][ 1 ];
			}
		}
		return kind;
	}

	/**
	 * Build the colour legend (swatches the user can recolour).
	 */
	function buildLegend() {
		var colors = linkColors();
		var html = '<span class="rip-legend-lab">Highlight colours — click a swatch to recolour:</span>';
		LINK_KINDS.forEach( function ( k ) {
			html += '<label class="rip-legend-item" data-kind="' + k[ 0 ] + '">' +
				'<input type="color" class="rip-legend-color" value="' + colors[ k[ 0 ] ] + '" />' +
				'<span>' + esc( k[ 1 ] ) + '</span></label>';
		} );
		$modal.find( '.rip-legend' ).html( html );
	}

	var state = {
		editor: null,
		editorId: '',
		mode: 'images',        // 'images' | 'icons' | 'links'
		tab: 'media',          // 'media' | 'stock'
		page: 1,
		total: 0,
		selected: {},          // id -> item (for multi-select)
		activeId: null,        // id whose details are being edited
		links: [],             // link candidates (links mode)
		linkSel: {},           // url -> link (selected links)
		lastRequest: null
	};

	var $modal = null;

	/**
	 * Escape a string for safe insertion as text/attribute.
	 *
	 * @param {string} str Input.
	 * @return {string}
	 */
	function esc( str ) {
		return $( '<div/>' ).text( str == null ? '' : String( str ) ).html();
	}

	/**
	 * Human-readable file size.
	 *
	 * @param {number} bytes Size in bytes.
	 * @return {string}
	 */
	function humanSize( bytes ) {
		if ( ! bytes ) {
			return '';
		}
		var units = [ 'B', 'KB', 'MB', 'GB' ];
		var i = 0;
		var n = bytes;
		while ( n >= 1024 && i < units.length - 1 ) {
			n /= 1024;
			i++;
		}
		return ( i === 0 ? n : n.toFixed( 1 ) ) + ' ' + units[ i ];
	}

	/**
	 * Tiny inline SVG icon set (16px, stroke = currentColor). Keeps the UI
	 * crisp with zero icon-font dependencies.
	 */
	var ICONS = {
		search: '<path d="M11 11 14.5 14.5"/><circle cx="6.5" cy="6.5" r="4.5"/>',
		orientation: '<rect x="2.5" y="4.5" width="11" height="7" rx="1.2"/><path d="M5.5 4.5v7"/>',
		resolution: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 6h11M6 2.5v11"/>',
		filesize: '<path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5.5z"/><path d="M9 1.5V5.5h4"/>',
		filetype: '<path d="M8.5 1.5h-4A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V6z"/><path d="M8.5 1.5V6H13"/>',
		sort: '<path d="M4 3v10M4 13 2 11M4 13l2-2"/><path d="M9 4h5M9 7h4M9 10h3"/>',
		provider: '<rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><circle cx="6" cy="7" r="1.2"/><path d="m3.5 11 3-2.5 2.2 1.8L11 8l2 2"/>',
		size: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/>',
		align: '<path d="M2.5 3.5h11M2.5 7h7M2.5 10.5h11"/>',
		link: '<path d="M6.5 9.5a2.5 2.5 0 0 0 3.6 0l2-2a2.5 2.5 0 1 0-3.5-3.6l-.6.5"/><path d="M9.5 6.5a2.5 2.5 0 0 0-3.6 0l-2 2A2.5 2.5 0 1 0 7.4 12l.5-.5"/>',
		close: '<path d="M4 4l8 8M12 4l-8 8"/>',
		insert: '<path d="M8 2.5v8M8 10.5 5 7.5M8 10.5l3-3"/><path d="M2.5 11.5v1A1 1 0 0 0 3.5 13.5h9a1 1 0 0 0 1-1v-1"/>',
		position: '<path d="M8 2v12M4.5 5.5 8 2l3.5 3.5M4.5 10.5 8 14l3.5-3.5"/>',
		usage: '<path d="M2.5 13.5h11M4 13.5V9M7.5 13.5V5M11 13.5V7"/>',
		edit: '<path d="M10.5 2.5 13 5 6 12l-3 .5.5-3z"/>',
		magic: '<path d="M5.5 2l.9 2.6L9 5.5l-2.6.9L5.5 9l-.9-2.6L2 5.5l2.6-.9z"/><path d="M11.5 8.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z"/>',
		images: '<rect x="2" y="3" width="12" height="10" rx="1.5"/><circle cx="5.5" cy="6.5" r="1.2"/><path d="m3 12 3.5-3 2.5 2 2-2 2 2.5"/>',
		grid: '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>',
		side: '<rect x="2.5" y="3" width="5" height="10" rx="1"/><path d="M10 5h4M10 8h3M10 11h4"/>',
		refresh: '<path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 2.5V5H10.5"/>',
		ban: '<circle cx="8" cy="8" r="5.5"/><path d="M4.2 4.2l7.6 7.6"/>'
	};

	/**
	 * Wrap an icon path in an <svg>.
	 *
	 * @param {string} name Icon key.
	 * @return {string}
	 */
	function icon( name ) {
		return '<svg class="rip-ic" viewBox="0 0 16 16" width="14" height="14" fill="none" ' +
			'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			( ICONS[ name ] || '' ) + '</svg>';
	}

	/**
	 * Build one labelled select "field" with an icon + tooltip.
	 *
	 * @param {Object} f { ic, label, cls, tip, options:[[val,text]...], extraCls }
	 * @return {string}
	 */
	function field( f ) {
		var opts = ( f.options || [] ).map( function ( o ) {
			return '<option value="' + esc( o[ 0 ] ) + '">' + esc( o[ 1 ] ) + '</option>';
		} ).join( '' );
		return '<label class="rip-field ' + ( f.extraCls || '' ) + '" data-tip="' + esc( f.tip || '' ) + '">' +
			'<span class="rip-field-lab">' + icon( f.ic ) + '<span>' + esc( f.label ) + '</span></span>' +
			'<select class="' + esc( f.cls ) + '">' + opts + '</select>' +
			'</label>';
	}

	/**
	 * Build the modal markup once and cache it.
	 */
	function buildModal() {
		if ( $modal ) {
			return $modal;
		}

		var providerOpts = [ [ '', 'All sources' ] ].concat( ( cfg.providers || [] ).map( function ( p ) {
			return [ p.slug, p.label ];
		} ) );

		var showStock = cfg.enableStock && ( cfg.providers || [] ).length > 0;
		var showMedia = cfg.enableMedia !== false;

		var filters =
			field( { ic: 'orientation', label: 'Orientation', cls: 'rip-f-orientation', tip: 'Filter by image shape', options: [ [ 'any', 'Any' ], [ 'landscape', 'Horizontal' ], [ 'portrait', 'Vertical' ], [ 'square', 'Square' ] ] } ) +
			field( { ic: 'resolution', label: 'Min resolution', cls: 'rip-f-resolution', tip: 'Only images at least this wide/tall', options: [ [ '0', 'Any' ], [ '640', '≥ 640px' ], [ '1280', '≥ 1280px' ], [ '1920', '≥ 1920px · HD' ], [ '3840', '≥ 3840px · 4K' ] ] } ) +
			field( { ic: 'filesize', label: 'Max file size', cls: 'rip-f-maxsize', tip: 'Keep pages light — cap the file weight', options: [ [ '0', 'Any' ], [ '102400', '≤ 100 KB' ], [ '512000', '≤ 500 KB' ], [ '1048576', '≤ 1 MB' ], [ '5242880', '≤ 5 MB' ] ] } ) +
			field( { ic: 'filetype', label: 'File type', cls: 'rip-f-mime', extraCls: 'rip-media-only', tip: 'Limit to a file format', options: [ [ '', 'Any' ], [ 'jpeg', 'JPG' ], [ 'png', 'PNG' ], [ 'webp', 'WebP' ], [ 'gif', 'GIF' ], [ 'svg', 'SVG' ] ] } ) +
			field( { ic: 'usage', label: 'Usage', cls: 'rip-f-usage', extraCls: 'rip-media-only', tip: 'Find images by how often they are already used in posts — e.g. only fresh, never-used ones', options: [ [ 'any', 'Any' ], [ 'unused', 'Never used' ], [ 'used', 'Already used' ] ] } ) +
			field( { ic: 'sort', label: 'Sort by', cls: 'rip-f-orderby', tip: 'Order the results', options: [ [ 'relevance', 'Relevance' ], [ 'date', 'Newest' ], [ 'date_asc', 'Oldest' ], [ 'resolution', 'Highest resolution' ], [ 'size', 'Largest file' ], [ 'size_asc', 'Smallest file' ], [ 'usage_asc', 'Least used' ], [ 'usage', 'Most used' ], [ 'title', 'Title · A–Z' ] ] } ) +
			( showStock ? field( { ic: 'provider', label: 'Source', cls: 'rip-f-provider', extraCls: 'rip-stock-only', tip: 'Pick a stock provider', options: providerOpts } ) : '' );

		var insertOpts =
			field( { ic: 'size', label: 'Size', cls: 'rip-insert-size', tip: 'Inserted image size', options: [ [ 'thumbnail', 'Thumbnail' ], [ 'medium', 'Medium' ], [ 'large', 'Large' ], [ 'full', 'Full' ] ] } ) +
			field( { ic: 'align', label: 'Align', cls: 'rip-insert-align', tip: 'Text alignment around the image (remembered)', options: [ [ 'none', 'None' ], [ 'left', 'Left' ], [ 'center', 'Center' ], [ 'right', 'Right' ] ] } ) +
			field( { ic: 'position', label: 'Position', cls: 'rip-insert-position', tip: 'Where the image lands — at the cursor, or cleanly after/before the current paragraph (remembered)', options: [ [ 'cursor', 'At cursor' ], [ 'after', 'After paragraph' ], [ 'before', 'Before paragraph' ] ] } ) +
			'<label class="rip-field rip-link-toggle" data-tip="Wrap the image in a link to the full-size file">' +
			'<span class="rip-field-lab">' + icon( 'link' ) + '<span>Link full</span></span>' +
			'<span class="rip-switch"><input type="checkbox" class="rip-insert-link" /><span class="rip-switch-track"></span></span>' +
			'</label>' +
			'<label class="rip-field rip-fresh-toggle" data-tip="Auto-place prefers never-used images (then least-used), and varies the pick among the most relevant ones — so it stops reusing the same images.">' +
			'<span class="rip-field-lab">' + icon( 'usage' ) + '<span>Prefer fresh</span></span>' +
			'<span class="rip-switch"><input type="checkbox" class="rip-prefer-fresh" checked /><span class="rip-switch-track"></span></span>' +
			'</label>';

		// Icon-mode controls: which side to float on, and the px size. Icons are
		// never captioned.
		var iconOpts =
			field( { ic: 'side', label: 'Side', cls: 'rip-icon-side', tip: 'Float icons to the left or right of the text (remembered)', options: [ [ 'left', 'Left' ], [ 'right', 'Right' ] ] } ) +
			'<label class="rip-field" data-tip="Icon size in pixels — square (remembered)">' +
			'<span class="rip-field-lab">' + icon( 'size' ) + '<span>Icon size (px)</span></span>' +
			'<input type="number" class="rip-icon-size" min="16" max="256" step="2" value="50" />' +
			'</label>';

		var html =
			'<div class="rip-overlay" role="dialog" aria-modal="true" aria-label="' + esc( i18n.title || 'Related Image Pickup' ) + '">' +
			'  <div class="rip-modal">' +
			'    <header class="rip-head">' +
			'      <h2>' + icon( 'search' ) + '<span>' + esc( i18n.title || 'Related Image Pickup' ) + '</span></h2>' +
			'      <button type="button" class="rip-close" aria-label="Close" data-tip="Close (Esc)">' + icon( 'close' ) + '</button>' +
			'    </header>' +
			'    <nav class="rip-modes">' +
			'      <button type="button" class="rip-mode is-active" data-mode="images" data-tip="Find and place content images">' + icon( 'images' ) + '<span>Images</span></button>' +
			'      <button type="button" class="rip-mode" data-mode="icons" data-tip="Place small icons (filename contains “icon”) by side &amp; size — never captioned">' + icon( 'grid' ) + '<span>Icons</span></button>' +
			'      <button type="button" class="rip-mode" data-mode="links" data-tip="Add internal links from your sitemap (Yoast / Rank Math / core)">' + icon( 'link' ) + '<span>Links</span></button>' +
			'    </nav>' +
			'    <div class="rip-toolbar">' +
			'      <span class="rip-search-ic">' + icon( 'search' ) + '</span>' +
			'      <input type="text" class="rip-keywords" placeholder="' + esc( i18n.searchPH || 'Keywords' ) + '" />' +
			'      <button type="button" class="rip-search-btn" data-tip="Run search (Enter)">Search</button>' +
			'    </div>' +
			'    <div class="rip-filters">' + filters + '</div>' +
			'    <nav class="rip-tabs">' +
			( showMedia ? '      <button type="button" class="rip-tab is-active" data-tab="media">' + esc( i18n.mediaTab || 'Media Library' ) + '</button>' : '' ) +
			( showStock ? '      <button type="button" class="rip-tab' + ( showMedia ? '' : ' is-active' ) + '" data-tab="stock">' + esc( i18n.stockTab || 'Stock Photos' ) + '</button>' : '' ) +
			'    </nav>' +
			'    <div class="rip-legend rip-when-links"></div>' +
			'    <div class="rip-body">' +
			'      <div class="rip-status"></div>' +
			'      <div class="rip-grid"></div>' +
			'    </div>' +
			'    <div class="rip-details" hidden>' +
			'      <div class="rip-details-head">' + icon( 'edit' ) + '<span>Edit details</span></div>' +
			'      <div class="rip-details-grid">' +
			'        <label class="rip-field"><span class="rip-field-lab">Title</span><input type="text" class="rip-edit-title" /></label>' +
			'        <label class="rip-field"><span class="rip-field-lab">Alt text</span><input type="text" class="rip-edit-alt" /></label>' +
			'        <label class="rip-field"><span class="rip-field-lab">Caption</span><input type="text" class="rip-edit-caption" /></label>' +
			'        <label class="rip-field rip-field-wide"><span class="rip-field-lab">Description</span><textarea class="rip-edit-description" rows="2"></textarea></label>' +
			'      </div>' +
			'    </div>' +
			'    <footer class="rip-foot">' +
			'      <div class="rip-insert-opts rip-when-images">' + insertOpts + '</div>' +
			'      <div class="rip-icon-opts rip-when-icons">' + iconOpts + '</div>' +
			'      <div class="rip-link-hint rip-when-links">' + icon( 'link' ) + '<span>Pick targets below, then add links into matching words in your article.</span></div>' +
			'      <div class="rip-foot-actions">' +
			'        <span class="rip-selcount"></span>' +
			'        <span class="rip-auto rip-when-images" data-tip="Type how many images to scatter (1–20), then click. They land at well-spaced spots — after a paragraph or before a heading, never mid-sentence, kept clear of other images.">' +
			'          <input type="number" class="rip-auto-count" min="1" max="20" step="1" value="2" aria-label="Number of images to scatter (1-20)" />' +
			'          <button type="button" class="rip-auto-btn">' + icon( 'magic' ) + '<span>Auto-place</span></button>' +
			'        </span>' +
			'        <button type="button" class="rip-scatter-sel rip-when-images" disabled data-tip="Scatter the images you ticked across the article, matched to related text (kept clear of other images, never mid-sentence)">' + icon( 'magic' ) + '<span>Scatter selected</span></button>' +
			'        <button type="button" class="rip-spread-icons rip-when-icons" data-tip="Place every icon next to text that matches its name (e.g. a contact icon by “contact us”), and strip any captions from icons.">' + icon( 'magic' ) + '<span>Spread by name</span></button>' +
			'        <button type="button" class="rip-links-rescan rip-when-links" data-tip="Re-read the sitemap, bypassing the cache">' + icon( 'refresh' ) + '<span>Re-scan</span></button>' +
			'        <button type="button" class="rip-links-sel rip-when-links" disabled data-tip="Add only the links you ticked">' + icon( 'link' ) + '<span>Add selected</span></button>' +
			'        <button type="button" class="rip-links-all rip-when-links" data-tip="Add every relevant link found">' + icon( 'link' ) + '<span>Add all relevant</span></button>' +
			'        <button type="button" class="rip-insert-btn rip-when-images rip-when-icons" disabled>' + icon( 'insert' ) + '<span>' + esc( i18n.insert || 'Insert' ) + '</span></button>' +
			'      </div>' +
			'    </footer>' +
			'  </div>' +
			'</div>';

		$modal = $( html );
		$( 'body' ).append( $modal );

		// Restore remembered preferences (falling back to site defaults).
		var p = loadPrefs();
		$modal.find( '.rip-insert-size' ).val( p.size || cfg.defaultSize || 'large' );
		$modal.find( '.rip-insert-align' ).val( p.align || 'none' );
		$modal.find( '.rip-insert-position' ).val( p.position || 'cursor' );
		$modal.find( '.rip-insert-link' ).prop( 'checked', !! p.link );
		$modal.find( '.rip-prefer-fresh' ).prop( 'checked', p.preferFresh !== false );
		if ( p.orderby ) {
			$modal.find( '.rip-f-orderby' ).val( p.orderby );
		}
		if ( p.orientation ) {
			$modal.find( '.rip-f-orientation' ).val( p.orientation );
		}
		if ( p.usage ) {
			$modal.find( '.rip-f-usage' ).val( p.usage );
		}
		$modal.find( '.rip-auto-count' ).val( clampCount( p.autoCount || 2 ) );
		$modal.find( '.rip-icon-side' ).val( p.iconSide || 'left' );
		$modal.find( '.rip-icon-size' ).val( clampIconSize( p.iconSize || 50 ) );

		$modal.find( '.rip-modal' ).addClass( 'rip-mode-images' );

		bindEvents();
		return $modal;
	}

	/**
	 * Wire up all modal event handlers.
	 */
	function bindEvents() {
		$modal.on( 'click', '.rip-close, .rip-overlay', function ( e ) {
			if ( e.target === this ) {
				close();
			}
		} );

		$( document ).on( 'keydown.rip', function ( e ) {
			if ( e.key === 'Escape' && $modal && $modal.is( ':visible' ) ) {
				close();
			}
		} );

		$modal.find( '.rip-search-btn' ).on( 'click', function () {
			state.page = 1;
			runSearch();
		} );

		$modal.find( '.rip-keywords' ).on( 'keydown', function ( e ) {
			if ( e.key === 'Enter' ) {
				e.preventDefault();
				state.page = 1;
				runSearch();
			}
		} );

		$modal.find( '.rip-filters select' ).on( 'change', function () {
			savePrefs( {
				orderby: $modal.find( '.rip-f-orderby' ).val(),
				orientation: $modal.find( '.rip-f-orientation' ).val(),
				usage: $modal.find( '.rip-f-usage' ).val()
			} );
			state.page = 1;
			runSearch();
		} );

		// Remember insert preferences as they change.
		$modal.find( '.rip-insert-size, .rip-insert-align, .rip-insert-position' ).on( 'change', function () {
			savePrefs( {
				size: $modal.find( '.rip-insert-size' ).val(),
				align: $modal.find( '.rip-insert-align' ).val(),
				position: $modal.find( '.rip-insert-position' ).val()
			} );
		} );
		$modal.find( '.rip-insert-link' ).on( 'change', function () {
			savePrefs( { link: $( this ).is( ':checked' ) } );
		} );
		$modal.find( '.rip-prefer-fresh' ).on( 'change', function () {
			savePrefs( { preferFresh: $( this ).is( ':checked' ) } );
		} );

		// Live-edit of the selected image's metadata.
		$modal.on( 'input', '.rip-edit-title, .rip-edit-alt, .rip-edit-caption, .rip-edit-description', function () {
			if ( ! state.activeId || ! state.selected[ state.activeId ] ) {
				return;
			}
			state.selected[ state.activeId ].edits = {
				title: $modal.find( '.rip-edit-title' ).val(),
				alt: $modal.find( '.rip-edit-alt' ).val(),
				caption: $modal.find( '.rip-edit-caption' ).val(),
				description: $modal.find( '.rip-edit-description' ).val()
			};
		} );

		$modal.find( '.rip-auto-count' ).on( 'change', function () {
			var v = clampCount( $( this ).val() );
			$( this ).val( v );
			savePrefs( { autoCount: v } );
		} );

		$modal.find( '.rip-auto-btn' ).on( 'click', function () {
			autoIllustrate( clampCount( $modal.find( '.rip-auto-count' ).val() ) );
		} );

		$modal.find( '.rip-scatter-sel' ).on( 'click', scatterSelected );

		// Mode switching (Images / Icons / Links).
		$modal.find( '.rip-mode' ).on( 'click', function () {
			setMode( $( this ).data( 'mode' ) );
		} );

		// Icon controls remember their values.
		$modal.find( '.rip-icon-side' ).on( 'change', function () {
			savePrefs( { iconSide: $( this ).val() } );
		} );
		$modal.find( '.rip-icon-size' ).on( 'change', function () {
			var v = clampIconSize( $( this ).val() );
			$( this ).val( v );
			savePrefs( { iconSize: v } );
		} );

		$modal.find( '.rip-spread-icons' ).on( 'click', spreadIconsByName );
		$modal.find( '.rip-links-all' ).on( 'click', function () {
			applyLinks( false );
		} );
		$modal.find( '.rip-links-sel' ).on( 'click', function () {
			applyLinks( true );
		} );
		$modal.find( '.rip-links-rescan' ).on( 'click', function () {
			fetchLinks( true );
		} );

		// Recolour a link kind (remembered) and re-paint the list live.
		$modal.on( 'input change', '.rip-legend-color', function () {
			var kind = $( this ).closest( '.rip-legend-item' ).data( 'kind' );
			var val = $( this ).val();
			var prefs = loadPrefs();
			prefs.linkColors = prefs.linkColors || {};
			prefs.linkColors[ kind ] = val;
			savePrefs( { linkColors: prefs.linkColors } );
			renderLinks( state.links );
		} );

		// Block a page (stop it ever being suggested/linked).
		$modal.on( 'click', '.rip-link-block', function ( e ) {
			e.stopPropagation();
			blockLink( $( this ).closest( '.rip-link-row' ) );
		} );

		// Toggle a link target in the candidate list.
		$modal.on( 'click', '.rip-link-row', function () {
			toggleLink( $( this ) );
		} );

		$modal.find( '.rip-tab' ).on( 'click', function () {
			$modal.find( '.rip-tab' ).removeClass( 'is-active' );
			$( this ).addClass( 'is-active' );
			state.tab = $( this ).data( 'tab' );
			state.page = 1;
			$modal.toggleClass( 'rip-is-stock', state.tab === 'stock' );
			runSearch();
		} );

		$modal.on( 'click', '.rip-card', function () {
			toggleSelect( $( this ) );
		} );

		$modal.find( '.rip-insert-btn' ).on( 'click', doInsert );

		$modal.on( 'click', '.rip-page-btn', function () {
			state.page = parseInt( $( this ).data( 'page' ), 10 ) || 1;
			runSearch( true );
		} );
	}

	/**
	 * Collect the current filter values into a query object.
	 *
	 * @return {Object}
	 */
	function currentFilters() {
		var minRes = parseInt( $modal.find( '.rip-f-resolution' ).val(), 10 ) || 0;
		return {
			keywords: $modal.find( '.rip-keywords' ).val(),
			orientation: $modal.find( '.rip-f-orientation' ).val(),
			min_width: minRes,
			min_height: minRes,
			max_size: parseInt( $modal.find( '.rip-f-maxsize' ).val(), 10 ) || 0,
			mime: $modal.find( '.rip-f-mime' ).val(),
			usage: $modal.find( '.rip-f-usage' ).val() || 'any',
			icons: 'icons' === state.mode ? 'only' : 'exclude',
			orderby: $modal.find( '.rip-f-orderby' ).val(),
			provider: $modal.find( '.rip-f-provider' ).val() || '',
			page: state.page,
			per_page: 'icons' === state.mode ? 100 : ( cfg.perPage || 24 )
		};
	}

	/**
	 * Run a search against the active tab's endpoint.
	 *
	 * @param {boolean} keepSelection Keep current selection across pagination.
	 */
	function runSearch( keepSelection ) {
		if ( ! keepSelection ) {
			state.selected = {};
			updateSelCount();
		}

		// Remember the last image search so reopening restores it.
		if ( 'images' === state.mode ) {
			savePrefs( { lastKeywords: $modal.find( '.rip-keywords' ).val() || '' } );
		}

		var filters = currentFilters();
		var endpoint = state.tab === 'stock' ? '/stock' : '/search';

		setStatus( i18n.searching || 'Searching…' );
		$modal.find( '.rip-grid' ).empty();

		if ( state.lastRequest ) {
			state.lastRequest.abort();
		}

		state.lastRequest = $.ajax( {
			url: cfg.restUrl + endpoint,
			method: 'GET',
			data: filters,
			beforeSend: function ( xhr ) {
				xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
			}
		} ).done( function ( res ) {
			renderResults( res );
		} ).fail( function ( xhr, textStatus ) {
			if ( textStatus === 'abort' ) {
				return;
			}
			setStatus( 'Error: ' + ( xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : textStatus ) );
		} );
	}

	/**
	 * Apply a mode's visual state (active pill + modal class) and remember it.
	 *
	 * @param {string} mode 'images' | 'icons' | 'links'.
	 */
	function applyModeClass( mode ) {
		state.mode = mode;
		$modal.find( '.rip-mode' ).removeClass( 'is-active' );
		$modal.find( '.rip-mode[data-mode="' + mode + '"]' ).addClass( 'is-active' );
		$modal.find( '.rip-modal' )
			.removeClass( 'rip-mode-images rip-mode-icons rip-mode-links' )
			.addClass( 'rip-mode-' + mode );
		savePrefs( { lastMode: mode } );
	}

	/**
	 * Switch between Images / Icons / Links modes.
	 *
	 * @param {string} mode Target mode.
	 */
	function setMode( mode ) {
		if ( ! mode || mode === state.mode ) {
			return;
		}
		state.selected = {};
		state.activeId = null;
		state.linkSel = {};
		state.page = 1;
		hideDetails();
		updateSelCount();

		applyModeClass( mode );

		$modal.find( '.rip-grid' ).empty();
		$modal.find( '.rip-pagination' ).remove();
		setStatus( '' );

		if ( 'links' === mode ) {
			buildLegend();
			fetchLinks();
			return;
		}

		// Images / Icons are Media-Library only.
		state.tab = 'media';
		$modal.find( '.rip-tab' ).removeClass( 'is-active' );
		$modal.find( '.rip-tab[data-tab="media"]' ).addClass( 'is-active' );
		$modal.toggleClass( 'rip-is-stock', false );

		if ( 'icons' === mode ) {
			runSearch();
		} else if ( ( $modal.find( '.rip-keywords' ).val() || '' ).trim() ) {
			runSearch();
		} else {
			setStatus( i18n.noSelection || 'Select a sentence first, then click the button.' );
		}
	}

	/**
	 * Render the result grid + pagination.
	 *
	 * @param {Object} res REST response.
	 */
	function renderResults( res ) {
		var items = ( res && res.items ) || [];
		state.total = ( res && res.total ) || items.length;

		if ( res && res.disabled ) {
			setStatus( state.tab === 'stock' ?
				'Stock providers are disabled. Enable them in Settings → Related Image Pickup.' :
				'Media Library source is disabled in Settings.' );
			return;
		}

		if ( ! items.length ) {
			setStatus( i18n.noResults || 'No matching images found.' );
			return;
		}

		setStatus( '' );

		var $grid = $modal.find( '.rip-grid' ).empty();
		items.forEach( function ( item ) {
			$grid.append( renderCard( item ) );
		} );

		renderPagination();
		// Re-apply selection highlight on the current page.
		Object.keys( state.selected ).forEach( function ( id ) {
			$grid.find( '.rip-card[data-id="' + id + '"]' ).addClass( 'is-selected' );
		} );
	}

	/**
	 * Render a single result card.
	 *
	 * @param {Object} item Result item.
	 * @return {jQuery}
	 */
	function renderCard( item ) {
		var dims = ( item.width && item.height ) ? item.width + '×' + item.height : '';
		var orient = item.orientation && item.orientation !== 'unknown' ? item.orientation : '';
		var meta = [ dims, orient, humanSize( item.filesize ) ].filter( Boolean ).join( ' · ' );
		var credit = item.author ? 'by ' + esc( item.author ) : '';
		var badge = item.source && item.source !== 'media_library' ? '<span class="rip-badge">' + esc( item.source ) + '</span>' : '';

		// Usage chip (Media Library items only): how many posts already use it.
		var usage = '';
		if ( 'media_library' === item.source || 'number' === typeof item.usage ) {
			usage = item.usage > 0 ?
				'<span class="rip-use rip-use-on" data-tip="Used in ' + item.usage + ' post(s)">Used ' + item.usage + '×</span>' :
				'<span class="rip-use rip-use-off" data-tip="Not used in any post yet">Never used</span>';
		}

		var $card = $(
			'<figure class="rip-card" data-id="' + esc( item.id ) + '" tabindex="0">' +
			'  <div class="rip-thumb-wrap">' + badge + usage +
			'    <img src="' + esc( item.thumb || item.url ) + '" alt="' + esc( item.alt || item.title ) + '" loading="lazy" />' +
			'    <span class="rip-check">✓</span>' +
			'  </div>' +
			'  <figcaption>' +
			'    <span class="rip-card-title">' + esc( item.title || item.filename || '(untitled)' ) + '</span>' +
			'    <span class="rip-card-meta">' + esc( meta ) + '</span>' +
			( credit ? '    <span class="rip-card-credit">' + credit + '</span>' : '' ) +
			'  </figcaption>' +
			'</figure>'
		);
		$card.data( 'item', item );
		return $card;
	}

	/**
	 * Render pagination controls based on total / per_page.
	 */
	function renderPagination() {
		var perPage = cfg.perPage || 24;
		var pages = Math.ceil( state.total / perPage );
		if ( pages <= 1 ) {
			return;
		}

		var maxButtons = 7;
		var start = Math.max( 1, state.page - 3 );
		var end = Math.min( pages, start + maxButtons - 1 );
		start = Math.max( 1, end - maxButtons + 1 );

		var html = '<nav class="rip-pagination">';
		if ( state.page > 1 ) {
			html += '<button type="button" class="rip-page-btn" data-page="' + ( state.page - 1 ) + '">‹</button>';
		}
		for ( var p = start; p <= end; p++ ) {
			html += '<button type="button" class="rip-page-btn' + ( p === state.page ? ' is-active' : '' ) + '" data-page="' + p + '">' + p + '</button>';
		}
		if ( state.page < pages ) {
			html += '<button type="button" class="rip-page-btn" data-page="' + ( state.page + 1 ) + '">›</button>';
		}
		html += '</nav>';

		$modal.find( '.rip-grid' ).after( html );
		// Remove any stale pagination (keep only the last one).
		var $pags = $modal.find( '.rip-pagination' );
		if ( $pags.length > 1 ) {
			$pags.slice( 0, $pags.length - 1 ).remove();
		}
	}

	/**
	 * Toggle selection of a card (multi-select supported).
	 *
	 * @param {jQuery} $card Card element.
	 */
	function toggleSelect( $card ) {
		var item = $card.data( 'item' );
		var id = String( item.id );

		if ( state.selected[ id ] ) {
			delete state.selected[ id ];
			$card.removeClass( 'is-selected' );
			if ( state.activeId === id ) {
				var remaining = Object.keys( state.selected );
				state.activeId = remaining.length ? remaining[ remaining.length - 1 ] : null;
				if ( state.activeId ) {
					showDetails( state.selected[ state.activeId ] );
				} else {
					hideDetails();
				}
			}
		} else {
			state.selected[ id ] = item;
			$card.addClass( 'is-selected' );
			state.activeId = id;
			showDetails( item );
		}

		refreshActiveCard();
		updateSelCount();
	}

	/**
	 * Highlight the card whose details are currently being edited.
	 */
	function refreshActiveCard() {
		$modal.find( '.rip-card' ).removeClass( 'is-active' );
		if ( state.activeId ) {
			$modal.find( '.rip-card[data-id="' + state.activeId + '"]' ).addClass( 'is-active' );
		}
	}

	/**
	 * Populate + show the editable details panel for an item.
	 *
	 * @param {Object} item Selected item.
	 */
	function showDetails( item ) {
		var e = item.edits || {};
		$modal.find( '.rip-edit-title' ).val( e.title != null ? e.title : ( item.title || '' ) );
		$modal.find( '.rip-edit-alt' ).val( e.alt != null ? e.alt : ( item.alt || '' ) );
		$modal.find( '.rip-edit-caption' ).val( e.caption != null ? e.caption : ( item.caption || '' ) );
		$modal.find( '.rip-edit-description' ).val( e.description != null ? e.description : ( item.description || '' ) );
		$modal.find( '.rip-details-head span' ).text( 'Edit details — ' + ( item.title || item.filename || 'image' ) );
		$modal.find( '.rip-details' ).prop( 'hidden', false );
	}

	/**
	 * Hide the editable details panel.
	 */
	function hideDetails() {
		$modal.find( '.rip-details' ).prop( 'hidden', true );
	}

	/**
	 * Update the selected-count label + insert button state.
	 */
	function updateSelCount() {
		var n = Object.keys( state.selected ).length;
		$modal.find( '.rip-selcount' ).text( n ? n + ' selected' : '' );
		$modal.find( '.rip-insert-btn' ).prop( 'disabled', n === 0 );
		$modal.find( '.rip-scatter-sel' ).prop( 'disabled', n === 0 );
	}

	/**
	 * Insert all selected images into the editor (importing stock first).
	 */
	function doInsert() {
		var items = Object.keys( state.selected ).map( function ( id ) {
			return state.selected[ id ];
		} );
		if ( ! items.length ) {
			return;
		}

		// Icon mode: insert bare, captionless, sized + floated icons.
		if ( 'icons' === state.mode ) {
			items.forEach( function ( item ) {
				insertIcon( item );
			} );
			if ( state.editor && ! state.editor.isHidden() ) {
				unwrapIconCaptions( state.editor );
			}
			close();
			return;
		}

		var $btn = $modal.find( '.rip-insert-btn' ).prop( 'disabled', true );
		var $label = $btn.find( 'span' );

		// Resolve each item to a local URL (import stock items), preserving order.
		var chain = $.Deferred().resolve().promise();
		var resolved = [];

		items.forEach( function ( item ) {
			chain = chain.then( function () {
				var e = item.edits || {};

				if ( item.source && item.source !== 'media_library' ) {
					$label.text( i18n.importing || 'Importing…' );
					return importStock( item, e ).then( function ( data ) {
						resolved.push( {
							url: data.sized || data.url,
							full: data.url,
							alt: e.alt != null ? e.alt : ( data.alt || item.alt || item.title ),
							caption: e.caption != null ? e.caption : ( item.title || '' )
						} );
					} );
				}

				var sizeChoice = $modal.find( '.rip-insert-size' ).val();
				var sized = ( item.sizes && item.sizes[ sizeChoice ] ) ? item.sizes[ sizeChoice ].url : item.url;
				resolved.push( {
					url: sized,
					full: item.url,
					alt: e.alt != null ? e.alt : ( item.alt || item.title ),
					caption: e.caption != null ? e.caption : ( item.caption || '' )
				} );

				// Persist any edited metadata back onto the attachment.
				if ( item.edits ) {
					updateMeta( item.id, e );
				}
				return null;
			} );
		} );

		chain.then( function () {
			resolved.forEach( insertImageHtml );
			close();
		} ).always( function () {
			$btn.prop( 'disabled', false );
			$label.text( i18n.insert || 'Insert' );
		} ).fail( function ( xhr ) {
			setStatus( 'Import failed: ' + ( xhr && xhr.responseJSON ? xhr.responseJSON.message : 'unknown error' ) );
		} );
	}

	/**
	 * Import a stock image into the Media Library via REST.
	 *
	 * @param {Object} item Stock item.
	 * @param {Object} e    Edited metadata overrides.
	 * @return {Promise}
	 */
	function importStock( item, e ) {
		e = e || {};
		return $.ajax( {
			url: cfg.restUrl + '/import',
			method: 'POST',
			data: {
				url: item.download || item.url,
				title: e.title != null ? e.title : ( item.title || '' ),
				alt: e.alt != null ? e.alt : ( item.alt || item.title || '' ),
				caption: e.caption != null ? e.caption : ( item.title || '' ),
				description: e.description || '',
				post_id: cfg.postId || 0
			},
			beforeSend: function ( xhr ) {
				xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
			}
		} );
	}

	/**
	 * Persist edited title/alt/caption/description onto a Media Library item.
	 *
	 * @param {number} id Attachment ID.
	 * @param {Object} e  Edited fields.
	 * @return {Promise}
	 */
	function updateMeta( id, e ) {
		return $.ajax( {
			url: cfg.restUrl + '/update-meta',
			method: 'POST',
			data: {
				id: id,
				title: e.title || '',
				alt: e.alt || '',
				caption: e.caption || '',
				description: e.description || ''
			},
			beforeSend: function ( xhr ) {
				xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
			}
		} );
	}

	/**
	 * Build the <img> (optionally wrapped in caption/link) and insert at cursor.
	 *
	 * @param {Object} r Resolved image data.
	 */
	function insertImageHtml( r ) {
		var align = $modal.find( '.rip-insert-align' ).val();
		var linkFull = $modal.find( '.rip-insert-link' ).is( ':checked' );
		var position = $modal.find( '.rip-insert-position' ).val();
		var alignClass = align && align !== 'none' ? ' align' + align : '';

		var img = '<img src="' + esc( r.url ) + '" alt="' + esc( r.alt ) + '" class="rip-image' + alignClass + '" />';
		if ( linkFull ) {
			img = '<a href="' + esc( r.full ) + '">' + img + '</a>';
		}

		var html = img;
		if ( r.caption ) {
			html = '<figure class="wp-caption' + alignClass + '">' + img + '<figcaption class="wp-caption-text">' + esc( r.caption ) + '</figcaption></figure>';
		}

		if ( state.editor && ! state.editor.isHidden() ) {
			if ( 'cursor' === position || ! placeAtParagraph( state.editor, html, position ) ) {
				state.editor.insertContent( html );
			}
		} else {
			// Fallback: text-mode textarea (always at cursor).
			var $ta = $( '#' + state.editorId );
			if ( $ta.length ) {
				var el = $ta.get( 0 );
				var pos = el.selectionStart || el.value.length;
				el.value = el.value.slice( 0, pos ) + html + el.value.slice( pos );
			}
		}
	}

	/**
	 * Find the top-level block element containing the current selection.
	 *
	 * @param {Object} editor TinyMCE editor.
	 * @return {Element|null}
	 */
	function currentBlock( editor ) {
		var body = editor.getBody();
		var node = editor.selection ? editor.selection.getNode() : null;
		while ( node && node.parentNode && node.parentNode !== body ) {
			node = node.parentNode;
		}
		return ( node && node.parentNode === body ) ? node : null;
	}

	/**
	 * Insert HTML cleanly before/after the current paragraph block — never in
	 * the middle of a sentence.
	 *
	 * @param {Object} editor TinyMCE editor.
	 * @param {string} html   HTML to insert.
	 * @param {string} where  'before' | 'after'.
	 * @return {boolean} True if placed, false to fall back to cursor insert.
	 */
	function placeAtParagraph( editor, html, where ) {
		var block = currentBlock( editor );
		if ( ! block ) {
			return false;
		}
		insertNodeAt( editor, block, where, html );
		editor.nodeChanged();
		if ( editor.undoManager ) {
			editor.undoManager.add();
		}
		editor.save();
		return true;
	}

	/**
	 * Insert an HTML fragment before or after a reference block node.
	 *
	 * @param {Object}  editor TinyMCE editor.
	 * @param {Element} node   Reference block.
	 * @param {string}  where  'before' | 'after'.
	 * @param {string}  html   HTML fragment.
	 */
	function insertNodeAt( editor, node, where, html ) {
		var doc = editor.getDoc();
		var temp = doc.createElement( 'div' );
		temp.innerHTML = html;
		var ref = ( 'before' === where ) ? node : node.nextSibling;
		while ( temp.firstChild ) {
			node.parentNode.insertBefore( temp.firstChild, ref );
		}
	}

	/**
	 * Whether a block already contains (or is) an image.
	 *
	 * @param {Element} el Block element.
	 * @return {boolean}
	 */
	function blockHasImage( el ) {
		if ( ! el ) {
			return false;
		}
		if ( 'IMG' === el.nodeName || 'FIGURE' === el.nodeName ) {
			return true;
		}
		return !! ( el.querySelector && el.querySelector( 'img' ) );
	}

	/**
	 * Pick `count` slots spread evenly across the document (so the auto-placed
	 * images are distributed, not clustered).
	 *
	 * @param {Array}  slots Candidate slots (each has .index).
	 * @param {number} count How many to pick.
	 * @return {Array}
	 */
	function pickSpaced( slots, count ) {
		slots = slots.slice().sort( function ( a, b ) {
			return a.index - b.index;
		} );
		if ( slots.length <= count ) {
			return slots;
		}
		var chosen = [];
		for ( var k = 0; k < count; k++ ) {
			var idx = Math.floor( ( ( k + 0.5 ) / count ) * slots.length );
			if ( chosen.indexOf( slots[ idx ] ) === -1 ) {
				chosen.push( slots[ idx ] );
			}
		}
		return chosen;
	}

	/**
	 * Gather contextual text near a block (for keyword extraction).
	 *
	 * @param {Array}  blocks All blocks.
	 * @param {number} i      Index.
	 * @return {string}
	 */
	function nearestText( blocks, i ) {
		for ( var d = 0; d < 4; d++ ) {
			var a = blocks[ i + d ];
			var b = blocks[ i - d ];
			if ( a && ( a.textContent || '' ).trim().length > 40 ) {
				return a.textContent;
			}
			if ( b && ( b.textContent || '' ).trim().length > 40 ) {
				return b.textContent;
			}
		}
		return blocks[ i ] ? ( blocks[ i ].textContent || '' ) : '';
	}

	/**
	 * Find one Media Library image relevant to a chunk of text. Prefers
	 * never-used images (then least-used) and varies the pick among the most
	 * relevant candidates, skipping anything already chosen this run.
	 *
	 * @param {string} text Context text.
	 * @param {Object} used Map of already-used ids.
	 * @return {Promise<Object|null>}
	 */
	function findImageFor( text, used ) {
		var preferFresh = $modal.find( '.rip-prefer-fresh' ).is( ':checked' );
		return $.ajax( {
			url: cfg.restUrl + '/search',
			method: 'GET',
			data: {
				text: text,
				orientation: $modal.find( '.rip-f-orientation' ).val(),
				// Keep results relevance-ranked; freshness is applied while
				// choosing, so picks stay on-topic AND avoid reused images.
				orderby: 'relevance',
				per_page: 30,
				page: 1
			},
			beforeSend: function ( xhr ) {
				xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
			}
		} ).then( function ( res ) {
			return chooseImage( ( res && res.items ) || [], used, preferFresh );
		} );
	}

	/**
	 * Choose one image from a candidate pool: prefer never-used (then the
	 * least-used tier), then pick at random among the strongest few for variety.
	 *
	 * @param {Array}   list        Candidate items.
	 * @param {Object}  used        Already-used ids this run.
	 * @param {boolean} preferFresh Prefer unused / least-used images.
	 * @return {Object|null}
	 */
	function chooseImage( list, used, preferFresh ) {
		var avail = list.filter( function ( it ) {
			return ! used[ it.id ];
		} );
		if ( ! avail.length ) {
			return null;
		}

		var pool = avail;
		if ( preferFresh ) {
			var fresh = avail.filter( function ( it ) {
				return ( it.usage || 0 ) === 0;
			} );
			if ( fresh.length ) {
				pool = fresh;
			} else {
				// No never-used left → fall back to the least-used tier.
				var min = avail.reduce( function ( m, it ) {
					return Math.min( m, it.usage || 0 );
				}, Infinity );
				pool = avail.filter( function ( it ) {
					return ( it.usage || 0 ) === min;
				} );
			}
		}

		// Variety: random pick among the strongest few candidates (keeps it
		// relevant while avoiding the same image every time).
		var top = pool.slice( 0, 8 );
		return top[ Math.floor( Math.random() * top.length ) ];
	}

	/**
	 * Collect well-spaced insertion slots from the article: paragraph ends and
	 * headings, kept clear of existing images, never mid-sentence.
	 *
	 * @param {number} minGap Minimum block distance from any existing image.
	 * @return {Array} Slots: { index, node, where, text }.
	 */
	function articleSlots( minGap ) {
		var editor = state.editor;
		if ( ! editor || editor.isHidden() ) {
			return [];
		}
		var blocks = Array.prototype.slice.call( editor.getBody().children );
		var occupied = [];
		blocks.forEach( function ( b, i ) {
			if ( blockHasImage( b ) ) {
				occupied.push( i );
			}
		} );

		var slots = [];
		blocks.forEach( function ( b, i ) {
			var isHeading = /^H[1-6]$/.test( b.nodeName );
			var text = ( b.textContent || '' ).trim();
			var isPara = 'P' === b.nodeName && text.length >= 40;
			if ( ! isHeading && ! isPara ) {
				return;
			}
			var tooClose = occupied.some( function ( oi ) {
				return Math.abs( oi - i ) < minGap;
			} );
			if ( tooClose ) {
				return;
			}
			slots.push( {
				index: i,
				node: b,
				where: isHeading ? 'before' : 'after',
				text: isHeading ? ( text + ' ' + nearestText( blocks, i ) ) : text
			} );
		} );
		return slots;
	}

	/**
	 * Auto-place N related images at well-spaced block boundaries — after a
	 * paragraph or before a heading, never mid-sentence, kept clear of any
	 * existing images.
	 *
	 * @param {number} count How many images to place.
	 */
	function autoIllustrate( count ) {
		var editor = state.editor;
		if ( ! editor || editor.isHidden() ) {
			setStatus( 'Auto-place needs the Visual editor — switch from Text to Visual and try again.' );
			return;
		}

		var slots = articleSlots( 2 );
		if ( ! slots.length ) {
			setStatus( 'No well-spaced spots found — need paragraphs/headings set apart from existing images.' );
			return;
		}

		var chosen = pickSpaced( slots, count );
		var $btn = $modal.find( '.rip-auto-btn' ).prop( 'disabled', true );
		$btn.find( 'span' ).text( 'Placing…' );

		var used = {};
		var align = $modal.find( '.rip-insert-align' ).val();
		var size = $modal.find( '.rip-insert-size' ).val();
		var alignClass = align && align !== 'none' ? ' align' + align : '';
		var placed = 0;

		// Insert from the bottom up so earlier DOM indices stay valid.
		chosen.sort( function ( a, b ) {
			return b.index - a.index;
		} );

		var chain = $.Deferred().resolve().promise();
		chosen.forEach( function ( slot ) {
			chain = chain.then( function () {
				return findImageFor( slot.text, used ).then( function ( item ) {
					if ( ! item ) {
						return;
					}
					used[ item.id ] = true;
					var sized = ( item.sizes && item.sizes[ size ] ) ? item.sizes[ size ].url : item.url;
					var alt = item.alt || item.title || '';
					var cap = item.caption || '';
					var fig = '<figure class="wp-caption' + alignClass + '">' +
						'<img src="' + esc( sized ) + '" alt="' + esc( alt ) + '" class="rip-image' + alignClass + '" />' +
						( cap ? '<figcaption class="wp-caption-text">' + esc( cap ) + '</figcaption>' : '' ) +
						'</figure>';
					insertNodeAt( editor, slot.node, slot.where, fig );
					placed++;
				} );
			} );
		} );

		chain.always( function () {
			editor.nodeChanged();
			if ( editor.undoManager ) {
				editor.undoManager.add();
			}
			editor.save();
			$btn.prop( 'disabled', false ).find( 'span' ).text( 'Auto-place' );
			if ( placed ) {
				close();
			} else {
				setStatus( 'No related images found in the Media Library for the surrounding text.' );
			}
		} );
	}

	/**
	 * Tiny stop-word set for client-side image keyword extraction.
	 */
	var STOP = { the: 1, and: 1, for: 1, with: 1, from: 1, that: 1, this: 1, your: 1, our: 1, are: 1, was: 1, has: 1, you: 1, all: 1, can: 1, how: 1, why: 1, who: 1, new: 1, get: 1, img: 1, image: 1, photo: 1, jpg: 1, jpeg: 1, png: 1, webp: 1, scaled: 1, copy: 1, final: 1 };

	/**
	 * Derive keywords for an image from its alt, title and filename.
	 *
	 * @param {Object} item Image item.
	 * @return {string[]}
	 */
	function imageKeywords( item ) {
		var text = ( ( item.alt || '' ) + ' ' + ( item.title || '' ) + ' ' + ( item.filename || '' ) ).toLowerCase();
		text = text.replace( /\.[a-z0-9]+$/, ' ' ).replace( /[^a-z0-9]+/g, ' ' );
		var out = [];
		text.split( /\s+/ ).forEach( function ( w ) {
			if ( w.length >= 3 && ! STOP[ w ] && ! /^\d+$/.test( w ) && out.indexOf( w ) === -1 ) {
				out.push( w );
			}
		} );
		return out;
	}

	/**
	 * Build a figure for a scattered/auto-placed content image (caption kept if
	 * present), honouring the current size + alignment.
	 *
	 * @param {Object} item Image item.
	 * @return {string}
	 */
	function contentFigure( item ) {
		var align = $modal.find( '.rip-insert-align' ).val();
		var size = $modal.find( '.rip-insert-size' ).val();
		var alignClass = align && align !== 'none' ? ' align' + align : '';
		var sized = ( item.sizes && item.sizes[ size ] ) ? item.sizes[ size ].url : item.url;
		var alt = item.alt || item.title || '';
		var cap = item.caption || '';
		return '<figure class="wp-caption' + alignClass + '">' +
			'<img src="' + esc( sized ) + '" alt="' + esc( alt ) + '" class="rip-image' + alignClass + '" />' +
			( cap ? '<figcaption class="wp-caption-text">' + esc( cap ) + '</figcaption>' : '' ) +
			'</figure>';
	}

	/**
	 * Scatter the user-marked images across the article, matching each image to
	 * the most related spot by its keywords, then filling any remainder with the
	 * next well-spaced slots. Never mid-sentence, kept clear of existing images.
	 */
	function scatterSelected() {
		var editor = state.editor;
		if ( ! editor || editor.isHidden() ) {
			setStatus( 'Scatter needs the Visual editor — switch from Text to Visual and try again.' );
			return;
		}

		var items = Object.keys( state.selected ).map( function ( id ) {
			return state.selected[ id ];
		} );
		if ( ! items.length ) {
			return;
		}

		var slots = articleSlots( 2 );
		if ( ! slots.length ) {
			setStatus( 'No well-spaced spots found — add more paragraphs/headings or clear nearby images.' );
			return;
		}

		var usedSlot = {};
		var assignments = [];

		// Pass 1: assign each image to its best keyword-matching free slot.
		items.forEach( function ( item ) {
			var kws = imageKeywords( item );
			var best = -1;
			var bestScore = 0;
			slots.forEach( function ( slot, si ) {
				if ( usedSlot[ si ] ) {
					return;
				}
				var hay = ( slot.text || '' ).toLowerCase();
				var score = kws.reduce( function ( s, kw ) {
					return s + ( hay.indexOf( kw ) !== -1 ? 1 : 0 );
				}, 0 );
				if ( score > bestScore ) {
					bestScore = score;
					best = si;
				}
			} );
			if ( best !== -1 && bestScore > 0 ) {
				usedSlot[ best ] = true;
				assignments.push( { item: item, slot: slots[ best ] } );
			} else {
				assignments.push( { item: item, slot: null } );
			}
		} );

		// Pass 2: fill unmatched images with the remaining free slots.
		var free = [];
		slots.forEach( function ( s, si ) {
			if ( ! usedSlot[ si ] ) {
				free.push( si );
			}
		} );
		assignments.forEach( function ( a ) {
			if ( ! a.slot && free.length ) {
				var si = free.shift();
				usedSlot[ si ] = true;
				a.slot = slots[ si ];
			}
		} );

		var placed = assignments.filter( function ( a ) {
			return a.slot;
		} );
		if ( ! placed.length ) {
			setStatus( 'No spots available to scatter into.' );
			return;
		}

		// Insert bottom-up so earlier DOM indices stay valid.
		placed.sort( function ( a, b ) {
			return b.slot.index - a.slot.index;
		} );
		placed.forEach( function ( a ) {
			insertNodeAt( editor, a.slot.node, a.slot.where, contentFigure( a.item ) );
		} );

		editor.nodeChanged();
		if ( editor.undoManager ) {
			editor.undoManager.add();
		}
		editor.save();
		close();
	}

	/**
	 * Build the HTML for a single icon: bare <img>, floated to the chosen side,
	 * sized in px, and NEVER captioned.
	 *
	 * @param {Object} item Icon item.
	 * @return {string}
	 */
	function iconHtml( item ) {
		var side = $modal.find( '.rip-icon-side' ).val() || 'left';
		var px = clampIconSize( $modal.find( '.rip-icon-size' ).val() );
		var src = ( item.sizes && item.sizes.thumbnail ) ? item.sizes.thumbnail.url : ( item.thumb || item.url );
		var alt = item.alt || item.title || '';
		return '<img src="' + esc( src ) + '" alt="' + esc( alt ) + '" width="' + px + '" height="' + px +
			'" class="rip-icon align' + side + '" style="width:' + px + 'px;height:' + px + 'px;" />';
	}

	/**
	 * Insert a single icon at the current cursor/position (no caption, no link).
	 *
	 * @param {Object} item Icon item.
	 */
	function insertIcon( item ) {
		var html = iconHtml( item );
		var position = $modal.find( '.rip-insert-position' ).val();
		if ( state.editor && ! state.editor.isHidden() ) {
			if ( 'cursor' === position || ! placeAtParagraph( state.editor, html, position ) ) {
				state.editor.insertContent( html );
			}
		} else {
			var $ta = $( '#' + state.editorId );
			if ( $ta.length ) {
				var el = $ta.get( 0 );
				var pos = el.selectionStart || el.value.length;
				el.value = el.value.slice( 0, pos ) + html + el.value.slice( pos );
			}
		}
	}

	/**
	 * Whether an image src points at an "icon" file.
	 *
	 * @param {string} src Image URL.
	 * @return {boolean}
	 */
	function isIconSrc( src ) {
		return /icon/i.test( ( src || '' ).split( '?' )[ 0 ].split( '/' ).pop() || '' );
	}

	/**
	 * Strip caption wrappers from any icon images already in the content.
	 *
	 * @param {Object} editor TinyMCE editor.
	 */
	function unwrapIconCaptions( editor ) {
		var figures = editor.getBody().querySelectorAll( 'figure' );
		Array.prototype.forEach.call( figures, function ( fig ) {
			var img = fig.querySelector( 'img' );
			if ( ! img || ! isIconSrc( img.getAttribute( 'src' ) ) ) {
				return;
			}
			// Replace the whole figure (caption included) with just the image.
			if ( fig.parentNode ) {
				fig.parentNode.replaceChild( img, fig );
			}
		} );
		editor.nodeChanged();
		editor.save();
	}

	/**
	 * Spread every icon in the current results next to text that matches its
	 * name (e.g. a "contact-us" icon beside "contact us"). Icons are floated
	 * to the chosen side, sized in px, and never captioned. Also strips any
	 * captions from icons already in the article.
	 */
	function spreadIconsByName() {
		var editor = state.editor;
		if ( ! editor || editor.isHidden() ) {
			setStatus( 'Icon spread needs the Visual editor — switch from Text to Visual and try again.' );
			return;
		}

		var icons = [];
		$modal.find( '.rip-card' ).each( function () {
			var item = $( this ).data( 'item' );
			if ( item && item.is_icon ) {
				icons.push( item );
			}
		} );
		if ( ! icons.length ) {
			setStatus( 'No icons found in your Media Library (filenames containing “icon”).' );
			return;
		}

		var blocks = Array.prototype.slice.call( editor.getBody().children );
		var placed = 0;

		icons.forEach( function ( item ) {
			var kws = ( item.icon_keywords && item.icon_keywords.length ) ? item.icon_keywords : [];
			if ( ! kws.length ) {
				return;
			}
			// Find the first block whose text mentions one of the icon's name words.
			for ( var i = 0; i < blocks.length; i++ ) {
				var b = blocks[ i ];
				if ( ! /^(P|H[1-6]|LI)$/.test( b.nodeName ) ) {
					continue;
				}
				if ( b.querySelector && b.querySelector( 'img.rip-icon' ) ) {
					continue; // already has an icon.
				}
				var hay = ( b.textContent || '' ).toLowerCase();
				var match = kws.some( function ( kw ) {
					return hay.indexOf( kw.toLowerCase() ) !== -1;
				} );
				if ( match ) {
					var temp = editor.getDoc().createElement( 'div' );
					temp.innerHTML = iconHtml( item );
					b.insertBefore( temp.firstChild, b.firstChild );
					placed++;
					break;
				}
			}
		} );

		unwrapIconCaptions( editor );
		editor.nodeChanged();
		if ( editor.undoManager ) {
			editor.undoManager.add();
		}
		editor.save();

		if ( placed ) {
			close();
		} else {
			setStatus( 'No article text matched the icon names. Try renaming icons to match your content.' );
		}
	}

	/**
	 * Fetch internal-link candidates from the sitemap.
	 *
	 * @param {boolean} refresh Re-scan (bypass the server cache).
	 */
	function fetchLinks( refresh ) {
		setStatus( refresh ? 'Re-scanning your sitemap…' : 'Reading your sitemap…' );
		$modal.find( '.rip-grid' ).empty();
		state.linkSel = {};

		// Score relevance against the whole article (so "Add all relevant"
		// auto-spreads links that match the article's topics), falling back to
		// the selected sentence.
		var context = state.lastSelection || '';
		if ( state.editor && ! state.editor.isHidden() ) {
			context = ( state.editor.getContent( { format: 'text' } ) || context ).slice( 0, 5000 );
		}

		$.ajax( {
			url: cfg.restUrl + '/links',
			method: 'GET',
			data: {
				text: context,
				limit: 300,
				refresh: refresh ? 1 : 0,
				exclude_post: cfg.postId || 0
			},
			beforeSend: function ( xhr ) {
				xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
			}
		} ).done( function ( res ) {
			state.links = ( res && res.items ) || [];
			renderLinks( state.links );
		} ).fail( function ( xhr ) {
			setStatus( 'Could not read a sitemap: ' + ( xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : 'none found' ) );
		} );
	}

	/**
	 * Render the internal-link candidate checklist.
	 *
	 * @param {Array} links Link candidates.
	 */
	function renderLinks( links ) {
		if ( ! links.length ) {
			setStatus( 'No sitemap links found. Make sure an SEO plugin (Yoast / Rank Math) or core sitemaps are active.' );
			return;
		}
		setStatus( '' );

		var $grid = $modal.find( '.rip-grid' ).empty();
		links.forEach( function ( link, idx ) {
			var kind = link.kind || 'url';
			var color = colorFor( kind );
			var rel = ( link.score && link.score > 0 ) ? '<span class="rip-link-rel">relevant</span>' : '';
			var selected = state.linkSel[ link.url ] ? ' is-selected' : '';

			var $row = $(
				'<div class="rip-link-row' + selected + '" data-idx="' + idx + '" tabindex="0" style="border-left-color:' + color + '">' +
				'  <span class="rip-link-check" style="--rip-k:' + color + '">✓</span>' +
				'  <span class="rip-link-main">' +
				'    <span class="rip-link-title">' + esc( link.title ) + '</span>' +
				'    <span class="rip-link-url">' + esc( link.url ) + '</span>' +
				'  </span>' +
				'  <span class="rip-link-kind" style="background:' + color + '">' + esc( kindLabel( kind ) ) + '</span>' +
				rel +
				'  <button type="button" class="rip-link-block" data-tip="Block this page — never suggest or link it">' + icon( 'ban' ) + '</button>' +
				'</div>'
			);
			$row.data( 'link', link );
			$grid.append( $row );
		} );
	}

	/**
	 * Toggle selection of a link candidate.
	 *
	 * @param {jQuery} $row Row element.
	 */
	function toggleLink( $row ) {
		var link = $row.data( 'link' );
		if ( state.linkSel[ link.url ] ) {
			delete state.linkSel[ link.url ];
			$row.removeClass( 'is-selected' );
		} else {
			state.linkSel[ link.url ] = link;
			$row.addClass( 'is-selected' );
		}
		var n = Object.keys( state.linkSel ).length;
		$modal.find( '.rip-selcount' ).text( n ? n + ' selected' : '' );
		$modal.find( '.rip-links-sel' ).prop( 'disabled', n === 0 );
	}

	/**
	 * Block a page so it is never suggested/linked again, and drop it from the
	 * current list.
	 *
	 * @param {jQuery} $row Row element.
	 */
	function blockLink( $row ) {
		var link = $row.data( 'link' );
		if ( ! link ) {
			return;
		}
		$row.css( 'opacity', 0.4 );
		$.ajax( {
			url: cfg.restUrl + '/block-link',
			method: 'POST',
			data: { url: link.url, blocked: 1 },
			beforeSend: function ( xhr ) {
				xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
			}
		} ).done( function () {
			delete state.linkSel[ link.url ];
			state.links = state.links.filter( function ( l ) {
				return l.url !== link.url;
			} );
			$row.slideUp( 150, function () {
				$( this ).remove();
			} );
			var c = Object.keys( state.linkSel ).length;
			$modal.find( '.rip-selcount' ).text( c ? c + ' selected' : '' );
			$modal.find( '.rip-links-sel' ).prop( 'disabled', c === 0 );
		} ).fail( function () {
			$row.css( 'opacity', 1 );
		} );
	}

	/**
	 * Add internal links into the article. Each chosen target links the first
	 * matching occurrence of its title in the body text (never inside an
	 * existing link), longest titles first.
	 *
	 * @param {boolean} selectedOnly Only apply ticked targets.
	 */
	function applyLinks( selectedOnly ) {
		var editor = state.editor;
		if ( ! editor || editor.isHidden() ) {
			setStatus( 'Adding links needs the Visual editor — switch from Text to Visual and try again.' );
			return;
		}

		var links;
		if ( selectedOnly ) {
			links = Object.keys( state.linkSel ).map( function ( u ) {
				return state.linkSel[ u ];
			} );
		} else if ( hasScores() ) {
			// "All relevant" = those that matched the article keywords; if none
			// matched, fall back to all candidates so the button still works.
			links = state.links.filter( function ( l ) {
				return l.score > 0;
			} );
			if ( ! links.length ) {
				links = state.links.slice();
			}
		} else {
			links = state.links.slice();
		}

		if ( ! links.length ) {
			setStatus( selectedOnly ? 'Tick at least one link first.' : 'No relevant links to add.' );
			return;
		}

		// Longest titles first so specific phrases win over generic ones.
		links.sort( function ( a, b ) {
			return ( b.title || '' ).length - ( a.title || '' ).length;
		} );

		var linked = {};
		var count = 0;
		links.forEach( function ( link ) {
			// Try meaningful phrases derived from the title, longest/most
			// specific first — full titles rarely appear verbatim.
			var phrases = linkPhrases( link.title );
			for ( var i = 0; i < phrases.length; i++ ) {
				var p = phrases[ i ];
				if ( linked[ p ] ) {
					continue;
				}
				if ( wrapFirstOccurrence( editor, p, link.url ) ) {
					linked[ p ] = true;
					count++;
					break;
				}
			}
		} );

		editor.nodeChanged();
		if ( editor.undoManager ) {
			editor.undoManager.add();
		}
		editor.save();

		if ( count ) {
			close();
		} else {
			setStatus( 'None of those titles appear in your article text yet.' );
		}
	}

	/**
	 * Boilerplate / preposition words dropped from link anchor phrases so we
	 * don't link words like "no", "in", "best" (e.g. from "No.1 … in Buffalo").
	 */
	var TITLE_STOP = { no: 1, in: 1, on: 1, at: 1, of: 1, to: 1, by: 1, an: 1, or: 1, is: 1, it: 1, as: 1, we: 1, us: 1, best: 1, top: 1, premier: 1, leading: 1, trusted: 1, official: 1 };

	/**
	 * Derive linkable anchor phrases from a page title, most specific first.
	 * Strips boilerplate (punctuation, "no.1", pure numbers, stop-words) and
	 * yields contiguous word n-grams (longest → shortest), then significant
	 * single words. So "No.1 Commercial Locksmith Buffalo NY" can link
	 * "commercial locksmith buffalo ny", "commercial locksmith", … "locksmith".
	 *
	 * @param {string} title Page title.
	 * @return {string[]}
	 */
	function linkPhrases( title ) {
		var clean = ( title || '' ).toLowerCase()
			.replace( /[^a-z0-9\s]/g, ' ' )
			.replace( /\s+/g, ' ' )
			.trim();
		var tokens = clean.split( ' ' ).filter( function ( t ) {
			return t && ! STOP[ t ] && ! TITLE_STOP[ t ] && ! /^\d+$/.test( t );
		} );

		var phrases = [];
		for ( var n = tokens.length; n >= 2; n-- ) {
			for ( var i = 0; i + n <= tokens.length; i++ ) {
				phrases.push( tokens.slice( i, i + n ).join( ' ' ) );
			}
		}
		// Significant single words last (avoid linking tiny/common ones).
		tokens.forEach( function ( t ) {
			if ( t.length >= 4 ) {
				phrases.push( t );
			}
		} );

		var seen = {};
		var out = [];
		phrases.forEach( function ( p ) {
			if ( ! seen[ p ] ) {
				seen[ p ] = true;
				out.push( p );
			}
		} );
		return out;
	}

	/**
	 * Whether any link candidate carries a relevance score (keyword context).
	 *
	 * @return {boolean}
	 */
	function hasScores() {
		return state.links.some( function ( l ) {
			return l.hasOwnProperty( 'score' );
		} );
	}

	/**
	 * Wrap the first unlinked occurrence of a phrase (whole-word, case-
	 * insensitive) in an anchor, within P/LI text nodes only.
	 *
	 * @param {Object} editor TinyMCE editor.
	 * @param {string} phrase Phrase to link.
	 * @param {string} href   Target URL.
	 * @return {boolean} True if a link was created.
	 */
	function wrapFirstOccurrence( editor, phrase, href ) {
		var doc = editor.getDoc();
		var body = editor.getBody();
		var lower = phrase.toLowerCase();
		var walker = doc.createTreeWalker( body, NodeFilter.SHOW_TEXT, null, false );
		var node;

		while ( ( node = walker.nextNode() ) ) {
			// Skip text already inside a link, or outside paragraph-ish blocks.
			if ( closestTag( node.parentNode, 'A' ) ) {
				continue;
			}
			if ( ! closestTag( node.parentNode, 'P' ) && ! closestTag( node.parentNode, 'LI' ) ) {
				continue;
			}
			var text = node.nodeValue;
			var pos = text.toLowerCase().indexOf( lower );
			if ( pos === -1 ) {
				continue;
			}
			// Require word boundaries so "art" doesn't match inside "start".
			var before = text.charAt( pos - 1 );
			var after = text.charAt( pos + phrase.length );
			if ( /\w/.test( before ) || /\w/.test( after ) ) {
				continue;
			}

			var matched = text.substr( pos, phrase.length );
			var anchor = doc.createElement( 'a' );
			anchor.setAttribute( 'href', href );
			anchor.appendChild( doc.createTextNode( matched ) );

			var after_node = node.splitText( pos );
			after_node.nodeValue = after_node.nodeValue.substr( phrase.length );
			node.parentNode.insertBefore( anchor, after_node );
			return true;
		}
		return false;
	}

	/**
	 * Find the nearest ancestor (incl. self) with the given tag name.
	 *
	 * @param {Node}   node Start node.
	 * @param {string} tag  Upper-case tag name.
	 * @return {Element|null}
	 */
	function closestTag( node, tag ) {
		while ( node && node.nodeType === 1 ) {
			if ( node.nodeName === tag ) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	}

	/**
	 * Set the status / empty-state message.
	 *
	 * @param {string} msg Message ('' hides it).
	 */
	function setStatus( msg ) {
		var $s = $modal.find( '.rip-status' );
		$s.text( msg || '' ).toggle( !! msg );
	}

	/**
	 * Close + reset the modal.
	 */
	function close() {
		if ( $modal ) {
			$modal.hide();
		}
		state.selected = {};
		state.activeId = null;
		hideDetails();
	}

	/**
	 * Public entry point — open the picker.
	 *
	 * @param {Object} opts { selection, editorId, editor }
	 */
	function open( opts ) {
		opts = opts || {};
		buildModal();

		state.editor = opts.editor || ( window.tinymce ? window.tinymce.get( opts.editorId ) : null );
		state.editorId = opts.editorId || '';
		state.page = 1;
		state.selected = {};
		state.activeId = null;
		state.linkSel = {};
		state.links = [];
		state.tab = ( cfg.enableMedia !== false ) ? 'media' : 'stock';

		var selection = ( opts.selection || '' ).trim();
		state.lastSelection = selection;

		$modal.find( '.rip-grid' ).empty();
		$modal.find( '.rip-pagination' ).remove();
		hideDetails();
		updateSelCount();

		var prefs = loadPrefs();

		if ( selection ) {
			// Fresh text selected → search it in Images mode.
			applyModeClass( 'images' );
			$modal.find( '.rip-keywords' ).val( '' );
			setStatus( i18n.searching || 'Searching…' );
			$.ajax( {
				url: cfg.restUrl + '/keywords',
				method: 'GET',
				data: { text: selection },
				beforeSend: function ( xhr ) {
					xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
				}
			} ).done( function ( res ) {
				$modal.find( '.rip-keywords' ).val( ( res.keywords || [] ).join( ' ' ) );
				runSearch();
			} ).fail( function () {
				$modal.find( '.rip-keywords' ).val( selection );
				runSearch();
			} );
		} else {
			// No selection → restore the last search and mode.
			var mode = prefs.lastMode || 'images';
			applyModeClass( mode );

			if ( 'links' === mode ) {
				buildLegend();
				fetchLinks();
			} else {
				state.tab = 'media';
				$modal.find( '.rip-tab' ).removeClass( 'is-active' );
				$modal.find( '.rip-tab[data-tab="media"]' ).addClass( 'is-active' );
				$modal.toggleClass( 'rip-is-stock', false );

				if ( 'icons' === mode ) {
					$modal.find( '.rip-keywords' ).val( '' );
					runSearch();
				} else {
					var kw = prefs.lastKeywords || '';
					$modal.find( '.rip-keywords' ).val( kw );
					if ( kw.trim() ) {
						runSearch();
					} else {
						setStatus( i18n.noSelection || 'Select a sentence first, then click the button.' );
					}
				}
			}
		}

		$modal.show();
		$modal.find( '.rip-keywords' ).trigger( 'focus' );
	}

	window.RIP = { open: open };
} )( jQuery );
