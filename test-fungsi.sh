#!/usr/bin/env bash
# Functional check against the running Herdr window: the theme really paints, zones
# sit where the layout says, layout switching and the `+` button's command work,
# mods load, avatars exist, and the chat feed parses live terminal output.
#   ./test-fungsi.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
LAYOUT=onepiece-grandline
MODS="onepiece-nav onepiece-sidebar onepiece-alur onepiece-inspector onepiece-actions onepiece-chat"
TMP="$(mktemp -d)"
FAILS=0

command -v herdr-app >/dev/null || { echo "herdr-app is not on PATH" >&2; exit 2; }
if ! herdr-app status >/dev/null 2>&1; then
  echo "the window is not running; open Herdr first" >&2
  exit 2
fi

pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAILS=$((FAILS + 1)); }
check() { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1 (want $3, got $2)"; fi; }
# Sample a point given as percentages, so resizing the window does not break the test.
pixel() {
  local w h
  read -r w h <<< "$(magick identify -format '%w %h' "$1")"
  magick "$1" -alpha off -format "%[hex:p{$(( $2 * w / 100 )),$(( $3 * h / 100 ))}]" info:
}
field() { python3 -c "import json,sys;d=json.load(sys.stdin);print($1)"; }

cp "$APP_HOME/settings.json" "$TMP/settings.json" 2>/dev/null || true
restore() {
  if [ -f "$TMP/settings.json" ]; then
    want="$(field 'd.get("theme","")' < "$TMP/settings.json")"
    # The app flushes its own settings.json asynchronously; retry until the
    # backup sticks so a test run never leaves the user on the test theme.
    for _ in 1 2 3; do
      cp "$TMP/settings.json" "$APP_HOME/settings.json"
      herdr-app do app.theme --name "$want" >/dev/null 2>&1
      sleep 2
      [ "$(field 'd.get("theme","")' < "$APP_HOME/settings.json")" = "$want" ] && break
    done
  fi
  herdr-app do layout.switch --name "$LAYOUT" >/dev/null 2>&1
  rm -rf "$TMP"
}
trap restore EXIT

# Appearance decides the theme slot, so set both exactly like the ☀/☾ handler does.
apply() {
  python3 - "$APP_HOME/settings.json" "$1" "$2" <<'PY'
import json, sys
path, appearance, theme = sys.argv[1:4]
d = json.load(open(path))
d["appearance"], d["theme"] = appearance, theme
open(path, "w").write(json.dumps(d, indent=2) + "\n")
PY
  herdr-app do app.theme --name "$2" >/dev/null 2>&1
  sleep 2
}

echo "== window"
status="$(herdr-app status)"
check "layout aktif = $LAYOUT" "$(echo "$status" | field 'd.get("layout")')" "$LAYOUT"
check "mod errors kosong" "$(echo "$status" | field 'json.dumps(d.get("errors"))')" "[]"

echo "== mods load"
for m in $MODS; do
  if herdr-app check "$APP_HOME/mods/$m" 2>&1 | grep -q 'check passed'; then
    pass "$m dimuat runtime"
  else
    fail "$m gagal dimuat"
  fi
done

echo "== theme paints (pixel, 2x frame)"
apply light onepiece-grandline-light
herdr-app shot "$TMP/light.png" >/dev/null
check "light: sidebar chrome" "$(pixel "$TMP/light.png" 3 69)" "E9DCC0"
check "light: inspector parchment" "$(pixel "$TMP/light.png" 92 69)" "F4ECD8"
check "settings.json tidak dilawan balik" \
  "$(field 'd["appearance"]+"/"+d["theme"]' < "$APP_HOME/settings.json")" "light/onepiece-grandline-light"

apply dark onepiece-grandline
herdr-app shot "$TMP/dark.png" >/dev/null
check "dark: sidebar chrome" "$(pixel "$TMP/dark.png" 3 69)" "1C2541"
check "dark: inspector tetap parchment" "$(pixel "$TMP/dark.png" 92 69)" "F4ECD8"
check "dark: tombol SET SAIL merah" "$(pixel "$TMP/dark.png" 21 93)" "E63946"
check "settings.json tidak dilawan balik" \
  "$(field 'd["appearance"]+"/"+d["theme"]' < "$APP_HOME/settings.json")" "dark/onepiece-grandline"
apply light onepiece-grandline-light

echo "== layout switch (command yang dipakai installer)"
herdr-app do layout.switch --name dev-layout >/dev/null 2>&1; sleep 1
check "pindah ke dev-layout" "$(herdr-app status | field 'd.get("layout")')" "dev-layout"
herdr-app do layout.switch --name "$LAYOUT" >/dev/null 2>&1; sleep 2
check "balik ke $LAYOUT" "$(herdr-app status | field 'd.get("layout")')" "$LAYOUT"
check "layout tidak error setelah balik" "$(herdr-app status | field 'json.dumps(d.get("errors"))')" "[]"

echo "== tab baru (perintah tombol +)"
tabs() { herdr-app ls | python3 -c "import json,sys;d=json.load(sys.stdin);s=[x for x in d['spaces'] if x['active']][0];print(len(s['tabs']))"; }
before="$(tabs)"
herdr-app do tab.new >/dev/null 2>&1; sleep 1
check "tab.new menambah tab" "$(tabs)" "$((before + 1))"
herdr-app do tab.close >/dev/null 2>&1; sleep 1
check "tab.close mengembalikan" "$(tabs)" "$before"

echo "== avatars"
AV="$APP_HOME/mods/onepiece-alur/avatars"
if [ -f "$AV/index.json" ]; then
  check "manifest 6 potret" "$(python3 -c "import json;print(len(json.load(open('$AV/index.json'))['ids']))")" "6"
  bad="$(magick identify -format '%wx%h\n' "$AV"/*.png 2>/dev/null | grep -vc '^96x96$' || true)"
  check "semua potret 96x96 ($(ls "$AV"/*.png | wc -l | tr -d ' ') file)" "${bad:-0}" "0"
else
  echo "SKIP  potret belum diunduh di mesin ini — python3 fetch-avatars.py lalu ulangi"
fi

echo "== chat feed (hc read --json, sama seperti mod)"
addr="$(echo "$status" | field 'd.get("agent") or ""')"
[ -n "$addr" ] || addr="$(hc ls --json 2>/dev/null | field 'd[0]["terminal"] if d else ""')"
feed="$(hc read "$addr" --lines 2 --json 2>/dev/null | field 'len(d.get("text",""))' 2>/dev/null || echo 0)"
if [ "${feed:-0}" -gt 0 ]; then pass "hc read $addr mengembalikan teks ($feed char)"; else fail "hc read $addr kosong"; fi

echo
if [ "$FAILS" -eq 0 ]; then echo "OK  semua cek fungsi lulus"; else echo "FAILED  $FAILS cek"; fi
exit $((FAILS > 0))
