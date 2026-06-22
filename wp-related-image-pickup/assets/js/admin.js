/**
 * Settings-page helpers — import a YouTube channel's videos into the list.
 *
 * @package WP_Related_Image_Pickup
 */
( function ( $ ) {
	'use strict';

	var cfg = window.RIP_Admin || {};

	$( function () {
		var $btn = $( '#rip_yt_import' );
		if ( ! $btn.length ) {
			return;
		}

		$btn.on( 'click', function () {
			var channel = $.trim( $( '#rip_yt_channel' ).val() );
			var apikey = $.trim( $( '#rip_yt_apikey' ).val() );
			var $status = $( '#rip_yt_status' );

			if ( ! channel ) {
				$status.text( 'Enter your channel ID, URL, or @handle first.' ).css( 'color', '#d63638' );
				return;
			}

			$btn.prop( 'disabled', true );
			$status.text( 'Importing…' ).css( 'color', '' );

			$.ajax( {
				url: cfg.restUrl + '/import-videos',
				method: 'POST',
				data: { channel: channel, apikey: apikey },
				beforeSend: function ( xhr ) {
					xhr.setRequestHeader( 'X-WP-Nonce', cfg.nonce );
				}
			} ).done( function ( res ) {
				$( '#rip_videos' ).val( res.lines );
				var msg = 'Imported ' + res.added + ' new video' + ( 1 === res.added ? '' : 's' ) +
					' (' + res.total + ' total, saved).';
				if ( 'rss' === res.source && res.fetched >= 15 ) {
					msg += ' Latest ~15 only — add an API key for the full catalogue.';
				}
				$status.text( msg ).css( 'color', '#00a32a' );
			} ).fail( function ( xhr ) {
				var m = ( xhr.responseJSON && xhr.responseJSON.message ) ? xhr.responseJSON.message : 'Import failed.';
				$status.text( m ).css( 'color', '#d63638' );
			} ).always( function () {
				$btn.prop( 'disabled', false );
			} );
		} );
	} );
} )( jQuery );
