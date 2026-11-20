// Alur Command Center: Luffy delegates to the crew, live agent status on each node.
import { View, div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, appHome, readTextFile, run, theme } from "herdr";

const CREW = [
  { name: "Luffy", role: "Orchestrator", verb: "memimpin ekspedisi", tone: "accent" },
  { name: "Nami", role: "Navigator", verb: "memetakan rute", tone: "ansi3" },
  { name: "Zoro", role: "Refactorer", verb: "menebas bug", tone: "ansi2" },
  { name: "Franky", role: "DevOps", verb: "membangun infrastruktur", tone: "ansi4" },
  { name: "Robin", role: "Security", verb: "mengaudit kode", tone: "ansi5" },
  { name: "Usopp", role: "QA & Test", verb: "membidik edge case", tone: "ansi6" },
];
const W = 560;
const H = 200;
const LEFT = { x: 12, y: 72, w: 156, h: 56 };
const RIGHT = [8, 72, 136].map((y) => ({ x: 348, y, w: 170, h: 56 }));
const CHIPS = [12, 92].map((x) => ({ x, y: 146, w: 76, h: 22 }));
const GAP = { x: LEFT.x + LEFT.w, w: RIGHT[0].x - (LEFT.x + LEFT.w) };
const BUS = LEFT.y + LEFT.h / 2;

const statusWord = (a, verb) => {
  if (!a) return "siaga";
  if (a.status === "working") return verb;
  if (a.status === "blocked") return "tertahan";
  if (a.status === "done") return "selesai";
  return "siaga";
};

// Elbow connectors: one vertical bus off Luffy, one stub to each crew node; a short
// drop from Luffy's foot feeds the two reserve crew (Robin, Usopp).
function wires(t, list) {
  const first = RIGHT[0].y + RIGHT[0].h / 2;
  const last = RIGHT[2].y + RIGHT[2].h / 2;
  const top = Math.min(first, BUS);
  const height = Math.abs(last - top);
  const foot = LEFT.y + LEFT.h;
  const bus = CHIPS[0].y - 8;
  const stem = LEFT.x + LEFT.w / 2;
  const busFrom = CHIPS[0].x + CHIPS[0].w / 2;
  const busTo = CHIPS[1].x + CHIPS[1].w / 2;
  return [
    div().absolute().left(GAP.x).top(top).w(1).h(height).bg(t.border),
    div().absolute().left(GAP.x - 2).top(BUS - 2).w(5).h(5).rounded(3).bg(t.accent),
    ...RIGHT.map((r, i) => {
      const y = r.y + r.h / 2;
      const tone = list[i + 1] ? t[CREW[i + 1].tone] : t.border;
      return div().absolute().left(GAP.x).top(y).w(GAP.w).h(1).bg(tone);
    }),
    div().absolute().left(stem).top(foot).w(1).h(bus - foot).bg(t.border),
    div().absolute().left(busFrom).top(bus).w(busTo - busFrom).h(1).bg(t.border),
    ...CHIPS.map((c, i) => {
      const tone = list[i + 4] ? t[CREW[i + 4].tone] : t.border;
      return div().absolute().left(c.x + c.w / 2).top(bus).w(1).h(c.y - bus).bg(tone);
    }),
  ];
}

const avatarPath = (crew) => `mods/onepiece-alur/avatars/${crew.name.toLowerCase()}.png`;

export default class OnepieceAlur extends View {
  // Portraits are optional: `python3 make-avatars.py` drops them in; without them
  // the node keeps its initial badge.
  init(_props, cx) {
    this.avatars = new Set();
    this.load(cx);
    // Portraits can land after the mod mounted (fetch/make script), so re-read.
    cx.timer.every(15000, (cx) => this.load(cx));
  }

  load(cx) {
    const manifest = `${appHome()}/mods/onepiece-alur/avatars/index.json`;
    readTextFile(manifest)
      .then((text) => {
        const ids = JSON.parse(text ?? "{}").ids ?? [];
        if (ids.length === this.avatars.size && ids.every((id) => this.avatars.has(id))) return;
        this.avatars = new Set(ids);
        cx.notify();
      })
      .catch(() => {});
  }

  avatar(t, crew, size) {
    const tone = t[crew.tone] ?? t.accent;
    if (this.avatars.has(crew.name.toLowerCase())) {
      return image(avatarPath(crew)).size(size).flex_none().rounded(size / 2);
    }
    return div()
      .w(size)
      .h(size)
      .flex_none()
      .rounded(size / 2)
      .border(2)
      .border_color(tone)
      .flex()
      .items_center()
      .justify_center()
      .text_size(size >= 24 ? 10 : 7)
      .font_semibold()
      .text_color(tone)
      .child(size >= 24 ? crew.name.slice(0, 2).toUpperCase() : crew.name[0]);
  }

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
          .child(div().text_size(9).text_color(t.dim).child("delegasi kru · live"))
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
              .children(RIGHT.map((r, i) => this.node(t, cx, CREW[i + 1], list[i + 1], r)))
              .children(CHIPS.map((c, i) => this.chip(t, cx, CREW[i + 4], list[i + 4], c))),
          ),
      );
  }

  // Reserve crew: a pill instead of a card, still live and clickable.
  chip(t, cx, crew, agent, pos) {
    const tone = t[crew.tone] ?? t.accent;
    return h_flex()
      .id(`chip-${crew.name}`)
      .absolute()
      .left(pos.x)
      .top(pos.y)
      .w(pos.w)
      .h(pos.h)
      .gap(5)
      .items_center()
      .px(5)
      .rounded(11)
      .bg(t.surface)
      .border(1)
      .border_color(agent ? tone : t.border)
      .hover((s) => s.bg(t.raised))
      .cursor_pointer()
      .on_click((_e, cx) => {
        if (agent?.pane) run("pane.focus", { pane: agent.pane });
        cx.notify();
      })
      .child(this.avatar(t, crew, 14))
      .child(div().flex_1().min_w(0).truncate().text_size(9).text_color(t.muted).child(crew.name))
      .child(div().w(4).h(4).flex_none().rounded(2).bg(agent ? (t[agent.status] ?? t.unknown) : t.border));
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
      .child(this.avatar(t, crew, 30))
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
