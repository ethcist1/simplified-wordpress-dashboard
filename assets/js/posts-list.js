( function () {
	const { createElement: h, useState, useEffect, useCallback, useRef } = wp.element;
	const apiFetch = wp.apiFetch;

	const STATUS_QUERY = {
		all: 'publish,future,draft,pending,private',
		published: 'publish',
		draft: 'draft',
	};

	function categoryNames( post ) {
		const terms = post._embedded && post._embedded[ 'wp:term' ];
		if ( ! terms ) return 'Uncategorized';
		const catGroup = terms.find( ( group ) => group.length && group[ 0 ].taxonomy === 'category' );
		if ( ! catGroup || ! catGroup.length ) return 'Uncategorized';
		return catGroup.map( ( t ) => t.name ).join( ', ' );
	}

	function authorName( post ) {
		const author = post._embedded && post._embedded.author && post._embedded.author[ 0 ];
		return author ? author.name : '';
	}

	function formatDate( iso ) {
		if ( ! iso ) return '';
		const d = new Date( iso );
		if ( isNaN( d ) ) return '';
		return d.toLocaleDateString( undefined, { month: 'short', day: 'numeric', year: 'numeric' } );
	}

	function Icon( { path, size } ) {
		return h( 'svg', {
			width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none',
			stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round',
			dangerouslySetInnerHTML: { __html: path },
		} );
	}

	const ICONS = {
		image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
		edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
		preview: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
		trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
	};

	function PostRow( { post, onTrash } ) {
		const isDraft = post.status !== 'publish';
		const thumb = post._embedded &&
			post._embedded[ 'wp:featuredmedia' ] &&
			post._embedded[ 'wp:featuredmedia' ][ 0 ] &&
			post._embedded[ 'wp:featuredmedia' ][ 0 ].source_url;

		const editHref = edPostsList.editorUrl + '&post_id=' + post.id;

		return h( 'div', { className: 'ed-post-row', onClick: () => { window.location.href = editHref; } },
			h( 'div', { className: 'ed-post-thumb' },
				thumb ? h( 'img', { src: thumb, alt: '' } ) : h( Icon, { path: ICONS.image, size: 20 } )
			),
			h( 'div', { className: 'ed-post-main' },
				h( 'div', { className: 'ed-post-tags' },
					h( 'span', { className: 'ed-tag ' + ( isDraft ? 'ed-tag-neutral' : 'ed-tag-accent' ) }, isDraft ? 'Draft' : 'Published' ),
					h( 'span', { className: 'ed-tag ed-tag-neutral' }, categoryNames( post ) )
				),
				h( 'div', { className: 'ed-post-title' }, post.title.rendered || '(no title)' ),
				h( 'div', { className: 'ed-post-meta' },
					isDraft
						? authorName( post ) + ' · Not published yet'
						: authorName( post ) + ' · ' + formatDate( post.date )
				)
			),
			h( 'div', { className: 'ed-post-actions' },
				h( 'a', { className: 'ed-btn ed-btn-icon', href: editHref, title: 'Edit', onClick: ( e ) => e.stopPropagation() }, h( Icon, { path: ICONS.edit } ) ),
				h( 'a', { className: 'ed-btn ed-btn-icon', href: post.link, target: '_blank', rel: 'noreferrer', title: 'Preview', onClick: ( e ) => e.stopPropagation() }, h( Icon, { path: ICONS.preview } ) ),
				h( 'button', {
					className: 'ed-btn ed-btn-icon', title: 'Move to trash',
					onClick: ( e ) => { e.stopPropagation(); onTrash( post.id ); },
				}, h( Icon, { path: ICONS.trash } ) )
			)
		);
	}

	function App() {
		const [ posts, setPosts ] = useState( [] );
		const [ loading, setLoading ] = useState( true );
		const [ search, setSearch ] = useState( '' );
		const [ filter, setFilter ] = useState( 'all' );
		const debounceRef = useRef( null );

		const load = useCallback( ( q, f ) => {
			setLoading( true );
			const params = new URLSearchParams( {
				context: 'edit',
				status: STATUS_QUERY[ f ],
				per_page: '50',
				orderby: 'date',
				order: 'desc',
				_embed: '1',
			} );
			if ( q ) params.set( 'search', q );
			apiFetch( { path: '/wp/v2/posts?' + params.toString() } )
				.then( ( result ) => setPosts( result ) )
				.catch( () => setPosts( [] ) )
				.finally( () => setLoading( false ) );
		}, [] );

		useEffect( () => { load( search, filter ); }, [ filter ] );

		const onSearchChange = ( e ) => {
			const value = e.target.value;
			setSearch( value );
			clearTimeout( debounceRef.current );
			debounceRef.current = setTimeout( () => load( value, filter ), 300 );
		};

		const onTrash = ( id ) => {
			apiFetch( { path: '/wp/v2/posts/' + id, method: 'DELETE' } ).then( () => {
				setPosts( ( prev ) => prev.filter( ( p ) => p.id !== id ) );
			} );
		};

		return h( wp.element.Fragment, {},
			h( 'div', { className: 'ed-posts-header' },
				h( 'h1', {}, 'Posts' ),
				h( 'span', { className: 'ed-posts-count' }, posts.length + ' posts' ),
				h( 'a', { className: 'ed-btn ed-btn-primary', href: edPostsList.editorUrl }, 'Add New' )
			),
			h( 'div', { className: 'ed-posts-toolbar' },
				h( 'input', {
					className: 'ed-input', type: 'text', placeholder: 'Search posts…',
					value: search, onChange: onSearchChange,
				} ),
				h( 'div', { className: 'ed-seg' },
					[ [ 'all', 'All' ], [ 'published', 'Published' ], [ 'draft', 'Draft' ] ].map( ( [ key, label ] ) =>
						h( 'label', { key, className: 'ed-seg-opt' },
							h( 'input', {
								type: 'radio', name: 'ed-status-filter', checked: filter === key,
								onChange: () => setFilter( key ),
							} ),
							label
						)
					)
				)
			),
			h( 'div', { className: 'ed-hr', style: { margin: '0 0 4px' } } ),
			loading
				? h( 'div', { className: 'ed-posts-empty' }, 'Loading…' )
				: posts.length
					? posts.map( ( post ) => h( PostRow, { key: post.id, post, onTrash } ) )
					: h( 'div', { className: 'ed-posts-empty' }, 'No posts found.' )
		);
	}

	document.addEventListener( 'DOMContentLoaded', function () {
		const root = document.getElementById( 'ed-posts-root' );
		if ( root ) wp.element.render( h( App ), root );
	} );
} )();
