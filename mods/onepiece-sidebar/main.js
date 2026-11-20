// Sidebar: Jolly Roger, Voyages/Crew/Log Pose/Bounty, WANTED card with Belly score.
import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, terminals, focused, run, theme, shared, setShared } from "herdr";

const PAPER = "#F4ECD8";
const PAPER_DARK = "#E6D8B8";
const INK = "#2B2118";
const INK_MUTED = "#5C4938";
const FRAME = "#8C6D46";
const MENU = [
  ["voyages", "Voyages", "i-voyages.svg"],
  ["crew", "Crew", "i-crew.svg"],
  ["logpose", "Log Pose", "i-logpose.svg"],
  ["bounty", "Bounty", "i-bounty.svg"],
];

const rupiah = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Ship's purse: grows with finished agents and live terminals; never shrinks.
function belly() {
  const done = agents().filter((a) => a.status === "done").length;
  const base = 5000000 + done * 50000 + terminals().length * 250000;
  try {
    const store = window.localStorage;
    const kept = Number(store.getItem("onepiece.belly") || 0);
    const best = Math.max(base, kept);
    if (best > kept) store.setItem("onepiece.belly", String(best));
    return best;
  } catch {
    return base;
  }
}

function dot(t, status) {
  return div().w(6).h(6).flex_none().rounded(4).bg(t[status] ?? t.unknown);
}

function row(t, id, onClock, children) {
  return h_flex()
    .id(id)
    .h(28)
    .px(8)
    .gap(8)
    .flex_none()
    .items_center()
    .rounded(6)
    .hover((s) => s.bg(t.hover))
    .cursor_pointer()
    .on_click(onClock)
    .children(children);
}

export default class OnepieceSidebar extends View {
  render(cx) {
    const t = theme();
    const section = shared("onepiece.section") ?? "voyages";
    const f = focused();
    const space = spaces().find((s) => s.id === f?.space);
    return v_flex()
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .border_r(1)
      .border_color(t.border)
      .child(
        h_flex()
          .px(12)
          .h(44)
          .flex_none()
          .gap(8)
          .items_center()
          .child(svg("mods/onepiece-sidebar/jolly.svg").size(20).text_color(t.accent))
          .child(div().text_size(12).font_semibold().text_color(t.accent).child("HERDR")),
      )
      .child(
        v_flex()
          .px(8)
          .gap(2)
          .flex_none()
          .children(
            MENU.map(([key, label, icon]) =>
              h_flex()
                .id(`menu-${key}`)
                .h(28)
                .px(8)
                .gap(8)
                .items_center()
                .rounded(6)
                .when(section === key, (el) => el.bg(t.selected))
                .hover((s) => s.bg(t.hover))
                .cursor_pointer()
                .on_click((_e, cx) => {
                  setShared("onepiece.section", key);
                  cx.notify();
                })
                .child(
                  svg(`mods/onepiece-sidebar/${icon}`)
                    .size(13)
                    .flex_none()
                    .text_color(section === key ? t.accent : t.muted),
                )
                .child(
                  div()
                    .text_size(11)
                    .when(section === key, (el) => el.text_color(t.foreground))
                    .when(section !== key, (el) => el.text_color(t.muted))
                    .child(label),
                ),
            ),
          ),
      )
      .child(
        v_flex()
          .flex_1()
          .min_h(0)
          .px(8)
          .pt(8)
          .gap(2)
          .overflow_y_scrollbar()
          .when(section === "voyages", (el) =>
            el.children(
              spaces().map((s) =>
                row(t, `sp-${s.id}`, (_e, cx) => {
                  run("space.select", { id: s.id });
                  cx.notify();
                }, [
                  dot(t, s.status ?? "unknown"),
                  div()
                    .flex_1()
                    .min_w(0)
                    .truncate()
                    .text_size(11)
                    .text_color(s.id === f?.space ? t.foreground : t.muted)
                    .child(s.name || "space"),
                ]),
              ),
            ),
          )
          .when(section === "crew", (el) =>
            el.children(
              agents().length
                ? agents().map((a) =>
                    row(t, `ag-${a.address}`, (_e, cx) => {
                      run("pane.focus", { pane: a.pane });
                      cx.notify();
                    }, [
                      dot(t, a.status),
                      div()
                        .flex_1()
                        .min_w(0)
                        .truncate()
                        .text_size(11)
                        .text_color(t.muted)
                        .child(a.title || a.program?.name || a.address),
                    ]),
                  )
                : [div().px(8).py(6).text_size(10).text_color(t.dim).child("belum ada kru aktif")],
            ),
          )
          .when(section === "logpose", (el) =>
            el.gap(6).children([
              h_flex().gap(6).items_center().child(div().text_size(11).text_color(t.accent).child("✦"))
                .child(div().text_size(11).text_color(t.foreground).child(space?.name || "—")),
              div().text_size(10).text_color(t.muted).child(f?.cwd || "—"),
              div().text_size(10).text_color(t.muted).child(space?.branch || "tanpa cabang"),
              div().text_size(10).text_color(t.dim).child(space?.machine || "mesin ini"),
            ]),
          )
          .when(section === "bounty", (el) =>
            el.gap(6).children([
              div().text_size(11).text_color(t.foreground).child(`Belly ฿ ${rupiah(belly())}`),
              div().text_size(10).text_color(t.muted).child(`${terminals().length} terminal`),
              div().text_size(10).text_color(t.muted)
                .child(`${agents().filter((a) => a.status === "done").length} misi selesai`),
            ]),
          ),
      )
      .child(
        v_flex()
          .m(8)
          .flex_none()
          .bg(PAPER)
          .border(2)
          .border_color(FRAME)
          .p(8)
          .gap(3)
          .child(
            div().w_full().text_size(10).text_color(INK_MUTED).child("WANTED"),
          )
          .child(
            h_flex().gap(8).items_center().child(
              div()
                .w(34)
                .h(34)
                .rounded(17)
                .flex_none()
                .bg(PAPER_DARK)
                .border(1)
                .border_color(FRAME)
                .flex()
                .items_center()
                .justify_center()
                .text_size(11)
                .text_color(INK)
                .child((space?.name || "SH").slice(0, 2).toUpperCase()),
            ).child(
              v_flex().min_w(0).flex_1().child(
                div().truncate().text_size(11).font_semibold().text_color(INK)
                  .child((space?.name || "Straw Hat").toUpperCase()),
              ).child(
                div().text_size(9).text_color(INK_MUTED).child("DEAD OR ALIVE"),
              ),
            ),
          )
          .child(div().w_full().h(1).bg(FRAME))
          .child(
            h_flex().justify_between().items_center()
              .child(div().text_size(9).text_color(INK_MUTED).child("Belly"))
              .child(div().text_size(12).font_semibold().text_color(INK).child(`฿ ${rupiah(belly())}`)),
          ),
      );
  }
}
