// Parchment inspector: mission, Sunny's Integrity, map + Log Pose, bounty progress.
import { View, div, PathBuilder, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, focused, spaces, terminals, theme, shared } from "herdr";

const PAPER = "#F4ECD8";
const PAPER_DARK = "#E6D8B8";
const INK = "#2B2118";
const MUTED = "#5C4938";
const FRAME = "#8C6D46";

const pct = (n, d) => (d ? Math.round((100 * n) / d) : 100);

function bar(fill, value) {
  return div()
    .w_full()
    .h(6)
    .rounded(3)
    .bg(PAPER_DARK)
    .border(1)
    .border_color(FRAME)
    .child(div().h(4).w(`${Math.max(0, Math.min(100, value))}%`).rounded(2).bg(fill));
}

function section(title, children) {
  return v_flex()
    .w_full()
    .gap(4)
    .child(div().text_size(9).text_color(MUTED).child(title))
    .children(children);
}

export default class OnepieceInspector extends View {
  render() {
    const t = theme();
    const f = focused();
    const space = spaces().find((s) => s.id === f?.space);
    const list = agents();
    const working = list.filter((a) => a.status === "working");
    const blocked = list.filter((a) => a.status === "blocked");
    const hit = pct(list.length - blocked.length, list.length);
    const mode = working.length ? "RUN" : blocked.length ? "REVIEW" : "IDLE";
    const tally = terminals().length;

    const route = PathBuilder.stroke(1.4)
      .dash_array([3, 3])
      .move_to(6, 34)
      .cubic_bezier_to(22, 6, 34, 52, 48, 22)
      .line_to(62, 30)
      .build();

    return v_flex()
      .size_full()
      .min_h(0)
      .bg(PAPER)
      .border_l(1)
      .border_color(FRAME)
      .p(10)
      .gap(10)
      .overflow_y_scrollbar()
      .child(
        v_flex().gap(2)
          .child(div().text_size(9).text_color(MUTED).child("MISSION"))
          .child(
            h_flex().gap(6).items_center()
              .child(div().text_size(12).font_semibold().text_color(INK).truncate()
                .child(space?.name || "Grand Line")),
          )
          .child(
            h_flex().gap(6).items_center()
              .child(div().px(6).h(16).rounded(4).bg(INK).flex().items_center()
                .child(div().text_size(8).font_semibold().text_color(PAPER).child(mode)))
              .child(div().text_size(9).text_color(MUTED).child(f?.cwd || "—")),
          ),
      )
      .child(div().w_full().h(1).bg(FRAME))
      .child(
        section("SUNNY'S INTEGRITY", [
          h_flex().justify_between().items_center()
            .child(div().text_size(10).text_color(INK).child(`${hit}%`))
            .child(div().text_size(9).text_color(MUTED).child(`${blocked.length} tertahan`)),
          bar(INK, hit),
        ]),
      )
      .child(
        h_flex().w_full().gap(8).items_center()
          .child(
            div().relative().w(68).h(44).rounded(4).bg(PAPER_DARK).border(1).border_color(FRAME)
              .child(window.paint_path(route, FRAME).absolute().left(0).top(0).size_full()),
          )
          .child(
            image("mods/onepiece-inspector/compass.svg")
              .size(46)
              .flex_none()
              .when(working.length > 0, (el) => el.spin(6000)),
          )
          .child(
            v_flex().flex_1().min_w(0).gap(1)
              .child(div().text_size(9).text_color(MUTED).child("LOG POSE"))
              .child(div().text_size(10).text_color(INK).truncate()
                .child(space?.branch || "rute belum dibaca"))
              .child(div().text_size(9).text_color(MUTED).truncate()
                .child(space?.machine || "mesin ini")),
          ),
      )
      .child(div().w_full().h(1).bg(FRAME))
      .child(
        section("BOUNTY PROGRESS", [
          h_flex().justify_between()
            .child(div().text_size(9).text_color(MUTED).child("Progres tugas"))
            .child(div().text_size(9).text_color(INK)
              .child(`${working.length}/${list.length || 0} aktif`)),
          bar(INK, pct(working.length, list.length)),
          h_flex().justify_between()
            .child(div().text_size(9).text_color(MUTED).child("System integrity"))
            .child(div().text_size(9).text_color(INK).child(`${tally} terminal`)),
          bar(MUTED, hit),
        ]),
      )
      .child(div().flex_1())
      .child(
        h_flex()
          .id("denden")
          .w_full()
          .h(30)
          .gap(8)
          .items_center()
          .px(8)
          .rounded(6)
          .bg(PAPER_DARK)
          .border(1)
          .border_color(FRAME)
          .when(blocked.length > 0, (el) => el.loop("opacity", { from: 0.6, to: 1, period: 900 }))
          .child(div().text_size(12).text_color(INK).child("@"))
          .child(
            div().text_size(9).text_color(MUTED).truncate()
              .child(blocked.length ? `${blocked.length} kru minta perhatian` : `Den Den Mushi · ${shared("onepiece.section") ?? "voyages"}`),
          ),
      );
  }
}
