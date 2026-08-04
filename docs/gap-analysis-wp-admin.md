# Simplified Dashboard vs. Classic wp-admin — Gap Analysis

_Last updated: 2026-07-23_

## What the plugin actually does

**Simplified Dashboard** is a thin UI reskin, scoped almost entirely to the built-in `post` post type:

- Custom sidebar/admin shell replacing the wp-admin menu (`includes/class-admin-shell.php`)
- Custom Posts list page at `admin.php?page=ed-posts` — React card list, search, status filter (All/Published/Draft), Edit/Preview/Trash actions. No bulk actions, no quick-edit, flat `per_page=50` (no real pagination).
- Custom Editor page at `admin.php?page=ed-editor` — simplified `contentEditable` block editor (paragraph, heading, image, list, quote, code, embed), single-category picker, featured image via core Media modal, publish date, author picker (if `edit_others_posts`).
- "Classic view" toggle (per-user meta) that fully reverts to stock wp-admin.
- Everything else (Pages, CPTs, Users, Plugins, Themes, Settings, Menus, Comments, Media Library screen) is just linked out to native wp-admin — untouched, not reimplemented.
- No custom REST routes (consumes only core `/wp/v2/posts`), no custom capabilities/roles, no widgets, import/export, or revisions support.

## Core wp-admin functions NOT covered by the plugin

Grouped by area, with why it matters for a "Simplified Dashboard" specifically:

### Content editing gaps (within its own scope: `post` type)
- **Tags** — editor only supports a single category; no tag input at all (classic editor has both).
- **Multiple categories** — only one category selectable, vs. wp-admin's multi-select checkbox tree.
- **Post excerpt field** — not present in the custom editor.
- **Custom fields / meta boxes** — no extensibility point; any plugin/theme meta boxes registered for `post` (SEO fields, ACF fields, etc.) are invisible in the modern editor and only reachable via classic view.
- **Revisions** — no revision history/compare UI; classic wp-admin's revision browser is bypassed entirely.
- **Comments per-post (open/closed toggle, comment moderation from the post)** — not exposed.
- **Sticky posts** — no toggle.
- **Post format** — not exposed.
- **Scheduling nuance** — only a single date field; no distinction between "Publish immediately" vs. future-dated scheduling UI/status feedback.
- **Full Gutenberg block library** — only 7 block types supported (paragraph, heading, image, list, quote, code, embed); no tables, columns, buttons, galleries, reusable blocks, or any block plugin's custom blocks.
- **Bulk actions** on the list page (bulk trash/publish/category-change) — classic `edit.php` has this; ed-posts does not.
- **Quick Edit** — not available.
- **Full pagination / sorting controls** — list is capped at 50 items, no sort-by-column.
- **Password-protected / private post visibility controls** — not surfaced in the editor UI.

### Content types entirely out of scope
- **Pages** — untouched (fine, just a native link, but "Simplified Dashboard" branding implies pages might belong).
- **Custom post types** — any CPT (e.g., products, portfolio items, testimonials) has zero coverage; plugin explicitly limits itself to `post`.
- **Media Library management** — no custom grid/list, bulk actions, or editing of existing media items (only the picker for inserting images).

### Site administration (all just outbound links to native screens — no reimplementation, not necessarily gaps but worth flagging as "not part of the dashboard experience")
- Users & roles management (create/edit users, change roles/capabilities)
- Plugins management (install/activate/deactivate/update)
- Themes & Customizer
- Settings (General, Reading, Writing, Discussion, Permalinks, Privacy)
- Nav menus (Appearance > Menus)
- Widgets
- Tools (Import/Export, Site Health)
- Comment moderation queue

### Workflow features a real "editorial" dashboard typically needs but neither the plugin nor classic wp-admin natively provides
- Custom editorial statuses (e.g., "In Review", "Needs Edits") — classic WP only has Draft/Pending/Publish/Future/Private.
- Content calendar view.
- Author/editor assignment or task tracking.
- Notifications/activity feed.

(These are gaps relative to a full editorial workflow tool, not gaps relative to classic wp-admin specifically — noted for completeness since the plugin's name implies this ambition.)

## Suggested next step

If closing any of these gaps, prioritize the "content editing gaps" (tags, meta boxes, revisions, bulk actions) first — those are the ones that make the custom editor a downgrade from classic editing for real editorial use, as opposed to the site-administration items which are reasonably left to native screens.
