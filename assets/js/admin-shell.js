/* Mobile sidebar: hamburger toggle + overlay, below the 782px breakpoint. */
( function () {
	var toggle  = document.getElementById( 'ed-sidebar-toggle' );
	var sidebar = document.getElementById( 'ed-sidebar' );
	var overlay = document.getElementById( 'ed-sidebar-overlay' );
	if ( ! toggle || ! sidebar || ! overlay ) return;

	function close() {
		sidebar.classList.remove( 'is-open' );
		overlay.classList.remove( 'is-open' );
		toggle.setAttribute( 'aria-expanded', 'false' );
	}

	function open() {
		sidebar.classList.add( 'is-open' );
		overlay.classList.add( 'is-open' );
		toggle.setAttribute( 'aria-expanded', 'true' );
	}

	toggle.addEventListener( 'click', function () {
		if ( sidebar.classList.contains( 'is-open' ) ) {
			close();
		} else {
			open();
		}
	} );

	overlay.addEventListener( 'click', close );

	sidebar.addEventListener( 'click', function ( e ) {
		if ( e.target.closest( 'a' ) ) close();
	} );

	window.addEventListener( 'resize', function () {
		if ( window.innerWidth > 782 ) close();
	} );
} )();
