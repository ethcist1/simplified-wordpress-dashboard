<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Renders the custom sidebar on every wp-admin screen (when in "modern"
 * view) and hides the native admin menu with CSS. Real WordPress screens
 * (Pages, Media, Appearance, Users, Settings, etc.) are kept fully
 * functional and just restyled; only Posts + the post editor are replaced
 * outright by custom pages elsewhere in this plugin.
 */
class ED_Admin_Shell {

	public static function init() {
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
		add_action( 'in_admin_header', array( __CLASS__, 'render_sidebar' ) );

		add_action( 'load-edit.php', array( __CLASS__, 'redirect_posts_list' ) );
		add_action( 'load-post-new.php', array( __CLASS__, 'redirect_new_post' ) );
		add_action( 'load-post.php', array( __CLASS__, 'redirect_edit_post' ) );
		add_action( 'load-index.php', array( __CLASS__, 'redirect_dashboard' ) );
	}

	public static function enqueue() {
		if ( ! ED_View_Mode::is_modern() ) return;
		wp_enqueue_style( 'ed-tokens', ED_DASH_URL . 'assets/css/tokens.css', array(), ED_DASH_VERSION );
		wp_enqueue_style( 'ed-admin-shell', ED_DASH_URL . 'assets/css/admin-shell.css', array( 'ed-tokens' ), ED_DASH_VERSION );
		wp_enqueue_script( 'ed-admin-shell', ED_DASH_URL . 'assets/js/admin-shell.js', array(), ED_DASH_VERSION, true );
	}

	/** Only redirect the default "post" list/editor — leave pages & CPTs on native screens. */
	public static function redirect_posts_list() {
		if ( ! ED_View_Mode::is_modern() ) return;
		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : 'post';
		if ( $post_type !== 'post' ) return;
		wp_safe_redirect( admin_url( 'admin.php?page=ed-posts' ) );
		exit;
	}

	public static function redirect_new_post() {
		if ( ! ED_View_Mode::is_modern() ) return;
		$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : 'post';
		if ( $post_type !== 'post' ) return;
		wp_safe_redirect( admin_url( 'admin.php?page=ed-editor' ) );
		exit;
	}

	public static function redirect_edit_post() {
		if ( ! ED_View_Mode::is_modern() ) return;
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		if ( ! $post_id || get_post_type( $post_id ) !== 'post' ) return;
		wp_safe_redirect( admin_url( 'admin.php?page=ed-editor&post_id=' . $post_id ) );
		exit;
	}

	/** Make the Posts page the default landing screen instead of wp-admin/ (index.php). */
	public static function redirect_dashboard() {
		if ( ! ED_View_Mode::is_modern() ) return;
		wp_safe_redirect( admin_url( 'admin.php?page=ed-posts' ) );
		exit;
	}

