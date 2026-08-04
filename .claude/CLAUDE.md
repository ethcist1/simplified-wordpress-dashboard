# Simplified Dashboard — instructions for Claude

WordPress plugin that reskins wp-admin: custom sidebar, custom Posts list,
custom post editor, with a per-user "classic view" escape hatch. See
[README.md](../README.md) for the full overview.

## Conventions

- PHP follows WordPress coding standards: tabs for indentation, Yoda
  conditions avoided but `! defined( 'ABSPATH' ) exit;` guard at the top of
  every file, `array()` (not `[]`) is used inconsistently — match the
  surrounding file, not a fixed rule.
- All classes are static-method singletons named `ED_*`, each with an
  `init()` that wires WordPress hooks. Follow this pattern for new features
  rather than introducing instances, DI, or a different structure.
- Global constants (`ED_DASH_VERSION`, `ED_DASH_DIR`, `ED_DASH_URL`,
  `ED_DASH_FILE`) are defined once in `editorial-dashboard.php`. Use them
  instead of re-deriving paths/URLs.
- No build step. JS uses core WordPress scripts (`wp-element`,
  `wp-api-fetch`) enqueued as WP script handles — no bundler, no npm
  dependencies, no JSX/TSX compile step. Keep it that way unless the user
  asks to introduce one.
- Data flows through core REST endpoints (e.g. `/wp/v2/posts`) via
  `wp-api-fetch`, not custom REST routes or direct DB queries — prefer this
  for any new list/editor features unless there's a concrete reason not to.

## Behavior rules to preserve

- Only the default `post` post type is ever redirected to the custom
  pages/editor. Pages and other custom post types must keep working on
  stock WordPress screens — don't broaden redirects without being asked.
- Everything the reskin does must be gated behind `ED_View_Mode::is_modern()`
  so "classic view" fully and immediately reverts to stock wp-admin. Any new
  enqueue, redirect, or render added to the shell needs this same gate.
- Sanitize/escape input and output the way the existing code does
  (`sanitize_key`, `absint`, `esc_url`, `esc_html`, nonces via
  `check_admin_referer` / `wp_nonce_url`) — this is a WordPress admin-area
  plugin, treat all `$_GET`/`$_POST` as untrusted.

## Testing changes

There's no automated test suite. Verify changes by activating the plugin in
a local WordPress install and checking both view modes (modern sidebar/list/
editor, and the classic-view toggle back to stock wp-admin) in the browser.
