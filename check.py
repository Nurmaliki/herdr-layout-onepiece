#!/usr/bin/env python3
"""Smoke-check the Grand Line theme: tokens resolve, ARIA targets exist, IDs unique."""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).parent
CSS = (ROOT / "theme-onepiece.css").read_text()
HTML = (ROOT / "index.html").read_text()

REQUIRED = """--bg-ocean-deep --bg-ship-hull --bg-terminal --bg-elevated
--accent-luffy-red --accent-luffy-red-hover --accent-strawhat-gold --accent-treasure-amber
--accent-zoro-green --accent-franky-cyan --parchment-bg --parchment-bg-dark --parchment-text
--parchment-muted --parchment-border --text-primary --text-secondary --border-subtle
--border-gold-strong --shadow-panel --glow-red --glow-gold --font-display --font-ui --font-mono""".split()

defined = set(re.findall(r"(--[\w-]+)\s*:", CSS))
used = set(re.findall(r"var\((--[\w-]+)", CSS))
missing_tokens = [t for t in REQUIRED if t not in defined]
undefined = sorted(used - defined - {"--val"})
assert not missing_tokens, f"missing tokens: {missing_tokens}"
assert not undefined, f"undefined var() refs: {undefined}"
assert CSS.count("{") == CSS.count("}"), "unbalanced CSS braces"


class Doc(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.uses, self.controls, self.refs, self._dupes = [], [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            if a["id"] in self.ids:
                self._dupes.append(a["id"])
            self.ids.append(a["id"])
        if tag == "use":
            self.uses.append((a.get("href") or "").lstrip("#"))
        if "aria-controls" in a:
            self.controls.extend(a["aria-controls"].split())
        if "aria-labelledby" in a:
            self.refs.extend(a["aria-labelledby"].split())


doc = Doc()
doc.feed(HTML)
assert not doc._dupes, f"duplicate ids: {doc._dupes}"
symbols = set(re.findall(r'symbol id="([^"]+)"', HTML))
assert set(doc.uses) <= symbols, f"missing symbols: {set(doc.uses) - symbols}"
assert set(doc.controls) <= set(doc.ids), f"dangling aria-controls: {set(doc.controls) - set(doc.ids)}"
assert set(doc.refs) <= set(doc.ids), f"dangling aria-labelledby: {set(doc.refs) - set(doc.ids)}"

for needle in ["Voyages", "Crew", "Log Pose", "Bounty", "WANTED", "Belly:",
               "SET SAIL", "ANCHOR", "Den Den Mushi", "Sunny", "Progres tugas",
               "System Integrity", "Beri perintah ke kru...", "is-running"]:
    assert needle in HTML, f"missing copy/hook: {needle}"

profiles = json.loads((ROOT / "crew-profiles.json").read_text())
crew = profiles["crew"]
assert len(crew) == 6 and all(c["system_prompt"].strip() for c in crew), "crew profiles incomplete"
assert {c["id"] for c in crew} == {"luffy", "nami", "zoro", "franky", "robin", "usopp"}, "crew ids drifted"
for c in crew:
    assert c["color"].startswith("#") and len(c["color"]) == 7, f"bad colour {c['id']}"
    assert c["title"] and c["status_idle"] and c["status_active"], f"missing status copy {c['id']}"
assert profiles["currency"]["rewards"]["subtask_complete"] == 50000, "currency rewards drifted"


def lum(hexcolor):
    c = [int(hexcolor[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(fg, bg):
    a, b = sorted((lum(fg), lum(bg)), reverse=True)
    return (a + 0.05) / (b + 0.05)


PAIRS = {
    "text/bg": ("#F1FAEE", "#0B132B"),
    "muted/panel": ("#A8B2D1", "#243056"),
    "dim/panel": ("#9AA9C2", "#243056"),
    "dim/bg": ("#9AA9C2", "#0B132B"),
    "ink/parchment": ("#2B2118", "#F4ECD8"),
    "ink-muted/parchment": ("#5C4938", "#F4ECD8"),
    "ink-faint/parchment": ("#6F5C44", "#F4ECD8"),
    "gold-ink/panel": ("#E9C46A", "#243056"),
    "sail-ink/red": ("#1C0305", "#E63946"),
    "anchor-ink/gold": ("#1C2541", "#F4A261"),
    "terminal/text": ("#C9E7D5", "#070D1F"),
    "terminal/dim": ("#7C90B4", "#070D1F"),
}
for name, (fg, bg) in PAIRS.items():
    r = ratio(fg, bg)
    assert r >= 4.5, f"contrast {name} = {r:.2f} < 4.5 (WCAG AA)"

print(f"OK  tokens={len(defined)}  ids={len(doc.ids)}  symbols={len(symbols)}  crew={len(crew)}  contrast>=AA")

