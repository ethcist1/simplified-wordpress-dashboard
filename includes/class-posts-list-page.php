<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Custom "Posts" admin page — replaces edit.php for the 'post' post type
 * with the card-list layout from the design. Data comes from the core
 * /wp/v2/posts REST endpoint via wp-api-fetch (nonce handled by WP core).
 */
class ED_Posts_List_Page {

	const SLUG = 'ed-posts';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_page' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_filter( 'admin_body_class', array( __CLASS__, 'maybe_full_page_class' ) );
	}

	public static function register_page() {
		add_submenu_page( null, 'Posts', 'Posts', 'edit_posts', self::SLUG, array( __CLASS__, 'render' ) );
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

		wp_enqueue_style( 'ed-posts-list', ED_DASH_URL . 'assets/css/posts-list.css', array( 'ed-tokens' ), ED_DASH_VERSION );

		wp_enqueue_script( 'wp-element' );
		wp_enqueue_script( 'wp-api-fetch' );
		wp_enqueue_script(
			'ed-posts-list',
			ED_DASH_URL . 'assets/js/posts-list.js',
			array( 'wp-element', 'wp-api-fetch' ),
			ED_DASH_VERSION,
			true
		);

		wp_localize_script( 'ed-posts-list', 'edPostsList', array(
			'restUrl'   => esc_url_raw( rest_url( 'wp/v2' ) ),
			'editorUrl' => admin_url( 'admin.php?page=ed-editor' ),
			'canEditOthers' => current_user_can( 'edit_others_posts' ),
		) );
	}

	public static function render() {
		echo '<div id="ed-posts-root"></div>';
	}
}
