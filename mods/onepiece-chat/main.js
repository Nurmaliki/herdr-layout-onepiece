// Crew chat: a reconstructed multi-agent stream (bubbles) plus an input that sends
// the focused agent a command. The runtime cannot read another agent's message log,
// so each entry is a line the agent printed, stamped when we first saw it.
import { View, div, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, focused, hc, run, theme } from "herdr";

const CAP = 40;
const KEY = "onepiece.chat.log.v2";

const clock = (ms) => (ms ? new Date(ms).toTimeString().slice(0, 5) : "");

function loadLog() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const e of raw) {
      if (!e || !e.a || !e.txt) continue;
      const prev = out[out.length - 1];
      if (prev && prev.a === e.a && prev.txt === e.txt) continue;
      out.push(e);
    }
    return out.slice(-CAP);
  } catch {
    return [];
  }
}

// ANSI, box drawing and TUI chrome all lie about being a sentence.
const BOX = /[│┃┌┐└┘├┤┬┴┼─━╭╮╰╯▌▐█▰▱▔▁◼▮▕▏⏺⬤◻]/g;
const CHROME = /esc\s|\d+(\.\d+)?K\b|↑|↓|\(\d+%\)|ctrl\+|⏎|\bauto\b|^[~/]|^(build|plan|thought|worked) ·|\(\d+ earlier lines?\)/i;

function saidLines(text) {
  return String(text)
    .replace(/\u001b\[[0-9;?]*[A-Za-z]/g, "")
    .split("\n")
    .map((l) => l.replace(BOX, " ").replace(/\s+/g, " ").trim())
    .filter((l) => {
      if (l.length < 14 || CHROME.test(l)) return false;
      const letters = (l.match(/\p{L}/gu) || []).length;
      return letters >= 12 && l.split(" ").length >= 3;
    })
    .slice(-4);
}

export default class OnepieceChat extends View {
  init(_props, cx) {
    this.note = "";
    this.input = InputState.new({ placeholder: "Beri perintah ke kru…" });
    this.input.on("submit", (_e, cx) => this.send(cx));
    this.log = loadLog();
    this.seen = {};
    this.seeded = false;
    this.busy = false;
    this.poll(cx);
    cx.timer.every(5000, (cx) => this.poll(cx));
  }

  // Read each agent's screen and append the sentences we have not seen before.
  poll(cx) {
    if (this.busy) return;
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        const rows = [];
        for (const a of agents()) {
          try {
            const r = await hc(["read", a.address, "--lines", "8", "--json"]);
            rows.push([a, saidLines(JSON.parse(r.stdout).text)]);
          } catch {
            rows.push([a, []]);
          }
        }
        let changed = false;
        const opening = !this.seeded && this.log.length === 0;
        for (const [a, lines] of rows) {
          const known = this.seen[a.address] ?? [];
          const fresh = lines.filter((l) => !known.includes(l));
          this.seen[a.address] = [...known, ...lines].slice(-12);
          // First run opens with what each agent last said, so the panel is never blank.
          if (opening && lines.length > 0) {
            this.log.push({ a: a.address, n: a.title || a.program?.name || a.address, txt: lines[lines.length - 1], ts: Date.now() });
            changed = true;
            continue;
          }
          if (!this.seeded || fresh.length === 0) continue;
          // Wrapped terminal lines are one sentence, so one bubble per agent per poll.
          const txt = fresh.join(" ").slice(0, 240);
          const recent = this.log.filter((e) => e.a === a.address).slice(-3).map((e) => e.txt);
          if (recent.includes(txt)) continue;
          this.log.push({ a: a.address, n: a.title || a.program?.name || a.address, txt, ts: Date.now() });
          changed = true;
        }
        this.seeded = true;
        if (!changed) return;
        this.log = this.log.slice(-CAP);
        try {
          localStorage.setItem(KEY, JSON.stringify(this.log));
        } catch {}
        cx.notify();
      } finally {
        this.busy = false;
      }
    });
  }

  paneOf(addr) {
    return agents().find((a) => a.address === addr)?.pane;
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
    // Newest first: the runtime owns the scroll position, so the newest bubble has
    // to sit at the top to stay readable.
    const feed = [...this.log].reverse();
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
          .child(div().text_size(9).text_color(t.dim).child(`${list.length} kru · ${this.log.length} pesan · terbaru di atas`)),
      )
      .child(
        v_flex()
          .flex_1()
          .min_h(0)
          .px(8)
          .py(4)
          .gap(6)
          .overflow_y_scrollbar()
          .when(feed.length === 0, (el) =>
            el.child(div().p(8).text_size(10).text_color(t.dim).child("belum ada pesan — kru muncul di sini begitu mereka bicara")),
          )
          .children(
            feed.map((e, i) => {
              const live = list.find((a) => a.address === e.a);
              const tone = t[live?.status] ?? t.unknown;
              return h_flex()
                .id(`msg-${e.ts}-${i}`)
                .gap(6)
                .items_start()
                .flex_none()
                .cursor_pointer()
                .on_click((_e, cx) => {
                  const pane = this.paneOf(e.a);
                  if (pane) run("pane.focus", { pane });
                  cx.notify();
                })
                .child(
                  div()
                    .w(18)
                    .h(18)
                    .flex_none()
                    .mt(2)
                    .rounded(9)
                    .bg(t.raised)
                    .border(1)
                    .border_color(tone)
                    .flex()
                    .items_center()
                    .justify_center()
                    .text_size(7)
                    .font_semibold()
                    .text_color(tone)
                    .child((e.n || "??").replace(/[^\p{L}\p{N} ]/gu, "").trim().slice(0, 2).toUpperCase()),
                )
                .child(
                  v_flex().flex_1().min_w(0).gap(2)
                    .child(
                      h_flex().gap(5).items_center()
                        .child(div().text_size(9).font_semibold().text_color(tone).truncate().child(e.n || e.a))
                        .child(div().text_size(8).text_color(t.dim).child(clock(e.ts))),
                    )
                    .child(
                      div()
                        .px(8)
                        .py(5)
                        .rounded(8)
                        .bg(t.raised)
                        .border(1)
                        .border_color(t.border)
                        .text_size(10)
                        .text_color(t.foreground)
                        .child(e.txt),
                    ),
                );
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
