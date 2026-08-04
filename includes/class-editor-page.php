<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Custom "Editor" admin page — replaces post-new.php / post.php for the
 * 'post' post type with the simplified block-insertion writing experience
 * from the design. Saves through the core /wp/v2/posts REST endpoint.
 */
class ED_Editor_Page {

	const SLUG = 'ed-editor';

	const YOAST_META_KEYS = array( '_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw' );

	/**
	 * Core/known boxes we already have dedicated UI for (or that don't make
	 * sense outside the classic post.php form) — stripped out so "Additional
	 * settings" only shows boxes registered by *other* plugins.
	 */
	const EXCLUDED_META_BOXES = array(
		'submitdiv', 'authordiv', 'categorydiv', 'tagsdiv-post_tag', 'postimagediv',
		'postexcerpt', 'slugdiv', 'postcustom', 'commentstatusdiv', 'commentsdiv',
		'trackbacksdiv', 'revisionsdiv', 'wpseo_meta',
	);

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_page' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_filter( 'admin_body_class', array( __CLASS__, 'maybe_full_page_class' ) );
		add_action( 'init', array( __CLASS__, 'register_yoast_meta' ), 20 );
		add_action( 'wp_ajax_ed_render_meta_boxes', array( __CLASS__, 'ajax_render_meta_boxes' ) );
		add_action( 'wp_ajax_ed_save_meta_boxes', array( __CLASS__, 'ajax_save_meta_boxes' ) );
	}

	/**
	 * Yoast SEO stores its fields as post meta but doesn't always expose them
	 * to the REST API for editing. Register them ourselves (a no-op if Yoast
	 * already has) so the "Additional settings" panel can read/write them
	 * through the standard /wp/v2/posts meta object.
	 */
	public static function register_yoast_meta() {
		if ( ! defined( 'WPSEO_VERSION' ) ) return;

		foreach ( self::YOAST_META_KEYS as $key ) {
			if ( registered_meta_key_exists( 'post', $key, 'post' ) ) continue;
			register_post_meta( 'post', $key, array(
				'type'          => 'string',
				'single'        => true,
				'show_in_rest'  => true,
				'auth_callback' => function( $allowed, $meta_key, $post_id ) {
					return current_user_can( 'edit_post', $post_id );
				},
			) );
		}
	}

	public static function register_page() {
		add_submenu_page( null, 'Editor', 'Editor', 'edit_posts', self::SLUG, array( __CLASS__, 'render' ) );
	}

	public static function maybe_full_page_class( $classes ) {
		if ( isset( $_GET['page'] ) && $_GET['page'] === self::SLUG ) {
			$classes .= ' ed-full-page ';
		}
		return $classes;
	}

	public static function enqueue( $hook ) {
		if ( ! isset( $_GET['page'] ) || $_GET['page'] !== self::SLUG ) return;
		if ( ! ED_View_Mode::is_modern() ) return;

		wp_enqueue_media();
		wp_enqueue_style( 'ed-editor', ED_DASH_URL . 'assets/css/editor.css', array( 'ed-tokens' ), ED_DASH_VERSION );

		wp_enqueue_script( 'wp-element' );
		wp_enqueue_script( 'wp-api-fetch' );
		wp_enqueue_script(
			'ed-editor',
			ED_DASH_URL . 'assets/js/editor.js',
			array( 'wp-element', 'wp-api-fetch', 'media-editor' ),
			ED_DASH_VERSION,
			true
		);

		$post_id = isset( $_GET['post_id'] ) ? absint( $_GET['post_id'] ) : 0;
		if ( $post_id && ( get_post_type( $post_id ) !== 'post' || ! current_user_can( 'edit_post', $post_id ) ) ) {
			$post_id = 0;
		}

		$categories = array_map( function( $c ) {
			return array( 'id' => $c->term_id, 'name' => $c->name );
		}, get_categories( array( 'hide_empty' => false ) ) );

		$authors = array_map( function( $u ) {
			return array( 'id' => $u->ID, 'name' => $u->display_name );
		}, get_users( array( 'capability' => array( 'edit_posts' ) ) ) );

		wp_localize_script( 'ed-editor', 'edEditor', array(
			'restUrl'       => esc_url_raw( rest_url( 'wp/v2' ) ),
			'postsListUrl'  => admin_url( 'admin.php?page=' . ED_Posts_List_Page::SLUG ),
			'postId'        => $post_id,
			'currentUserId' => get_current_user_id(),
			'canEditOthers' => current_user_can( 'edit_others_posts' ),
			'categories'    => array_values( $categories ),
			'authors'       => array_values( $authors ),
			'yoastActive'   => defined( 'WPSEO_VERSION' ),
		) );
	}

	public static function render() {
		echo '<div id="ed-editor-root"></div>';
	}
}