	public static function render_sidebar() {
		if ( ! ED_View_Mode::is_modern() ) return;

		$screen  = get_current_screen();
		$pagenow = isset( $GLOBALS['pagenow'] ) ? $GLOBALS['pagenow'] : '';
		$page    = isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : '';
		$is      = function( $test ) use ( $pagenow, $page ) {
			return $test === $page || $test === $pagenow;
		};

		$user  = wp_get_current_user();
		$initials = self::initials( $user->display_name ? $user->display_name : $user->user_login );
		?>
		<div class="ed-mobile-bar">
			<button type="button" id="ed-sidebar-toggle" class="ed-sidebar-toggle" aria-label="<?php esc_attr_e( 'Open menu', 'editorial-dashboard' ); ?>" aria-expanded="false" aria-controls="ed-sidebar">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
			</button>
			<div class="ed-mobile-bar-brand"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></div>
		</div>
		<div id="ed-sidebar-overlay"></div>
		<div id="ed-sidebar">
			<div class="ed-sidebar-brand"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></div>

			<a href="<?php echo esc_url( admin_url( 'admin.php?page=ed-editor' ) ); ?>" class="ed-btn ed-btn-primary ed-btn-block" style="justify-content:center;gap:8px">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
				New Post
			</a>

			<div class="ed-nav-group">
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=ed-posts' ) ); ?>" class="ed-nav-link<?php echo ( $is( 'ed-posts' ) || $is( 'ed-editor' ) ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'posts' ); ?> Posts
				</a>
				<?php if ( get_post_types_by_support( 'comments' ) ) : ?>
				<a href="<?php echo esc_url( admin_url( 'edit-comments.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'edit-comments.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'comments' ); ?> Comments
				</a>
				<?php endif; ?>
			</div>

			<div class="ed-nav-group">
				<div class="ed-nav-label">Design</div>
				<a href="<?php echo esc_url( admin_url( 'edit.php?post_type=page' ) ); ?>" class="ed-nav-link<?php echo $pagenow === 'edit.php' && $page === '' && ( isset( $_GET['post_type'] ) && $_GET['post_type'] === 'page' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'pages' ); ?> Pages
				</a>
				<a href="<?php echo esc_url( admin_url( 'nav-menus.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'nav-menus.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'menus' ); ?> Menus
				</a>
				<a href="<?php echo esc_url( admin_url( 'upload.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'upload.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'media' ); ?> Media
				</a>
				<a href="<?php echo esc_url( admin_url( 'themes.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'themes.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'themes' ); ?> Themes
				</a>
				<a href="<?php echo esc_url( admin_url( 'customize.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'customize.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'customize' ); ?> Customize
				</a>
			</div>

			<div class="ed-nav-group">
				<div class="ed-nav-label">Settings</div>
				<a href="<?php echo esc_url( admin_url( 'edit-tags.php?taxonomy=category&post_type=post' ) ); ?>" class="ed-nav-link<?php echo $is( 'edit-tags.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'categories' ); ?> Categories
				</a>
				<?php if ( current_user_can( 'list_users' ) ) : ?>
				<a href="<?php echo esc_url( admin_url( 'users.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'users.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'users' ); ?> Users
				</a>
				<?php endif; ?>
				<?php if ( current_user_can( 'activate_plugins' ) ) : ?>
				<a href="<?php echo esc_url( admin_url( 'plugins.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'plugins.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'plugins' ); ?> Plugins
				</a>
				<?php endif; ?>
				<a href="<?php echo esc_url( admin_url( 'tools.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'tools.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'tools' ); ?> Tools
				</a>
				<a href="<?php echo esc_url( admin_url( 'options-general.php' ) ); ?>" class="ed-nav-link<?php echo $is( 'options-general.php' ) ? ' is-active' : ''; ?>">
					<?php self::icon( 'settings' ); ?> Settings
				</a>
			</div>

			<?php
			$more_items  = self::more_menu_items( $is );
			$more_active = false;
			foreach ( $more_items as $item ) {
				if ( $item['active'] ) { $more_active = true; break; }
			}
			?>
			<?php if ( $more_items ) : ?>
			<details class="ed-nav-group ed-nav-more"<?php echo $more_active ? ' open' : ''; ?>>
				<summary class="ed-nav-label ed-nav-more-toggle">
					More
					<?php self::icon( 'chevron' ); ?>
				</summary>
				<?php foreach ( $more_items as $item ) : ?>
				<a href="<?php echo esc_url( $item['url'] ); ?>" class="ed-nav-link<?php echo $item['active'] ? ' is-active' : ''; ?>">
					<?php self::more_item_icon( $item['icon'] ); ?> <?php echo esc_html( $item['title'] ); ?>
				</a>
				<?php endforeach; ?>
			</details>
			<?php endif; ?>

			<div style="flex:1"></div>
			<div class="ed-hr" style="margin:var(--ed-space-1) 0"></div>

			<a href="<?php echo esc_url( admin_url( 'profile.php' ) ); ?>" class="ed-sidebar-user">
				<div class="ed-avatar"><?php echo esc_html( $initials ); ?></div>
				<div>
					<div class="ed-user-name"><?php echo esc_html( $user->display_name ); ?></div>
					<div class="ed-user-role"><?php echo esc_html( self::primary_role( $user ) ); ?></div>
				</div>
			</a>

			<a href="<?php echo esc_url( ED_View_Mode::toggle_url( 'classic' ) ); ?>" class="ed-nav-link ed-nav-link-muted">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
				Switch to classic view
			</a>
		</div>
		<?php
	}

