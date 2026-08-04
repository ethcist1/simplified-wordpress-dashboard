# Simplified Dashboard

I love WordPress — it's powerful and versatile. But I think its biggest flaw
is cosmetic: the dashboard overwhelms casual users because it doesn't
prioritize the features people actually use. Even recent updates have
improved things under the hood without fixing the layout itself.

So for this plugin, I redesigned the layout — inspired by platforms like
Medium and Substack — around what people use 90% of the time. Posting-related
actions are front and center; everything else is secondary. Inside the
editor itself, the same logic applies: category, featured image, and content
are what you see first.

It's purely cosmetic — you can switch back to the classic view anytime.

<!-- ![Screenshot of the simplified dashboard](assets/screenshot.png) -->

A WordPress plugin that reskins wp-admin with a custom sidebar and
replaces the default Posts list and post editor with a simplified,
block-based writing experience. A "classic view" toggle lets any user fall
back to stock wp-admin at any time without deactivating the plugin.

## What it does

- **Admin shell** — hides the native wp-admin menu and renders a custom
  sidebar (navigation, branding, user info, view toggle) on every screen.
  Non-post screens (Pages, Media, Appearance, Users, Settings, etc.) stay on
  their native WordPress pages, just restyled.
- **Posts list** — replaces `edit.php` for the `post` post type with a
  custom card-list page backed by the core `/wp/v2/posts` REST endpoint.
- **Editor** — replaces `post.php` / `post-new.php` for the `post` post type
  with a simplified block-based editor page.
- **View mode** — per-user "modern" vs. "classic" preference, stored in user
  meta, toggled from the admin bar. Classic mode disables the reskin
  entirely and leaves wp-admin untouched.

Only the default `post` post type is affected. Pages and custom post types
are never redirected.

## File structure

```
simplified-dashboard.php         Plugin bootstrap, constants, hook registration
includes/
  class-view-mode.php            Modern/classic view state + toggle
  class-admin-shell.php          Sidebar rendering, screen redirects, enqueues
  class-posts-list-page.php      Custom Posts list admin page
  class-editor-page.php          Custom post editor admin page
assets/
  css/tokens.css                 Design tokens (colors, spacing, etc.)
  css/admin-shell.css            Sidebar / shell styles
  css/posts-list.css             Posts list page styles
  css/editor.css                 Editor page styles
  js/posts-list.js               Posts list page (wp-element + wp-api-fetch)
  js/editor.js                   Editor page
```

## Requirements

- WordPress (uses `wp-element` and `wp-api-fetch` from core, no build step
  or external JS dependencies)
- PHP 7.4+

## Installation

Place this directory in `wp-content/plugins/` and activate **Simplified
Dashboard** from the Plugins screen.

## Development

There is no build process — assets are plain CSS/JS enqueued directly. Edit
files under `assets/` and reload wp-admin to see changes.
