// Topbar: Jolly Roger, mission name (space), sail tabs (tabs of the shown space).
import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, focused, run, theme, settings } from "herdr";

export default class OnepieceNav extends View {
  render() {
    const t = theme();
    const f = focused();
    const space = spaces().find((s) => s.id === f?.space);
    const tabs = space?.tabs ?? [];
    return h_flex()
      .size_full()
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
          .on_click((_e, cx) => {
            const light = String(settings()?.theme ?? "").includes("light");
            run("app.theme", { name: light ? "onepiece-grandline" : "onepiece-grandline-light" });
            cx.notify();
          })
          .child(String(settings()?.theme ?? "").includes("light") ? "☀" : "☾"),
      )
      .child(div().text_size(10).text_color(t.dim).child("onepiece · grand line"));
  }
}
