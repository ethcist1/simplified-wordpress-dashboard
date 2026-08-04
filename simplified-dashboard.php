<?php
/**
 * Plugin Name: Simplified Dashboard
 * Description: Reskins wp-admin with a custom sidebar and replaces the post editor with a simplified block-based writing experience. Includes a "classic view" escape hatch back to stock wp-admin.
 * Version: 1.0.0
 * Author: Your Site
 * Text Domain: simplified-dashboard
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'ED_DASH_VERSION', '1.0.2' );
define( 'ED_DASH_FILE', __FILE__ );
define( 'ED_DASH_DIR', plugin_dir_path( __FILE__ ) );
define( 'ED_DASH_URL', plugin_dir_url( __FILE__ ) );

require_once ED_DASH_DIR . 'includes/class-view-mode.php';
require_once ED_DASH_DIR . 'includes/class-admin-shell.php';
require_once ED_DASH_DIR . 'includes/class-posts-list-page.php';
require_once ED_DASH_DIR . 'includes/class-editor-page.php';

/**
 * Bootstrap. Everything is gated on view mode so "classic view" fully
 * disables the reskin without deactivating the plugin.
 */
final class ED_Dashboard {
	public static function init() {
		ED_View_Mode::init();
		ED_Admin_Shell::init();
		ED_Posts_List_Page::init();
		ED_Editor_Page::init();
	}
}
add_action( 'plugins_loaded', array( 'ED_Dashboard', 'init' ) );
