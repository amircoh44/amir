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

	var state = {
		editor: null,
		editorId: '',
		tab: 'media',          // 'media' | 'stock'
		page: 1,
		total: 0,
		selected: {},          // id -> item (for multi-select)
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
		insert: '<path d="M8 2.5v8M8 10.5 5 7.5M8 10.5l3-3"/><path d="M2.5 11.5v1A1 1 0 0 0 3.5 13.5h9a1 1 0 0 0 1-1v-1"/>'
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
			field( { ic: 'sort', label: 'Sort by', cls: 'rip-f-orderby', tip: 'Order the results', options: [ [ 'relevance', 'Relevance' ], [ 'date', 'Newest' ], [ 'date_asc', 'Oldest' ], [ 'resolution', 'Highest resolution' ], [ 'size', 'Largest file' ], [ 'size_asc', 'Smallest file' ], [ 'title', 'Title · A–Z' ] ] } ) +
			( showStock ? field( { ic: 'provider', label: 'Source', cls: 'rip-f-provider', extraCls: 'rip-stock-only', tip: 'Pick a stock provider', options: providerOpts } ) : '' );

		var insertOpts =
			field( { ic: 'size', label: 'Size', cls: 'rip-insert-size', tip: 'Inserted image size', options: [ [ 'thumbnail', 'Thumbnail' ], [ 'medium', 'Medium' ], [ 'large', 'Large' ], [ 'full', 'Full' ] ] } ) +
			field( { ic: 'align', label: 'Align', cls: 'rip-insert-align', tip: 'Text alignment around the image', options: [ [ 'none', 'None' ], [ 'left', 'Left' ], [ 'center', 'Center' ], [ 'right', 'Right' ] ] } ) +
			'<label class="rip-field rip-link-toggle" data-tip="Wrap the image in a link to the full-size file">' +
			'<span class="rip-field-lab">' + icon( 'link' ) + '<span>Link full</span></span>' +
			'<span class="rip-switch"><input type="checkbox" class="rip-insert-link" /><span class="rip-switch-track"></span></span>' +
			'</label>';

		var html =
			'<div class="rip-overlay" role="dialog" aria-modal="true" aria-label="' + esc( i18n.title || 'Related Image Pickup' ) + '">' +
			'  <div class="rip-modal">' +
			'    <header class="rip-head">' +
			'      <h2>' + icon( 'search' ) + '<span>' + esc( i18n.title || 'Related Image Pickup' ) + '</span></h2>' +
			'      <button type="button" class="rip-close" aria-label="Close" data-tip="Close (Esc)">' + icon( 'close' ) + '</button>' +
			'    </header>' +
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
			'    <div class="rip-body">' +
			'      <div class="rip-status"></div>' +
			'      <div class="rip-grid"></div>' +
			'    </div>' +
			'    <footer class="rip-foot">' +
			'      <div class="rip-insert-opts">' + insertOpts + '</div>' +
			'      <div class="rip-foot-actions">' +
			'        <span class="rip-selcount"></span>' +
			'        <button type="button" class="rip-insert-btn" disabled>' + icon( 'insert' ) + '<span>' + esc( i18n.insert || 'Insert' ) + '</span></button>' +
			'      </div>' +
			'    </footer>' +
			'  </div>' +
			'</div>';

		$modal = $( html );
		$( 'body' ).append( $modal );

		// Default insert size from settings.
		$modal.find( '.rip-insert-size' ).val( cfg.defaultSize || 'large' );

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
			state.page = 1;
			runSearch();
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
			orderby: $modal.find( '.rip-f-orderby' ).val(),
			provider: $modal.find( '.rip-f-provider' ).val() || '',
			page: state.page,
			per_page: cfg.perPage || 24
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

		var $card = $(
			'<figure class="rip-card" data-id="' + esc( item.id ) + '" tabindex="0">' +
			'  <div class="rip-thumb-wrap">' + badge +
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
		} else {
			state.selected[ id ] = item;
			$card.addClass( 'is-selected' );
		}
		updateSelCount();
	}

	/**
	 * Update the selected-count label + insert button state.
	 */
	function updateSelCount() {
		var n = Object.keys( state.selected ).length;
		$modal.find( '.rip-selcount' ).text( n ? n + ' selected' : '' );
		$modal.find( '.rip-insert-btn' ).prop( 'disabled', n === 0 );
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

		var $btn = $modal.find( '.rip-insert-btn' ).prop( 'disabled', true );

		// Resolve each item to a local URL (import stock items), preserving order.
		var chain = $.Deferred().resolve().promise();
		var resolved = [];

		items.forEach( function ( item ) {
			chain = chain.then( function () {
				if ( item.source && item.source !== 'media_library' ) {
					$btn.text( i18n.importing || 'Importing…' );
					return importStock( item ).then( function ( data ) {
						resolved.push( {
							url: data.sized || data.url,
							full: data.url,
							alt: data.alt || item.alt || item.title,
							caption: item.title || ''
						} );
					} );
				}
				var sizeChoice = $modal.find( '.rip-insert-size' ).val();
				var sized = ( item.sizes && item.sizes[ sizeChoice ] ) ? item.sizes[ sizeChoice ].url : item.url;
				resolved.push( {
					url: sized,
					full: item.url,
					alt: item.alt || item.title,
					caption: item.caption || ''
				} );
				return null;
			} );
		} );

		chain.then( function () {
			resolved.forEach( insertImageHtml );
			close();
		} ).always( function () {
			$btn.prop( 'disabled', false ).text( i18n.insert || 'Insert' );
		} ).fail( function ( xhr ) {
			setStatus( 'Import failed: ' + ( xhr && xhr.responseJSON ? xhr.responseJSON.message : 'unknown error' ) );
		} );
	}

	/**
	 * Import a stock image into the Media Library via REST.
	 *
	 * @param {Object} item Stock item.
	 * @return {Promise}
	 */
	function importStock( item ) {
		return $.ajax( {
			url: cfg.restUrl + '/import',
			method: 'POST',
			data: {
				url: item.download || item.url,
				title: item.title || '',
				alt: item.alt || item.title || '',
				caption: item.title || '',
				post_id: cfg.postId || 0
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
			state.editor.insertContent( html );
		} else {
			// Fallback: text-mode textarea.
			var $ta = $( '#' + state.editorId );
			if ( $ta.length ) {
				var el = $ta.get( 0 );
				var pos = el.selectionStart || el.value.length;
				el.value = el.value.slice( 0, pos ) + html + el.value.slice( pos );
			}
		}
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
		state.tab = ( cfg.enableMedia !== false ) ? 'media' : 'stock';

		$modal.find( '.rip-keywords' ).val( '' );
		$modal.find( '.rip-grid' ).empty();
		updateSelCount();

		// Pre-fill keywords by extracting them from the selection server-side.
		var selection = ( opts.selection || '' ).trim();
		if ( selection ) {
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
			setStatus( i18n.noSelection || 'Select a sentence first, then click the button.' );
		}

		$modal.show();
		$modal.find( '.rip-keywords' ).trigger( 'focus' );
	}

	window.RIP = { open: open };
} )( jQuery );
