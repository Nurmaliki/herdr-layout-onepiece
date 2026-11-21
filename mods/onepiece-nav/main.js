// Topbar: Jolly Roger, mission name (space), sail tabs (tabs of the shown space).
import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { appHome, focused, readTextFile, run, settings, spaces, theme, writeTextFile } from "herdr";

// Appearance in settings.json decides which theme slot is used, so the switch has
// to move both: writing only app.theme gets overridden by the appearance slot.
function toggleTheme(cx) {
  const path = `${appHome()}/settings.json`;
  readTextFile(path)
    .then((text) => {
      const s = JSON.parse(text ?? "{}");
      const toDark = String(s.theme ?? "").includes("light");
      s.theme = toDark ? "onepiece-grandline" : "onepiece-grandline-light";
      s.appearance = toDark ? "dark" : "light";
      return writeTextFile(path, JSON.stringify(s, null, 2) + "\n", text ?? null).then(() => s.theme);
    })
    .then((name) => {
      run("app.theme", { name });
      cx.notify();
    })
    .catch(() => {});
}

export default class OnepieceNav extends View {
  init(_props, cx) {
    let seen = String(settings()?.theme ?? "");
    cx.timer.every(1000, (cx) => {
      const now = String(settings()?.theme ?? "");
      if (now === seen) return;
      seen = now;
      cx.notify();
    });
  }

  // The layout has no media queries; hiding a whole zone is the only responsive
  // knob. The topbar spans the window, so its width is the window width.
  // ponytail: two fixed breakpoints, not per-zone negotiation — move to a real
  // size query in the runtime if it grows one.
  fit(width) {
    const hidden = width < 980 ? ["panel", "alur"] : width < 1200 ? ["panel"] : [];
    const was = this.off ?? (this.off = {});
    for (const id of ["panel", "alur"]) {
      const off = hidden.includes(id);
      if (was[id] === off) continue;
      was[id] = off;
      run(off ? "layout.hide" : "layout.show", { id });
    }
  }

  render() {
    const t = theme();
    const f = focused();
    const space = spaces().find((s) => s.id === f?.space);
    const tabs = space?.tabs ?? [];
    return h_flex()
      .size_full()
      .on_size_change(({ width }) => this.fit(width))
      .px(12)
      .gap(10)
      .items_center()
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .child(svg("mods/onepiece-nav/jolly.svg").size(18).flex_none().text_color(t.accent))
      .child(div().text_size(11).font_semibold().text_color(t.accent).child("GRAND LINE"))
      .child(div().w(1).h(16).flex_none().bg(t.border))
      .child(div().text_size(10).text_color(t.dim).child("MISSION"))
      .child(
        div()
          .id("mission")
          .px(8)
          .h(22)
          .rounded(6)
          .flex()
          .items_center()
          .text_size(12)
          .text_color(t.foreground)
          .hover((s) => s.bg(t.hover))
          .cursor_pointer()
          .on_click((_e, cx) => {
            run("space.next");
            cx.notify();
          })
          .child(space?.name ?? "—"),
      )
      .child(
        h_flex()
          .flex_1()
          .min_w(0)
          .gap(4)
          .items_center()
          .overflow_x_scroll()
          .children(
            tabs.map((tab) =>
              div()
                .id(`tab-${tab.id}`)
                .px(8)
                .h(22)
                .flex_none()
                .rounded(6)
                .flex()
                .items_center()
                .text_size(11)
                .when(tab.id === f?.tab, (el) => el.bg(t.selected).text_color(t.foreground))
                .when(tab.id !== f?.tab, (el) => el.text_color(t.muted))
                .hover((s) => s.bg(t.hover))
                .cursor_pointer()
                .on_click((_e, cx) => {
                  run("tab.select", { id: tab.id });
                  cx.notify();
                })
                .child(`⚙ ${tab.name || "task"}`),
            ),
          )
          .child(
            div()
              .id("new-tab")
              .w(22)
              .h(22)
              .flex_none()
              .rounded(6)
              .flex()
              .items_center()
              .justify_center()
              .text_size(12)
              .text_color(t.dim)
              .hover((s) => s.bg(t.hover).text_color(t.foreground))
              .cursor_pointer()
              .on_click((_e, cx) => {
                run("tab.new");
                cx.notify();
              })
              .child("+"),
          ),
      )
      .child(
        div()
          .id("theme-toggle")
          .w(22)
          .h(22)
          .flex_none()
          .rounded(6)
          .flex()
          .items_center()
          .justify_center()
          .text_size(11)
          .text_color(t.muted)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .cursor_pointer()
          .on_click((_e, cx) => toggleTheme(cx))
          .child(String(settings()?.theme ?? "").includes("light") ? "☀" : "☾"),
      )
      .child(div().text_size(10).text_color(t.dim).child("onepiece · grand line"));
  }
}
