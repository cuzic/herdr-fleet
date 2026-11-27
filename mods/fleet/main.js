// Fleet: every space's agents at a glance, one strip. Click a cell to
// show its space, right-click for the space menu. Blocked inverts,
// done tints. Live: re-renders when spaces or agents change.
import { View, div, svg } from "gpui-kit";
import { h_flex, ScrollHandle } from "gpui-base";
import { spaces, agents, run, openOverlay, theme } from "herdr";

// Same urgency order as the shipped agents list.
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
const rankOf = (a) => RANK[a.status] ?? 0;

export default class Fleet extends View {
  init(_props, _cx) {
    this.scroll = ScrollHandle.new();
    this.revealed = null;
  }

  // The agents mod's glyph language: spinner, ! badge, dot, ring.
  // Inverted (blocked) cells get a white ! so it stays readable.
  glyph(t, status, inverted) {
    if (status === "working") return svg("mods/fleet/spinner.svg").size(12).flex_none().text_color(t.working).spin(900);
    if (status === "blocked" && inverted) return div().size(14).flex_none().rounded(4).bg("#ffffff2e").text_size(10.5).font_bold().text_color("#ffffff").flex().items_center().justify_center().child("!");
    if (status === "blocked") return div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
    if (status === "done") return div().size(7).mx(3).flex_none().rounded(4).bg(t.done);
    if (status === "idle") return div().size(7).mx(3).flex_none().rounded(4).border(1.5).border_color(t.idle ?? t.dim);
    return div().size(7).mx(3).flex_none();
  }

  cell(s, i, mine, t) {
    const inverted = s.status === "blocked";
    const tinted = s.status === "done";
    const fg = inverted ? "#ffffff" : mine.length ? t.foreground : t.dim;
    const dim = inverted ? "#ffffff" : t.muted;
    const counts = ["blocked", "done", "working"]
      .map((k) => {
        const n = mine.filter((a) => a.status === k).length;
        return n ? `${n}${k[0]}` : null;
      })
      .filter(Boolean)
      .join(" ");
    const top = [...mine].sort((a, b) => rankOf(b) - rankOf(a) || (b.seq ?? 0) - (a.seq ?? 0))[0];
    const tip = top
      ? `${top.tab_name} · ${top.title}` + (s.branch ? ` (${s.branch})` : "")
      : mine.length ? "All idle" : s.folder;
    return h_flex().id(`fleet-${s.id}`).flex_none().h_full().px(8).gap(6).items_center().rounded(6)
      .text_color(fg).cursor_pointer()
      .when(inverted, (el) => el.bg(t.blocked))
      .when(!inverted && tinted, (el) => el.bg(t.done + "22"))
      .when(!inverted && !tinted && !s.active, (el) => el.hover((ss) => ss.bg(t.hover)))
      .when(!inverted && !tinted && s.active, (el) => el.bg(t.selected))
      .when(s.active, (el) => el.border_b(2).border_color(t.accent))
      .on_click(() => run("space.select", { id: s.id }))
      .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: s.id } } }))
      .tooltip(tip)
      .child(div().text_size(11).text_color(dim).child(String(i + 1)))
      .child(div().max_w(140).truncate().text_size(12).when(s.active, (el) => el.font_semibold()).child(s.name))
      .when(Boolean(counts), (el) => el.child(div().text_size(11).text_color(dim).child(counts)))
      .child(this.glyph(t, mine.length ? (s.status ?? "idle") : null, inverted));
  }

  render() {
    const t = theme();
    const list = spaces();
    const all = agents();
    const cells = list.map((s, i) => this.cell(s, i, all.filter((a) => a.space === s.id), t));
    const at = list.findIndex((s) => s.active);
    if (list[at]?.id !== this.revealed) {
      this.revealed = list[at]?.id ?? null;
      if (at >= 0) this.scroll.scroll_to_item(at);
    }
    return h_flex().size_full().bg(t.chrome).border_t(1).border_color(t.border).px(6).gap(4).items_center()
      .child(h_flex().id("fleet-scroll").flex_1().min_w(0).h_full().items_center().gap(4).overflow_x_scrollbar().track_scroll(this.scroll)
        .children(cells.length ? cells : [div().px(8).text_size(11.5).text_color(t.dim).child("No spaces — open one to see it here")]));
  }
}
