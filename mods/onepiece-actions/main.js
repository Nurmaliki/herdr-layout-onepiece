// SET SAIL / ANCHOR: start a fresh shell tab, or drop focus back on the terminal.
import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { focused, run, theme } from "herdr";

function action(t, id, label, sub, bg, fg, onClick) {
  return h_flex()
    .id(id)
    .flex_1()
    .h(40)
    .items_center()
    .justify_center()
    .gap(8)
    .rounded(8)
    .bg(bg)
    .hover((s) => s.opacity(0.9))
    .active((s) => s.opacity(0.8))
    .cursor_pointer()
    .on_click(onClick)
    .child(div().text_size(11).font_semibold().text_color(fg).child(label))
    .child(div().text_size(9).text_color(fg).opacity(0.75).child(sub));
}

export default class OnepieceActions extends View {
  render(cx) {
    const t = theme();
    return h_flex()
      .size_full()
      .px(8)
      .gap(8)
      .items_center()
      .bg(t.background)
      .child(
        action(t, "set-sail", "SET SAIL", "Run", t.solid, t.solid_foreground, (_e, cx) => {
          run("terminal.open", { place: "tab" });
          cx.notify();
        }),
      )
      .child(
        action(t, "anchor", "ANCHOR", "Pause", t.accent, t.accent_foreground, (_e, cx) => {
          const f = focused();
          if (f?.pane) run("pane.focus", { pane: f.pane });
          cx.notify();
        }),
      );
  }
}
