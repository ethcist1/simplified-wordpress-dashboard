( function () {
	const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = wp.element;
	const apiFetch = wp.apiFetch;

	let blockIdCounter = 1;
	function nextId() { return blockIdCounter++; }

	function escapeHtml( str ) {
		return ( str || '' ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
	}

	const URL_ONLY_RE = /^(https?:\/\/\S+)$/i;

	/* ---------- content parsing (existing post HTML -> block list) ---------- */
	function parseContentToBlocks( html ) {
		if ( ! html || ! html.trim() ) return [ { id: nextId(), type: 'paragraph', text: '' } ];
		const cleaned = html.replace( /<!--\s*\/?wp:[\s\S]*?-->/g, '' );
		const doc = new DOMParser().parseFromString( '<div>' + cleaned + '</div>', 'text/html' );
		const nodes = Array.from( doc.body.firstChild.childNodes );
		const blocks = [];

		nodes.forEach( ( node ) => {
			if ( node.nodeType === 3 ) {
				if ( node.textContent.trim() ) blocks.push( { id: nextId(), type: 'paragraph', text: escapeHtml( node.textContent.trim() ) } );
				return;
			}
			if ( node.nodeType !== 1 ) return;
			const tag = node.tagName;

			if ( /^H[1-6]$/.test( tag ) ) {
				blocks.push( { id: nextId(), type: 'heading', text: node.innerHTML.trim() } );
			} else if ( tag === 'P' ) {
				const text = node.textContent.trim();
				if ( URL_ONLY_RE.test( text ) ) {
					blocks.push( { id: nextId(), type: 'embed', url: text } );
				} else if ( text || node.querySelector( 'img' ) ) {
					if ( node.querySelector( 'img' ) && ! text ) {
						const img = node.querySelector( 'img' );
						blocks.push( { id: nextId(), type: 'image', mediaUrl: img.getAttribute( 'src' ), mediaId: 0, caption: '' } );
					} else {
						blocks.push( { id: nextId(), type: 'paragraph', text: node.innerHTML } );
					}
				}
			} else if ( tag === 'UL' || tag === 'OL' ) {
				const items = Array.from( node.children ).map( ( li ) => li.innerHTML );
				blocks.push( { id: nextId(), type: 'list', items: items.length ? items : [ '' ] } );
			} else if ( tag === 'BLOCKQUOTE' ) {
				blocks.push( { id: nextId(), type: 'quote', text: node.innerHTML.trim() } );
			} else if ( tag === 'PRE' ) {
				const code = node.querySelector( 'code' );
				blocks.push( { id: nextId(), type: 'code', text: ( code || node ).textContent } );
			} else if ( tag === 'FIGURE' ) {
				const img = node.querySelector( 'img' );
				const caption = node.querySelector( 'figcaption' );
				blocks.push( { id: nextId(), type: 'image', mediaUrl: img ? img.getAttribute( 'src' ) : '', mediaId: 0, caption: caption ? caption.textContent : '' } );
			} else if ( tag === 'IMG' ) {
				blocks.push( { id: nextId(), type: 'image', mediaUrl: node.getAttribute( 'src' ), mediaId: 0, caption: '' } );
			} else if ( node.textContent.trim() ) {
				blocks.push( { id: nextId(), type: 'paragraph', text: escapeHtml( node.textContent.trim() ) } );
			}
		} );

		return blocks.length ? blocks : [ { id: nextId(), type: 'paragraph', text: '' } ];
	}

	/* ---------- block list -> HTML for saving ---------- */
	function serializeBlocks( blocks ) {
		return blocks.map( ( b ) => {
			switch ( b.type ) {
				case 'paragraph': return '<p>' + ( b.text || '' ) + '</p>';
				case 'heading': return '<h2>' + ( b.text || '' ) + '</h2>';
				case 'quote': return '<blockquote>' + ( b.text || '' ) + '</blockquote>';
				case 'code': return '<pre><code>' + escapeHtml( b.text || '' ) + '</code></pre>';
				case 'list': return '<ul>' + ( b.items || [] ).map( ( i ) => '<li>' + ( i || '' ) + '</li>' ).join( '' ) + '</ul>';
				case 'image': return b.mediaUrl ? '<figure><img src="' + b.mediaUrl + '" />' + ( b.caption ? '<figcaption>' + escapeHtml( b.caption ) + '</figcaption>' : '' ) + '</figure>' : '';
				case 'embed': return b.url ? '<p>' + escapeHtml( b.url ) + '</p>' : '';
				default: return '';
			}
		} ).filter( Boolean ).join( '\n' );
	}

	/* ---------- uncontrolled contentEditable, preserves inline formatting ---------- */
	function Editable( { html, onCommit, className, tag } ) {
		const ref = useRef( null );
		const mounted = useRef( false );

		useEffect( () => {
			if ( ! mounted.current && ref.current ) {
				ref.current.innerHTML = html || '';
				mounted.current = true;
			}
		}, [] );

		return h( tag || 'div', {
			ref,
			className,
			contentEditable: true,
			suppressContentEditableWarning: true,
			onBlur: () => onCommit( ref.current.innerHTML ),
		} );
	}

	function EditableList( { items, onCommit } ) {
		const ref = useRef( null );
		const mounted = useRef( false );

		useEffect( () => {
			if ( ! mounted.current && ref.current ) {
				ref.current.innerHTML = ( items || [ '' ] ).map( ( i ) => '<li>' + ( i || '' ) + '</li>' ).join( '' );
				mounted.current = true;
			}
		}, [] );

		return h( 'ul', {
			ref, contentEditable: true, suppressContentEditableWarning: true,
			onBlur: () => {
				const lis = Array.from( ref.current.querySelectorAll( 'li' ) );
				onCommit( lis.length ? lis.map( ( li ) => li.innerHTML ) : [ '' ] );
			},
		} );
	}

	function Icon( { path, size } ) {
		return h( 'svg', {
			width: size || 16, height: size || 16, viewBox: '0 0 24 24', fill: 'none',
			stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round',
			dangerouslySetInnerHTML: { __html: path },
		} );
	}

	const EDIT_ICON = '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>';

	const BLOCK_ICONS = {
		paragraph: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/>',
		heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
		image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
		list: '<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>',
		quote: '<path d="M7 8a3 3 0 0 0-3 3v5h5v-5H6a2 2 0 0 1 2-2z"/><path d="M17 8a3 3 0 0 0-3 3v5h5v-5h-3a2 2 0 0 1 2-2z"/>',
		code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
		embed: '<rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 9 15 12 10 15 10 9" fill="currentColor" stroke="none"/>',
	};
	const BLOCK_TYPES = [ 'paragraph', 'heading', 'image', 'list', 'quote', 'code', 'embed' ];
	const BLOCK_LABELS = { paragraph: 'Paragraph', heading: 'Heading', image: 'Image', list: 'List', quote: 'Quote', code: 'Code', embed: 'Embed' };

	const STATUS_OPTIONS = [
		{ value: 'draft', label: 'Draft' },
		{ value: 'pending', label: 'Pending Review' },
		{ value: 'publish', label: 'Published' },
		{ value: 'private', label: 'Private' },
	];
	const STATUS_SAVE_LABELS = { draft: 'Save Draft', pending: 'Submit for Review', publish: 'Publish', private: 'Save' };

	function openMediaFrame( onSelect ) {
		const frame = wp.media( { title: 'Select image', multiple: false, library: { type: 'image' } } );
		frame.on( 'select', () => {
			const att = frame.state().get( 'selection' ).first().toJSON();
			onSelect( att.id, att.url );
		} );
		frame.open();
	}

	function uploadImageFile( file, onDone ) {
		if ( ! file || file.type.indexOf( 'image/' ) !== 0 ) return;
		const formData = new FormData();
		formData.append( 'file', file, file.name || 'image.jpg' );
		apiFetch( { path: '/wp/v2/media', method: 'POST', body: formData } )
			.then( ( media ) => onDone( media.id, media.source_url ) )
			.catch( ( err ) => window.alert( 'Upload failed: ' + ( err.message || 'unknown error' ) ) );
	}

	function ImageSlot( { url, onPick, height } ) {
		return h( 'div', {
			className: 'ed-image-slot', style: { height: height || 320 },
			onClick: () => openMediaFrame( onPick ),
		}, url ? h( 'img', { src: url, alt: '' } ) : h( 'span', { className: 'ed-placeholder' }, 'Click to choose an image' ) );
	}

	function Gap( { index, isOpen, onToggle, onAdd, alwaysVisible } ) {
		return h( 'div', { className: 'ed-gap' + ( isOpen ? ' is-open' : '' ) + ( alwaysVisible ? ' ed-gap-always' : '' ) },
			h( 'div', { className: 'ed-gap-line', onClick: onToggle },
				h( 'div', { className: 'ed-gap-rule' } ),
				h( 'span', { className: 'ed-gap-add' }, h( Icon, { path: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', size: 14 } ) ),
				h( 'div', { className: 'ed-gap-rule' } )
			),
			isOpen && h( 'div', { className: 'ed-card ed-elev-md ed-gap-menu' },
				BLOCK_TYPES.map( ( type ) => h( 'button', {
					key: type, className: 'ed-btn ed-btn-secondary', onClick: () => onAdd( index, type ),
				}, h( Icon, { path: BLOCK_ICONS[ type ], size: 18 } ), BLOCK_LABELS[ type ] ) )
			)
		);
	}

	function AdditionalSettings( { isOpen, onToggle, excerpt, onExcerptChange, slug, onSlugChange, yoastActive, metaTitle, onMetaTitleChange, metaDesc, onMetaDescChange, focusKw, onFocusKwChange } ) {
		return h( 'div', { className: 'ed-additional-settings' + ( isOpen ? ' is-open' : '' ) },
			h( 'button', { type: 'button', className: 'ed-additional-settings-toggle', onClick: onToggle },
				h( Icon, { path: '<polyline points="9 18 15 12 9 6"/>', size: 14 } ),
				'Additional settings'
			),
			isOpen && h( 'div', { className: 'ed-card ed-elev-md ed-additional-settings-panel' },
				h( 'div', { className: 'ed-field' },
					h( 'label', {}, 'Excerpt' ),
					h( 'textarea', {
						className: 'ed-input', rows: 3, value: excerpt,
						onChange: ( e ) => onExcerptChange( e.target.value ),
					} )
				),
				h( 'div', { className: 'ed-field' },
					h( 'label', {}, 'Slug' ),
					h( 'input', {
						className: 'ed-input', type: 'text', value: slug,
						onChange: ( e ) => onSlugChange( e.target.value ),
					} )
				),
				yoastActive && h( Fragment, {},
					h( 'div', { className: 'ed-hr' } ),
					h( 'div', { className: 'ed-additional-settings-group-label' }, 'Yoast SEO' ),
					h( 'div', { className: 'ed-field' },
						h( 'label', {}, 'SEO title' ),
						h( 'input', {
							className: 'ed-input', type: 'text', value: metaTitle,
							onChange: ( e ) => onMetaTitleChange( e.target.value ),
						} )
					),
					h( 'div', { className: 'ed-field' },
						h( 'label', {}, 'Meta description' ),
						h( 'textarea', {
							className: 'ed-input', rows: 3, value: metaDesc,
							onChange: ( e ) => onMetaDescChange( e.target.value ),
						} )
					),
					h( 'div', { className: 'ed-field' },
						h( 'label', {}, 'Focus keyphrase' ),
						h( 'input', {
							className: 'ed-input', type: 'text', value: focusKw,
							onChange: ( e ) => onFocusKwChange( e.target.value ),
						} )
					)
				)
			)
		);
	}

	function Block( { block, onChange, onRemove } ) {
		let body;
		if ( block.type === 'paragraph' ) {
			body = h( Editable, { html: block.text, className: 'ed-editable', onCommit: ( v ) => onChange( { text: v } ) } );
		} else if ( block.type === 'heading' ) {
			body = h( Editable, { html: block.text, className: 'ed-editable-heading ed-editable', onCommit: ( v ) => onChange( { text: v } ) } );
		} else if ( block.type === 'image' ) {
			body = h( Fragment, {},
				h( ImageSlot, { url: block.mediaUrl, onPick: ( id, url ) => onChange( { mediaId: id, mediaUrl: url } ) } ),
				h( 'input', {
					className: 'ed-caption-input', type: 'text', placeholder: 'Caption (optional)',
					value: block.caption || '', onChange: ( e ) => onChange( { caption: e.target.value } ),
				} )
			);
		} else if ( block.type === 'list' ) {
			body = h( EditableList, { items: block.items, onCommit: ( items ) => onChange( { items } ) } );
		} else if ( block.type === 'quote' ) {
			body = h( 'blockquote', { className: 'ed-quote' }, h( Editable, { html: block.text, className: 'ed-editable', onCommit: ( v ) => onChange( { text: v } ) } ) );
		} else if ( block.type === 'code' ) {
			body = h( 'textarea', {
				defaultValue: block.text || '', placeholder: 'Start writing…', onBlur: ( e ) => onChange( { text: e.target.value } ),
			} );
		} else if ( block.type === 'embed' ) {
			body = h( 'input', {
				className: 'ed-embed-input', type: 'url', placeholder: 'Paste a video, tweet, or link URL…',
				value: block.url || '', onChange: ( e ) => onChange( { url: e.target.value } ),
			} );
		}

		const wrapClass = 'ed-block ed-block-' + block.type + ( block.type === 'code' ? ' ed-code-block' : '' );
		return h( 'div', { className: wrapClass },
			body,
			h( 'button', { className: 'ed-block-remove', onClick: onRemove }, '×' )
		);
	}

	function App() {
		const initialPostId = parseInt( edEditor.postId, 10 ) || 0;
		const isNew = ! initialPostId;
		const [ loading, setLoading ] = useState( ! isNew );
		const [ postId, setPostId ] = useState( initialPostId );
		const [ title, setTitle ] = useState( '' );
		const [ status, setStatus ] = useState( 'draft' );
		const [ savedStatus, setSavedStatus ] = useState( 'draft' );
		const [ date, setDate ] = useState( '' );
		const [ categoryId, setCategoryId ] = useState( edEditor.categories[ 0 ] ? edEditor.categories[ 0 ].id : 0 );
		const [ authorId, setAuthorId ] = useState( edEditor.currentUserId );
		const [ featuredMediaId, setFeaturedMediaId ] = useState( 0 );
		const [ featuredMediaUrl, setFeaturedMediaUrl ] = useState( '' );
		const [ isDragOver, setIsDragOver ] = useState( false );
		const [ blocks, setBlocks ] = useState( [ { id: nextId(), type: 'paragraph', text: '' } ] );
		const [ openGap, setOpenGap ] = useState( null );
		const [ saving, setSaving ] = useState( false );
		const [ toolbar, setToolbar ] = useState( { visible: false, left: 0, top: 0 } );
		const [ excerpt, setExcerpt ] = useState( '' );
		const [ slug, setSlug ] = useState( '' );
		const [ metaTitle, setMetaTitle ] = useState( '' );
		const [ metaDesc, setMetaDesc ] = useState( '' );
		const [ focusKw, setFocusKw ] = useState( '' );
		const [ settingsOpen, setSettingsOpen ] = useState( false );
		const contentRef = useRef( null );

		useEffect( () => {
			if ( isNew ) return;
			apiFetch( { path: '/wp/v2/posts/' + postId + '?context=edit&_embed=1' } ).then( ( post ) => {
				setTitle( post.title.raw || '' );
				setStatus( post.status );
				setSavedStatus( post.status );
				setDate( post.date ? post.date.slice( 0, 10 ) : '' );
				if ( post.categories && post.categories.length ) setCategoryId( post.categories[ 0 ] );
				if ( post.author ) setAuthorId( post.author );
				setPostLink( post.link );
				const media = post._embedded && post._embedded[ 'wp:featuredmedia' ] && post._embedded[ 'wp:featuredmedia' ][ 0 ];
				if ( media && media.source_url ) { setFeaturedMediaId( post.featured_media ); setFeaturedMediaUrl( media.source_url ); }
				setBlocks( parseContentToBlocks( post.content.raw ) );
				setExcerpt( post.excerpt ? post.excerpt.raw : '' );
				setSlug( post.slug || '' );
				if ( edEditor.yoastActive && post.meta ) {
					setMetaTitle( post.meta._yoast_wpseo_title || '' );
					setMetaDesc( post.meta._yoast_wpseo_metadesc || '' );
					setFocusKw( post.meta._yoast_wpseo_focuskw || '' );
				}
				setLoading( false );
			} );
		}, [] );

		const updateBlock = ( id, patch ) => setBlocks( ( prev ) => prev.map( ( b ) => ( b.id === id ? Object.assign( {}, b, patch ) : b ) ) );
		const removeBlock = ( id ) => setBlocks( ( prev ) => prev.filter( ( b ) => b.id !== id ) );
		const insertBlock = ( index, type ) => {
			const base = { id: nextId(), type };
			if ( type === 'list' ) base.items = [ '' ];
			setBlocks( ( prev ) => {
				const next = prev.slice();
				next.splice( index, 0, base );
				return next;
			} );
			setOpenGap( null );
		};

		const handleMouseUp = () => {
			const sel = window.getSelection();
			if ( ! sel || sel.isCollapsed || ! sel.rangeCount || ! contentRef.current ) { setToolbar( ( t ) => ( Object.assign( {}, t, { visible: false } ) ) ); return; }
			const range = sel.getRangeAt( 0 );
			const rect = range.getBoundingClientRect();
			if ( ! rect.width ) { setToolbar( ( t ) => ( Object.assign( {}, t, { visible: false } ) ) ); return; }
			const containerRect = contentRef.current.getBoundingClientRect();
			setToolbar( {
				visible: true,
				left: Math.max( 0, rect.left - containerRect.left + rect.width / 2 - 55 ),
				top: rect.top - containerRect.top - 42,
			} );
		};

		const applyBold = ( e ) => { e.preventDefault(); document.execCommand( 'bold' ); };
		const applyItalic = ( e ) => { e.preventDefault(); document.execCommand( 'italic' ); };
		const applyLink = ( e ) => { e.preventDefault(); const url = window.prompt( 'Link URL', 'https://' ); if ( url ) document.execCommand( 'createLink', false, url ); };

		const buildPayload = ( overrideStatus ) => {
			const payload = {
				title, content: serializeBlocks( blocks ),
				status: overrideStatus || status,
				categories: categoryId ? [ categoryId ] : [],
				author: authorId,
				featured_media: featuredMediaId || 0,
				excerpt,
				slug,
			};
			if ( date ) payload.date = date + 'T00:00:00';
			if ( edEditor.yoastActive ) {
				payload.meta = {
					_yoast_wpseo_title: metaTitle,
					_yoast_wpseo_metadesc: metaDesc,
					_yoast_wpseo_focuskw: focusKw,
				};
			}
			return payload;
		};

		const save = ( overrideStatus ) => {
			setSaving( true );
			const payload = buildPayload( overrideStatus );
			const path = postId ? '/wp/v2/posts/' + postId : '/wp/v2/posts';
			return apiFetch( { path, method: 'POST', data: payload } ).then( ( post ) => {
				setSaving( false );
				setStatus( post.status );
				setSavedStatus( post.status );
				setPostLink( post.link );
				setSlug( post.slug || '' );
				if ( ! postId ) {
					setPostId( post.id );
					window.history.replaceState( null, '', edEditor.postsListUrl.replace( 'page=ed-posts', 'page=ed-editor' ) + '&post_id=' + post.id );
				}
				return post;
			} ).catch( ( err ) => { setSaving( false ); window.alert( 'Save failed: ' + ( err.message || 'unknown error' ) ); throw err; } );
		};

		const applyFeaturedImage = ( id, url ) => {
			setFeaturedMediaId( id );
			setFeaturedMediaUrl( url );
			if ( postId ) {
				apiFetch( { path: '/wp/v2/posts/' + postId, method: 'POST', data: { featured_media: id } } )
					.catch( ( err ) => window.alert( 'Could not update featured image: ' + ( err.message || 'unknown error' ) ) );
			}
		};

		const [ postLink, setPostLink ] = useState( '' );
		const [ copied, setCopied ] = useState( false );
		const [ editingSlug, setEditingSlug ] = useState( false );
		const [ slugDraft, setSlugDraft ] = useState( '' );
		const [ savingSlug, setSavingSlug ] = useState( false );

		const onPublish = () => save( status );
		const publishLabel = status === 'publish' && savedStatus === 'publish' ? 'Update' : STATUS_SAVE_LABELS[ status ];

		const onSlugEditStart = () => { setSlugDraft( slug ); setEditingSlug( true ); };
		const onSlugCancel = () => setEditingSlug( false );
		const onSlugSave = () => {
			const cleaned = slugDraft.trim().toLowerCase().replace( /\s+/g, '-' ).replace( /[^a-z0-9-]/g, '' );
			setSlug( cleaned );
			setSavingSlug( true );
			apiFetch( { path: '/wp/v2/posts/' + postId, method: 'POST', data: { slug: cleaned } } )
				.then( ( post ) => {
					setSlug( post.slug || '' );
					setPostLink( post.link );
					setSavingSlug( false );
					setEditingSlug( false );
				} )
				.catch( ( err ) => {
					setSavingSlug( false );
					window.alert( 'Could not update permalink: ' + ( err.message || 'unknown error' ) );
				} );
		};
		const onPreview = () => save().then( ( post ) => {
			const url = post.status === 'publish' ? post.link : post.link + ( post.link.indexOf( '?' ) === -1 ? '?' : '&' ) + 'preview=true';
			window.open( url, '_blank' );
		} );
		const onCopyLink = () => {
			const showCopied = () => {
				setCopied( true );
				window.setTimeout( () => setCopied( false ), 1500 );
			};
			const fallbackCopy = () => {
				const textarea = document.createElement( 'textarea' );
				textarea.value = postLink;
				textarea.style.position = 'fixed';
				textarea.style.opacity = '0';
				document.body.appendChild( textarea );
				textarea.focus();
				textarea.select();
				try {
					document.execCommand( 'copy' );
					showCopied();
				} catch ( err ) {
					window.alert( 'Could not copy link: ' + ( err.message || 'unknown error' ) );
				}
				document.body.removeChild( textarea );
			};
			if ( navigator.clipboard && navigator.clipboard.writeText ) {
				navigator.clipboard.writeText( postLink ).then( showCopied ).catch( fallbackCopy );
			} else {
				fallbackCopy();
			}
		};

		if ( loading ) return h( 'div', {}, 'Loading…' );

		let flowIndex = 0;
		const flowChildren = [];
		blocks.forEach( ( block, i ) => {
			flowChildren.push( h( Gap, {
				key: 'gap' + i, index: i, isOpen: openGap === i,
				onToggle: () => setOpenGap( openGap === i ? null : i ),
				onAdd: insertBlock,
			} ) );
			flowChildren.push( h( Block, {
				key: 'block' + block.id, block,
				onChange: ( patch ) => updateBlock( block.id, patch ),
				onRemove: () => removeBlock( block.id ),
			} ) );
		} );
		flowChildren.push( h( Gap, {
			key: 'gap-end', index: blocks.length, isOpen: openGap === blocks.length,
			onToggle: () => setOpenGap( openGap === blocks.length ? null : blocks.length ),
			onAdd: insertBlock, alwaysVisible: true,
		} ) );

		return h( Fragment, {},
			h( 'a', { className: 'ed-back-link', href: edEditor.postsListUrl }, '← Back to Posts' ),

			h( 'div', { className: 'ed-editor-toolbar' },
				h( 'div', { className: 'ed-field' },
					h( 'label', {}, 'Category:' ),
					h( 'select', { className: 'ed-input', value: categoryId, onChange: ( e ) => setCategoryId( parseInt( e.target.value, 10 ) ) },
						edEditor.categories.map( ( c ) => h( 'option', { key: c.id, value: c.id }, c.name ) )
					)
				),
				h( 'div', { className: 'ed-field' },
					h( 'label', {}, 'Date:' ),
					h( 'input', { className: 'ed-input', type: 'date', value: date, onChange: ( e ) => setDate( e.target.value ) } )
				),
				edEditor.canEditOthers && h( 'div', { className: 'ed-field' },
					h( 'label', {}, 'Author:' ),
					h( 'select', { className: 'ed-input', value: authorId, onChange: ( e ) => setAuthorId( parseInt( e.target.value, 10 ) ) },
						edEditor.authors.map( ( a ) => h( 'option', { key: a.id, value: a.id }, a.name ) )
					)
				),
				h( 'div', { className: 'ed-spacer' } ),
				h( 'div', { className: 'ed-field' },
					h( 'label', {}, 'Status:' ),
					h( 'select', { className: 'ed-input ed-status-select', value: status, onChange: ( e ) => setStatus( e.target.value ) },
						STATUS_OPTIONS.map( ( o ) => h( 'option', { key: o.value, value: o.value }, o.label ) )
					)
				),
				status !== 'publish' && h( 'button', { className: 'ed-btn ed-btn-secondary', onClick: onPreview, disabled: saving }, 'Preview' ),
				h( 'button', { className: 'ed-btn ed-btn-primary', onClick: onPublish, disabled: saving }, publishLabel )
			),

			postId && postLink && h( 'div', { className: 'ed-post-link-row' },
				h( 'span', { className: 'ed-post-link-label' }, 'Permalink:' ),
				editingSlug
					? h( Fragment, {},
						h( 'input', {
							className: 'ed-input ed-slug-input', type: 'text', value: slugDraft,
							onChange: ( e ) => setSlugDraft( e.target.value ), disabled: savingSlug,
							onKeyDown: ( e ) => { if ( e.key === 'Enter' ) onSlugSave(); if ( e.key === 'Escape' ) onSlugCancel(); },
							autoFocus: true,
						} ),
						h( 'button', { className: 'ed-btn ed-btn-secondary', onClick: onSlugSave, disabled: savingSlug }, savingSlug ? 'Saving…' : 'OK' ),
						h( 'button', { className: 'ed-btn ed-btn-secondary', onClick: onSlugCancel, disabled: savingSlug }, 'Cancel' )
					)
					: h( Fragment, {},
						h( 'a', { className: 'ed-post-link-url', href: postLink, target: '_blank', rel: 'noopener noreferrer' }, postLink ),
						h( 'button', { className: 'ed-btn ed-btn-icon', title: 'Edit permalink', onClick: onSlugEditStart }, h( Icon, { path: EDIT_ICON, size: 14 } ) )
					),
				status === 'publish' && h( 'button', { className: 'ed-btn ed-btn-secondary', onClick: () => window.open( postLink, '_blank' ) }, 'View' ),
				h( 'button', { className: 'ed-btn ed-btn-secondary', onClick: onCopyLink }, copied ? 'Copied!' : 'Copy' )
			),

			h( 'input', {
				type: 'text', className: 'ed-title-input', placeholder: 'Add title',
				value: title, onChange: ( e ) => setTitle( e.target.value ),
			} ),

			h( 'div', {
				className: 'ed-featured-image' + ( isDragOver ? ' is-dragover' : '' ) + ( featuredMediaUrl ? ' has-image' : '' ),
				onClick: () => openMediaFrame( ( id, url ) => applyFeaturedImage( id, url ) ),
				onDragOver: ( e ) => { e.preventDefault(); setIsDragOver( true ); },
				onDragLeave: () => setIsDragOver( false ),
				onDrop: ( e ) => {
					e.preventDefault();
					setIsDragOver( false );
					const file = e.dataTransfer.files && e.dataTransfer.files[ 0 ];
					uploadImageFile( file, ( id, url ) => applyFeaturedImage( id, url ) );
				},
			},
				featuredMediaUrl ? h( 'img', { src: featuredMediaUrl, alt: '' } ) : h( 'span', { className: 'ed-placeholder' }, 'Drop a featured image' ),
				featuredMediaUrl && h( 'button', {
					className: 'ed-remove-image', onClick: ( e ) => { e.stopPropagation(); applyFeaturedImage( 0, '' ); },
				}, 'Remove' )
			),

			h( 'div', { ref: contentRef, className: 'ed-content', onMouseUp: handleMouseUp, onKeyUp: handleMouseUp },
				toolbar.visible && h( 'div', { className: 'ed-selection-toolbar', style: { left: toolbar.left, top: toolbar.top } },
					h( 'button', { className: 'ed-bold', onMouseDown: applyBold }, 'B' ),
					h( 'button', { className: 'ed-italic', onMouseDown: applyItalic }, 'I' ),
					h( 'button', { onMouseDown: applyLink }, h( Icon, { path: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', size: 15 } ) )
				),
				flowChildren
			),

			h( AdditionalSettings, {
				isOpen: settingsOpen, onToggle: () => setSettingsOpen( ! settingsOpen ),
				excerpt, onExcerptChange: setExcerpt,
				slug, onSlugChange: setSlug,
				yoastActive: !! edEditor.yoastActive,
				metaTitle, onMetaTitleChange: setMetaTitle,
				metaDesc, onMetaDescChange: setMetaDesc,
				focusKw, onFocusKwChange: setFocusKw,
			} )
		);
	}

	document.addEventListener( 'DOMContentLoaded', function () {
		const root = document.getElementById( 'ed-editor-root' );
		if ( root ) wp.element.render( h( App ), root );
	} );
} )();
