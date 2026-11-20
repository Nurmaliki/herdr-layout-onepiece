#!/bin/sh
# Self-check for install-theme.sh. Usage: ./test-install.sh
set -eu
ROOT=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d "${TMPDIR:-/tmp}/onepiece-install.XXXXXX")
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"
printf '#!/bin/sh\necho "herdr-app $*" >> "%s/calls"\n' "$T" > "$T/bin/herdr-app"
chmod +x "$T/bin/herdr-app"
PATH="$T/bin:$(dirname "$(command -v python3)"):/usr/bin:/bin"; export PATH
run() { "$ROOT/install-theme.sh" "$@" >"$T/out" 2>&1; }
theme_of() { python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["theme"])' "$1"; }

# --- light appearance -------------------------------------------------------
H="$T/light"; mkdir -p "$H"
printf '{\n  "zoom": 1,\n  "appearance": "light",\n  "theme": "graphite"\n}\n' > "$H/settings.json"
cp "$H/settings.json" "$T/orig.json"
export HERDR_APP_HOME="$H"

run --dry-run
cmp -s "$H/settings.json" "$T/orig.json" || { echo "FAIL: dry-run touched settings"; exit 1; }
[ ! -e "$H/themes" ] || { echo "FAIL: dry-run created themes"; exit 1; }

run
[ "$(theme_of "$H/settings.json")" = onepiece-grandline-light ] || { echo "FAIL: light variant not selected"; exit 1; }
for f in onepiece-grandline.json onepiece-grandline-light.json; do
  cmp -s "$H/themes/$f" "$ROOT/$f" || { echo "FAIL: $f not copied"; exit 1; }
done
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d["zoom"]==1' "$H/settings.json"
for m in onepiece-nav onepiece-sidebar onepiece-alur onepiece-inspector onepiece-actions onepiece-chat; do
  cmp -s "$H/mods/$m/main.js" "$ROOT/mods/$m/main.js" || { echo "FAIL: mod $m not copied"; exit 1; }
done
cmp -s "$H/mods/onepiece-sidebar/jolly.svg" "$ROOT/mods/onepiece-sidebar/jolly.svg" || { echo "FAIL: mod assets not copied"; exit 1; }
cmp -s "$H/layouts/onepiece-grandline.json" "$ROOT/layouts/onepiece-grandline.json" || { echo "FAIL: layout not copied"; exit 1; }

run
grep -q "already installed" "$T/out" || { echo "FAIL: second run not a no-op"; exit 1; }
[ "$(ls "$H"/settings.json.bak-onepiece-* | wc -l | tr -d ' ')" = 1 ] || { echo "FAIL: duplicate backups"; exit 1; }

run --uninstall
cmp -s "$H/settings.json" "$T/orig.json" || { echo "FAIL: uninstall did not restore settings"; exit 1; }
[ ! -e "$H/themes/onepiece-grandline.json" ] && [ ! -e "$H/themes/onepiece-grandline-light.json" ] || { echo "FAIL: uninstall left themes"; exit 1; }
[ ! -e "$H/mods/onepiece-nav" ] && [ ! -e "$H/layouts/onepiece-grandline.json" ] || { echo "FAIL: uninstall left mods/layout"; exit 1; }

# --- dark appearance --------------------------------------------------------
D="$T/dark"; mkdir -p "$D"
printf '{\n  "appearance": "dark",\n  "theme": "graphite"\n}\n' > "$D/settings.json"
export HERDR_APP_HOME="$D"
run
[ "$(theme_of "$D/settings.json")" = onepiece-grandline ] || { echo "FAIL: dark variant not selected"; exit 1; }

# --- invalid settings -------------------------------------------------------
BAD="$T/bad"; mkdir -p "$BAD"
printf '{"theme": broken\n' > "$BAD/settings.json"
cp "$BAD/settings.json" "$T/bad.orig"
export HERDR_APP_HOME="$BAD"
run --dry-run || true
cmp -s "$BAD/settings.json" "$T/bad.orig" || { echo "FAIL: invalid settings modified"; exit 1; }

# --- both themes keep AA contrast ------------------------------------------
python3 - "$ROOT" <<'PY'
import json, sys
def lum(h):
    h = h.lstrip("#")[:6]
    c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def ratio(a, b):
    a, b = lum(a), lum(b)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)
for name in ("onepiece-grandline", "onepiece-grandline-light"):
    t = json.load(open(f"{sys.argv[1]}/{name}.json"))
    c = t["colors"]
    for fg, bg in ((t["foreground"], t["background"]), (c["muted"], c["surface"]),
                   (c["accent_foreground"], c["accent"]), (c["solid_foreground"], c["solid"])):
        assert ratio(fg, bg) >= 4.5, f"{name}: {fg} on {bg} = {ratio(fg, bg):.2f}"
print("OK contrast>=AA both themes")
PY

echo "OK dry-run/light/dark/idempotent/invalid-refused/uninstall"
