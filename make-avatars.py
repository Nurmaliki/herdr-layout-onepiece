#!/usr/bin/env python3
"""Generate the crew portraits with an official image API (OpenAI Images).

    OPENAI_IMAGE_KEY=sk-... python3 make-avatars.py          # all four
    OPENAI_IMAGE_KEY=sk-... python3 make-avatars.py zoro     # just one

Key comes from env only (never a file). Optional overrides:
OPENAI_IMAGE_BASE (default https://api.openai.com/v1), OPENAI_IMAGE_MODEL
(default gpt-image-1), OPENAI_IMAGE_SIZE (default 1024x1024).

Writes mods/onepiece-alur/avatars/<id>.png at 96px; the alur mod picks them up
automatically and falls back to initials when a file is missing.
"""
import base64, json, os, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "mods/onepiece-alur/avatars"
BASE = os.environ.get("OPENAI_IMAGE_BASE", "https://api.openai.com/v1").rstrip("/")
MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
SIZE = os.environ.get("OPENAI_IMAGE_SIZE", "1024x1024")
KEY = os.environ.get("OPENAI_IMAGE_KEY") or os.environ.get("OPENAI_API_KEY", "")

if not KEY.startswith("sk-"):
    sys.exit("set OPENAI_IMAGE_KEY (sk-... from platform.openai.com); nothing written")

crew = json.loads((ROOT / "crew-profiles.json").read_text())["crew"]
want = sys.argv[1:] or ["luffy", "nami", "zoro", "franky"]
OUT.mkdir(parents=True, exist_ok=True)
have = sorted(p.stem for p in OUT.glob("*.png"))

for c in crew:
    if c["id"] not in want:
        continue
    if not c.get("avatar_prompt"):
        print(f"skip {c['id']}: no avatar_prompt")
        continue
    body = json.dumps({"model": MODEL, "prompt": c["avatar_prompt"], "size": SIZE, "n": 1}).encode()
    req = urllib.request.Request(
        f"{BASE}/images/generations",
        data=body,
        headers={"authorization": f"Bearer {KEY}", "content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.load(r)
        raw = base64.b64decode(data["data"][0]["b64_json"])
    except Exception as e:
        sys.exit(f"{c['id']}: request failed: {e}")
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(raw)
        tmp = f.name
    dst = OUT / f"{c['id']}.png"
    # Square crop + 96px keeps the repo small and the node crisp.
    subprocess.run(["magick", tmp, "-gravity", "center", "-resize", "96x96^", "-extent", "96x96", str(dst)], check=True)
    Path(tmp).unlink()
    have.append(c["id"])
    print(f"wrote {dst.relative_to(ROOT)}")
(OUT / "index.json").write_text(json.dumps({"ids": sorted(set(have) | set(p.stem for p in OUT.glob("*.png")))}) + "\n")
print("manifest: mods/onepiece-alur/avatars/index.json")
