/**
 * TinyMCE plugin: registers the "Related Image Pickup" toolbar button and a
 * context-menu item. On click it reads the current selection and hands off to
 * the modal (window.RIP.open), defined in modal.js.
 *
 * @package WP_Related_Image_Pickup
 */
( function () {
	'use strict';

	tinymce.PluginManager.add( 'rip_button', function ( editor ) {
		var label = 'Find related images';

		/**
		 * Read the user's current text selection (plain text).
		 *
		 * @return {string}
		 */
		function getSelectedText() {
			var text = editor.selection ? editor.selection.getContent( { format: 'text' } ) : '';
			return ( text || '' ).trim();
		}

		/**
		 * Open the picker, passing along the selection and editor id.
		 */
		function openPicker() {
			var selection = getSelectedText();
			if ( window.RIP && typeof window.RIP.open === 'function' ) {
				window.RIP.open( {
					selection: selection,
					editorId: editor.id,
					editor: editor
				} );
			}
		}

		editor.addButton( 'rip_button', {
			title: label,
			// Inline SVG icon (image + magnifier) so we need no icon font.
			image: 'data:image/svg+xml;base64,' + window.btoa(
				'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="13" height="13" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m16 13-3-3-5 5"/><circle cx="17.5" cy="17.5" r="3.5"/><path d="M21 21l-1.2-1.2"/></svg>'
			),
			onclick: openPicker
		} );

		editor.addMenuItem( 'rip_button', {
			text: label,
			context: 'insert',
			onclick: openPicker
		} );

		// Optional keyboard shortcut: Ctrl/Cmd + Shift + I.
		editor.addShortcut( 'meta+shift+i', label, openPicker );
	} );
} )();
