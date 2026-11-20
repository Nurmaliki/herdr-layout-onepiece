// Crew chat: live crew roster as a message feed, input sends to the focused agent.
import { View, div, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, focused, hc, run, theme } from "herdr";

const LABEL = {
  working: "sedang bekerja",
  blocked: "minta perhatian",
  done: "selesai",
  idle: "siaga",
};

const initials = (a) => (a.title || a.program?.name || "??").replace(/[^\p{L}\p{N} ]/gu, "").trim().slice(0, 2).toUpperCase();

function loadStamps() {
  try {
    const raw = JSON.parse(localStorage.getItem("onepiece.chat.stamps") || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

const clock = (ms) => (ms ? new Date(ms).toTimeString().slice(0, 5) : "");

export default class OnepieceChat extends View {
  init(_props, cx) {
    this.note = "";
    this.input = InputState.new({ placeholder: "Beri perintah ke kru…" });
    this.input.on("submit", (_e, cx) => this.send(cx));
    this.stamps = loadStamps();
    this.stamp();
    cx.timer.every(2000, (cx) => {
      this.stamp();
      cx.notify();
    });
  }

  // When each (agent, status) pair was first seen, so the feed can show a time.
  stamp() {
    const now = Date.now();
    const next = {};
    let dirty = false;
    for (const a of agents()) {
      const key = `${a.address}:${a.status}`;
      next[key] = this.stamps[key] ?? now;
      if (!this.stamps[key]) dirty = true;
    }
    if (dirty || Object.keys(next).length !== Object.keys(this.stamps).length) {
      this.stamps = next;
      try {
        localStorage.setItem("onepiece.chat.stamps", JSON.stringify(next));
      } catch {}
    }
  }

  send(cx) {
    const text = this.input.value().trim();
    if (!text) return;
    this.input.set_value("");
    const target = focused()?.agent;
    if (!target) {
      this.note = "belum ada kru yang dipanggil";
      cx.notify();
      return;
    }
    this.note = "mengirim ke " + target + "…";
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["send", target, text]);
        this.note = r.code === 0 ? "terkirim ke " + target : "gagal: " + (r.stderr || r.stdout || "").slice(0, 90);
      } catch (e) {
        this.note = "gagal: " + String(e).slice(0, 90);
      }
      cx.notify();
    });
  }

  render() {
    const t = theme();
    const list = [...agents()].sort((a, b) => b.seq - a.seq);
    const blocked = list.filter((a) => a.status === "blocked").length;
    return v_flex()
      .size_full()
      .min_h(0)
      .rounded(10)
      .bg(t.surface)
      .border(1)
      .border_color(t.border)
      .child(
        h_flex().px(10).h(28).flex_none().gap(8).items_center()
          .child(div().text_size(10).font_semibold().text_color(t.accent).child("CREW CHAT"))
          .child(div().text_size(9).text_color(t.dim).child(`${list.length} kru`)),
      )
      .child(
        v_flex()
          .flex_1()
          .min_h(0)
          .px(8)
          .gap(4)
          .overflow_y_scrollbar()
          .when(list.length === 0, (el) =>
            el.child(div().p(8).text_size(10).text_color(t.dim).child("belum ada kru aktif")),
          )
          .children(
            list.map((a) => {
              const tone = t[a.status] ?? t.unknown;
              return h_flex()
                .id(`chat-${a.address}`)
                .gap(8)
                .px(6)
                .py(5)
                .flex_none()
                .rounded(8)
                .hover((s) => s.bg(t.hover))
                .cursor_pointer()
                .on_click((_e, cx) => {
                  if (a.pane) run("pane.focus", { pane: a.pane });
                  cx.notify();
                })
                .child(
                  div()
                    .w(24)
                    .h(24)
                    .flex_none()
                    .rounded(12)
                    .bg(t.raised)
                    .border(1)
                    .border_color(tone)
                    .flex()
                    .items_center()
                    .justify_center()
                    .text_size(9)
                    .font_semibold()
                    .text_color(tone)
                    .child(initials(a)),
                )
                .child(
                  v_flex().min_w(0).flex_1().gap(1)
                    .child(
                      h_flex().gap(6).items_center()
                        .child(div().text_size(11).truncate().text_color(t.foreground).child(a.title || a.program?.name || a.address))
                        .child(div().text_size(9).text_color(t.dim).child(a.app || "")),
                    )
                    .child(div().text_size(9).text_color(t.muted).truncate()
                      .child(`${LABEL[a.status] ?? a.status} · ${a.space_name} / ${a.tab_name}`)),
                )
                .child(div().text_size(9).text_color(t.dim).flex_none().child(clock(this.stamps[`${a.address}:${a.status}`])))
                .child(div().w(6).h(6).flex_none().rounded(3).bg(tone));
            }),
          ),
      )
      .child(
        v_flex().px(8).pb(8).pt(4).flex_none().gap(4)
          .child(
            h_flex()
              .h(28)
              .px(8)
              .gap(6)
              .items_center()
              .rounded(6)
              .bg(t.input)
              .border(1)
              .border_color(t.border)
              .child(Input.new(this.input).h_full().flex_1().text_size(11).text_color(t.foreground))
              .child(div().text_size(9).text_color(t.dim).child("⏎")),
          )
          .child(
            h_flex().justify_between().items_center()
              .child(div().text_size(9).text_color(t.dim).truncate().child(this.note || "kirim ke kru yang sedang aktif"))
              .child(
                h_flex()
                  .id("denden")
                  .gap(4)
                  .items_center()
                  .cursor_pointer()
                  .on_click((_e, cx) => {
                    const b = list.find((a) => a.status === "blocked");
                    if (b?.pane) run("pane.focus", { pane: b.pane });
                    cx.notify();
                  })
                  .when(blocked > 0, (el) => el.loop("opacity", { from: 0.5, to: 1, period: 900 }))
                  .child(image("mods/onepiece-chat/denden.svg").size(16).flex_none())
                  .child(div().text_size(9).text_color(t.dim).child(blocked ? `${blocked} alert` : "den den mushi")),
              ),
          ),
      );
  }
}