	/** Any top-level admin menu item not already surfaced elsewhere in the sidebar — third-party plugins, custom post types, etc. */
	private static function more_menu_items( $is ) {
		global $menu;
		if ( empty( $menu ) || ! is_array( $menu ) ) return array();

		$core_slugs = array(
			'index.php',
			'edit.php',
			'upload.php',
			'edit.php?post_type=page',
			'edit-comments.php',
			'themes.php',
			'plugins.php',
			'users.php',
			'tools.php',
			'options-general.php',
		);

		$items = array();
		foreach ( $menu as $entry ) {
			$slug    = isset( $entry[2] ) ? $entry[2] : '';
			$classes = isset( $entry[4] ) ? $entry[4] : '';
			$cap     = isset( $entry[1] ) ? $entry[1] : 'read';

			if ( ! $slug || strpos( $classes, 'wp-menu-separator' ) !== false ) continue;
			if ( in_array( $slug, $core_slugs, true ) ) continue;
			if ( ! current_user_can( $cap ) ) continue;

			$title = isset( $entry[0] ) ? wp_strip_all_tags( $entry[0] ) : $slug;
			if ( ! $title ) continue;

			$url = ( strpos( $slug, '.php' ) !== false && strpos( $slug, '?' ) === false && strpos( $slug, '/' ) === false )
				? admin_url( $slug )
				: admin_url( 'admin.php?page=' . $slug );

			$items[] = array(
				'title'  => $title,
				'url'    => $url,
				'active' => $is( $slug ),
				'icon'   => isset( $entry[6] ) ? $entry[6] : '',
			);
		}
		return $items;
	}

	/** Renders a "More" item's own WP admin-menu icon (dashicon class, image/data URI, or a generic fallback). */
	private static function more_item_icon( $icon ) {
		if ( $icon && strpos( $icon, 'dashicons-' ) === 0 ) {
			echo '<span class="dashicons ' . esc_attr( $icon ) . '" style="width:16px;height:16px;font-size:16px;line-height:1"></span>';
			return;
		}
		if ( $icon && ( strpos( $icon, 'http' ) === 0 || strpos( $icon, 'data:image' ) === 0 ) ) {
			echo '<img src="' . esc_url( $icon ) . '" width="16" height="16" alt="" style="flex:none;object-fit:contain" />';
			return;
		}
		self::icon( 'plugin-generic' );
	}

	private static function primary_role( $user ) {
		$roles = $user->roles;
		return $roles ? ucfirst( $roles[0] ) : '';
	}

	private static function initials( $name ) {
		$parts = preg_split( '/\s+/', trim( $name ) );
		$parts = array_filter( $parts );
		if ( ! $parts ) return '?';
		if ( count( $parts ) === 1 ) return strtoupper( substr( $parts[0], 0, 2 ) );
		return strtoupper( substr( reset( $parts ), 0, 1 ) . substr( end( $parts ), 0, 1 ) );
	}

	private static function icon( $name ) {
		$icons = array(
			'posts'      => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
			'pages'      => '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="9" x2="9" y2="20"/>',
			'customize'  => '<path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
			'menus'      => '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
			'categories' => '<path d="M20.59 13.41 12 4.83 4.83 12l8.59 8.59a2 2 0 0 0 2.83 0l4.34-4.34a2 2 0 0 0 0-2.83z"/><circle cx="8" cy="8" r="1.2"/>',
			'themes'     => '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="8.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/><circle cx="9.5" cy="15.5" r="1"/>',
			'settings'   => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
			'tools'      => '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
			'media'      => '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
			'comments'   => '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
			'users'      => '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
			'plugins'    => '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" fill="currentColor" stroke="none"/>',
			'plugin-generic' => '<path d="M12 3v3.5a1.5 1.5 0 0 0 1.5 1.5H17a2 2 0 0 1 2 2v3.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 0 0-2 2V21"/><rect x="3" y="3" width="9" height="9" rx="1.5"/><path d="M3 14.5A1.5 1.5 0 0 1 4.5 13H9a2 2 0 0 1 2 2v6H4.5A1.5 1.5 0 0 1 3 19.5z"/>',
			'chevron'    => '<polyline points="9 6 15 12 9 18"/>',
		);
		$path = isset( $icons[ $name ] ) ? $icons[ $name ] : '';
		echo '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' . $path . '</svg>'; // phpcs:ignore -- static inline icon set, no user input
	}
}
