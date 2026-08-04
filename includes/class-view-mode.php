<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Tracks whether the current user is in "modern" (reskinned) or "classic"
 * (stock wp-admin) view, and provides the toggle link in the admin bar.
 */
class ED_View_Mode {

	const META_KEY = 'ed_dashboard_view_mode';

	public static function init() {
		add_action( 'admin_post_ed_toggle_view', array( __CLASS__, 'handle_toggle' ) );
		add_action( 'admin_bar_menu', array( __CLASS__, 'admin_bar_node' ), 100 );
		add_filter( 'admin_body_class', array( __CLASS__, 'body_class' ) );
	}

	/** True unless the user has explicitly switched to classic view. */
	public static function is_modern() {
		$user_id = get_current_user_id();
		if ( ! $user_id ) return true;
		$mode = get_user_meta( $user_id, self::META_KEY, true );
		return $mode !== 'classic';
	}

	public static function handle_toggle() {
		check_admin_referer( 'ed_toggle_view' );
		$user_id = get_current_user_id();
		if ( $user_id ) {
			$target = isset( $_GET['view'] ) && $_GET['view'] === 'classic' ? 'classic' : 'modern';
			update_user_meta( $user_id, self::META_KEY, $target );
		}
		$redirect = isset( $_GET['redirect_to'] ) ? esc_url_raw( wp_unslash( $_GET['redirect_to'] ) ) : admin_url();
		wp_safe_redirect( $redirect );
		exit;
	}

	public static function toggle_url( $to_view, $redirect_to = '' ) {
		$url = admin_url( 'admin-post.php' );
		$url = add_query_arg( array(
			'action'      => 'ed_toggle_view',
			'view'        => $to_view,
			'redirect_to' => rawurlencode( $redirect_to ? $redirect_to : admin_url() ),
		), $url );
		return wp_nonce_url( $url, 'ed_toggle_view' );
	}

	public static function admin_bar_node( $wp_admin_bar ) {
		if ( self::is_modern() ) {
			$wp_admin_bar->add_node( array(
				'id'    => 'ed-view-toggle',
				'title' => 'Switch to classic view',
				'href'  => self::toggle_url( 'classic', $GLOBALS['pagenow'] === 'index.php' ? '' : '' ),
			) );
		} else {
			$wp_admin_bar->add_node( array(
				'id'    => 'ed-view-toggle',
				'title' => 'Switch to Simplified Dashboard',
				'href'  => self::toggle_url( 'modern' ),
			) );
		}
	}

	public static function body_class( $classes ) {
		$classes .= self::is_modern() ? ' ed-modern ' : ' ed-classic ';
		return $classes;
	}
}
