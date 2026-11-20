// Alur Command Center: Luffy delegates to the crew, live agent status on each node.
import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, run, theme } from "herdr";

const CREW = [
  { name: "Luffy", role: "Orchestrator", verb: "memimpin ekspedisi", tone: "accent" },
  { name: "Nami", role: "Navigator", verb: "memetakan rute", tone: "ansi3" },
  { name: "Zoro", role: "Refactorer", verb: "menebas bug", tone: "ansi2" },
  { name: "Franky", role: "DevOps", verb: "membangun infrastruktur", tone: "ansi4" },
];
const W = 560;
const H = 200;
const LEFT = { x: 12, y: 72, w: 156, h: 56 };
const RIGHT = [8, 72, 136].map((y) => ({ x: 348, y, w: 170, h: 56 }));
const GAP = { x: LEFT.x + LEFT.w, w: RIGHT[0].x - (LEFT.x + LEFT.w) };
const BUS = LEFT.y + LEFT.h / 2;

const statusWord = (a, verb) => {
  if (!a) return "siaga";
  if (a.status === "working") return verb;
  if (a.status === "blocked") return "tertahan";
  if (a.status === "done") return "selesai";
  return "siaga";
};

// Elbow connectors: one vertical bus off Luffy, one stub to each crew node.
function wires(t, list) {
  const first = RIGHT[0].y + RIGHT[0].h / 2;
  const last = RIGHT[2].y + RIGHT[2].h / 2;
  const top = Math.min(first, BUS);
  const height = Math.abs(last - top);
  return [
    div().absolute().left(GAP.x).top(top).w(1).h(height).bg(t.border),
    div().absolute().left(GAP.x - 2).top(BUS - 2).w(5).h(5).rounded(3).bg(t.accent),
    ...RIGHT.map((r, i) => {
      const y = r.y + r.h / 2;
      const tone = list[i + 1] ? t[CREW[i + 1].tone] : t.border;
      return div().absolute().left(GAP.x).top(y).w(GAP.w).h(1).bg(tone);
    }),
  ];
}

export default class OnepieceAlur extends View {
  render(cx) {
    const t = theme();
    const list = agents();
    const lead = list[0] ?? null;
    return v_flex()
      .size_full()
      .min_h(0)
      .bg(t.background)
      .border_b(1)
      .border_color(t.border)
      .child(
        h_flex().px(12).h(24).flex_none().gap(8).items_center()
          .child(div().text_size(10).font_semibold().text_color(t.accent).child("ALUR COMMAND CENTER"))
          .child(div().text_size(9).text_color(t.dim).child("delegasi kru · live")),
      )
      .child(
        h_flex()
          .flex_1()
          .min_h(0)
          .justify_center()
          .items_center()
          .child(
            div()
              .relative()
              .flex_none()
              .w(W)
              .h(H)
              .children(wires(t, list))
              .child(this.node(t, cx, CREW[0], lead, LEFT))
              .children(RIGHT.map((r, i) => this.node(t, cx, CREW[i + 1], list[i + 1], r))),
          ),
      );
  }

  node(t, cx, crew, agent, pos) {
    const tone = t[crew.tone] ?? t.accent;
    const working = agent?.status === "working";
    return h_flex()
      .id(`node-${crew.name}`)
      .absolute()
      .left(pos.x)
      .top(pos.y)
      .w(pos.w)
      .h(pos.h)
      .gap(8)
      .items_center()
      .px(10)
      .rounded(10)
      .bg(t.surface)
      .border(1)
      .border_color(agent ? tone : t.border)
      .when(agent?.focused, (el) => el.bg(t.raised))
      .hover((s) => s.bg(t.raised))
      .cursor_pointer()
      .on_click((_e, cx) => {
        if (agent?.pane) run("pane.focus", { pane: agent.pane });
        cx.notify();
      })
      .child(
        div()
          .w(30)
          .h(30)
          .flex_none()
          .rounded(15)
          .border(2)
          .border_color(tone)
          .flex()
          .items_center()
          .justify_center()
          .text_size(10)
          .font_semibold()
          .text_color(tone)
          .child(crew.name.slice(0, 2).toUpperCase()),
      )
      .child(
        v_flex().min_w(0).flex_1().gap(1)
          .child(
            h_flex().gap(5).items_center()
              .child(div().text_size(11).font_semibold().text_color(t.foreground).child(crew.name))
              .child(div().text_size(9).text_color(t.dim).child(crew.role)),
          )
          .child(
            h_flex().gap(4).items_center()
              .when(working, (el) =>
                el.child(
                  div().w(5).h(5).flex_none().rounded(3).bg(tone)
                    .loop("opacity", { from: 0.25, to: 1, period: 1100 }),
                ),
              )
              .when(!working, (el) =>
                el.child(
                  div().w(5).h(5).flex_none().rounded(3)
                    .bg(agent ? (t[agent.status] ?? t.unknown) : t.border),
                ),
              )
              .child(div().text_size(9).truncate().text_color(t.muted).child(statusWord(agent, crew.verb))),
          ),
      );
  }
}
