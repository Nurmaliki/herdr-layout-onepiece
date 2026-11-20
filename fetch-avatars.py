#!/usr/bin/env python3
"""Pull crew portraits from the One Piece Fandom wiki (no API key needed).

    python3 fetch-avatars.py              # all six
    python3 fetch-avatars.py luffy zoro   # just those

Source: onepiece.fandom.com pageimage thumbnails (community wiki, one piece is
copyright Eiichiro Oda / Toei). Local personal use only — the images are
git-ignored on purpose.
"""
import json, subprocess, sys, tempfile, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "mods/onepiece-alur/avatars"
API = "https://onepiece.fandom.com/api.php"
UA = {"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
TITLES = {
    "luffy": "Monkey D. Luffy",
    "nami": "Nami",
    "zoro": "Roronoa Zoro",
    "franky": "Franky",
    "robin": "Nico Robin",
    "usopp": "Usopp",
}


def pageimage(title):
    q = urllib.parse.urlencode(
        {"action": "query", "titles": title, "prop": "pageimages", "pithumbsize": 500, "format": "json"}
    )
    with urllib.request.urlopen(urllib.request.Request(f"{API}?{q}", headers=UA), timeout=30) as r:
        page = next(iter(json.load(r)["query"]["pages"].values()))
    return page.get("thumbnail", {}).get("source")


OUT.mkdir(parents=True, exist_ok=True)
for key in sys.argv[1:] or TITLES:
    url = pageimage(TITLES[key])
    if not url:
        sys.exit(f"{key}: no pageimage for {TITLES[key]}")
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        raw = r.read()
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(raw)
        tmp = f.name
    dst = OUT / f"{key}.png"
    # Infobox art is portrait; take the top square (face + shoulders), 96px.
    subprocess.run(
        ["magick", tmp, "-gravity", "north", "-resize", "96x96^", "-extent", "96x96", str(dst)], check=True
    )
    Path(tmp).unlink()
    print(f"wrote {dst.relative_to(ROOT)}  <- {TITLES[key]}")

ids = sorted(p.stem for p in OUT.glob("*.png"))
(OUT / "index.json").write_text(json.dumps({"ids": ids}) + "\n")
print(f"manifest: {len(ids)} portraits -> mods/onepiece-alur/avatars/index.json")
