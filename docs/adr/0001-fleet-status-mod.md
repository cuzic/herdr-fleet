# ADR 0001: Fleet status bar as a personal mod

Status: Accepted (Opus review 2026-11-27 via herdr-cocla job
01a21beb-29f0-7f50-8d33-9a94bfa545d5: approve-with-changes; 1 major +
7 minor findings, all applied below)
Date: 2026-11-27
Applies to: herdr-app 0.1.18 API. Single screen; multi-monitor out of scope.
Note: this ADR lives with the mod in its own `herdr-mod` repo, not
upstream (herdr-app has no ADR convention and the mod touches nothing
in it).

## Context

The person wants an xmonad/dwm-like, always-visible overview of what is
in progress versus done across spaces. What exists today:

- The agents list (main layout sidebar) groups by Needs you / Done /
  Working / Idle, but the Terminal layout — the person's daily driver —
  shows no agents or status anywhere except per-tab lead-pane dots for
  the active space only (`terminals-bar` `tile()`).
- Wide space rows show no agent status
  ([#112](https://github.com/herdrdev/herdr-app/issues/112), open; the
  fix PR [#223](https://github.com/herdrdev/herdr-app/pull/223) was
  closed unmerged). Compact rail rows show only ●/·.
- Related work: [#551](https://github.com/herdrdev/herdr-app/issues/551)
  (`pane.arrange`, tiling; built in a fork, awaiting Can — a separate
  concern, not this ADR), [herdr-dwm](https://github.com/pawann-2000/herdr-dwm)
  (a dwm bar with per-tab tags and urgent inversion),
  [herdr-omarchy](https://github.com/shafiqimtiaz/herdr-omarchy) (tiled
  terminal look).

Constraints: the app core stays small (AGENTS.md three questions — this
changes no app behavior, sees only what mods see, and mods can do it, so
it belongs in a mod). The prototype must need no core or shipped-mod
changes and must run on the released 0.1.18 API.

## Decision

Build a new **personal** mod, `fleet`: a one-strip fleet status bar.
One cell per space, always visible. Revisit shipping it only after the
prototype proves out; nothing here lands in `defaults/`.

1. **Data.** `spaces()` per-space status rollup (blocked > done >
   working > idle) plus `agents()` for per-space counts and the most
   urgent detail. Both are live and mods re-render on change, so v1
   needs no timers (no durations, no clock). v1 limitation: sub-agents
   without a pane are invisible to both sources (rollup covers pane
   addresses only, `src/model.rs:681,701`); folding in `terminals()`
   is deferred.
2. **Placement.** A 28px bottom strip in *cloned* layouts (a main
   clone and a Terminals clone; 28px matches main's status block, and
   Terminals has no bottom bar to crowd). Shipped layouts cannot gain
   blocks, and clones are the documented mechanism (`layout.clone`,
   edits never touch shipped originals). The mod ships `mod.json` as
   `{"place": "none", "title": "Fleet"}` and the strip blocks are added
   by editing the clone JSON: without `place: none` a first-seen mod
   auto-docks a 320px right column into the shown (cloned, hence
   personal) layout (`src/window.rs:4520-4528`).
3. **v1 interactions.** Click a cell: `space.select {id}`. Right-click:
   the space menu popup, exactly the sidebar's call
   (`defaults/mods/spaces/main.js:305`): `openOverlay({ mod: "menu",
   kind: "popup", width: 200, height: 260, props: { tab: "space",
   target: { id } } })`. Urgent-first ordering is out; cells stay in
   space order so indices stay stable. Mouse-first in v1; keys later
   bind in `global` or `layout:<clone>` to `fleet.<command>` via
   `nextCommand()` (a `mod:fleet` section only fires while the strip
   has keyboard focus, `src/keys.rs:124-125`).
4. **Cell content.** Index, truncated name, counts (`2w 1b` style), the
   active space marked. Urgent states inverted/highlighted dwm-style:
   blocked first, then done. Empty spaces (no agents) show dim with no
   counts so the strip stays scannable. Hover tooltip only: the most
   urgent agent's tab name and title, plus branch. No `working_since`
   in v1 (per-tab, and durations need a timer).
5. **Visuals.** `theme()` status colors and the agents mod's glyph
   language (`defaults/mods/agents/main.js:214-219`): spinner =
   working, `!` badge in `t.blocked` = blocked, filled dot = done,
   ring = idle. No hard-coded colors, so light and dark themes follow.
   Ship the mod's own spinner asset (`mods/fleet/spinner.svg`) rather
   than borrowing the shipped one, so a shared repo stays
   self-contained.
6. **Validation.** `herdr-app check` the mod; try it in the Linux
   sandbox (`scripts/sandbox`) on both layout clones with
   screenshots; write `RECIPE.md` + `preview.png` per the sharing
   guide so it can go up as a `herdr-mod` topic repo later.

## Alternatives considered

- **Overlay window with `keep` instead of a layout block.** Rejected:
  it floats above content, can be dismissed, and doesn't reflow the
  layout. A bar block is always in place by construction.
- **Wait for #112/#223 (dots on space rows).** Sidebar-only and stalled;
  doesn't help the Terminal layout. If dots land later, dots plus the
  bar overlap visually but serve different layouts — acceptable.
- **Extend herdr-dwm's bar.** Its tags are per-tab within the active
  space; this ADR wants per-space across all spaces. Different unit,
  different mod.
- **Core change (e.g. a status API or shipped bar).** Fails the
  three-questions test; the mod API already exposes everything needed.

## Consequences

- No core, shipped-mod, or shipped-layout changes; deleting the
  personal files removes it.
- Layout clones don't track shipped updates (documented Herdr
  behavior); note it in the RECIPE.
- `spaces()`/`agents()` snapshots render per change; fine at fleet
  scale (tens of spaces). Revisit if slow — no per-frame timers in v1.
- Name `fleet` is free among shipped mods; alternatives were `watch`,
  `overview`, `statusline`.

## Open questions (answered in review, folded into Decision above)

1. Bottom strip in both clones, 28px. (Matches main's status block;
   Terminals has no bottom bar to crowd.)
2. Counts only in the cell; hover tooltip with the most urgent agent's
   tab name and title, plus branch. `working_since` out of v1.
3. Mouse-first v1. Later keys bind in `global` or `layout:<clone>` to
   `fleet.<command>` via `nextCommand()`, not a `mod:fleet` section.
4. Everything used exists in 0.1.18 (live `spaces()`/`agents()`
   re-render, theme status colors, space menu overlay,
   `space.select {id}`, `layout.clone`, `herdr-app check`,
   `scripts/sandbox`).
