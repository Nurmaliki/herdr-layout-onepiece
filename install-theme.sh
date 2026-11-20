#!/usr/bin/env bash
# Install the One Piece: Grand Line themes (dark + parchment) into the Herdr app.
#   ./install-theme.sh              # apply: copy both, pick the one matching appearance
#   ./install-theme.sh --dry-run    # show what would change, write nothing
#   ./install-theme.sh --uninstall  # restore previous settings, remove the themes
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
CORE_HOME="${HERDR_CORE_HOME:-$HOME/.config/herdr-core}"
SETTINGS="$APP_HOME/settings.json"
NAMES="onepiece-grandline onepiece-grandline-light"
MODS="onepiece-nav onepiece-sidebar onepiece-alur onepiece-inspector onepiece-actions onepiece-chat"
LAYOUT=onepiece-grandline
MODE=apply

for arg in "$@"; do
  case "$arg" in
    --dry-run)   MODE=dry ;;
    --uninstall) MODE=uninstall ;;
    -h|--help)   sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

for name in $NAMES; do
  python3 - "$ROOT/$name.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
missing = {"background", "foreground", "cursor", "ansi", "colors"} - d.keys()
assert not missing, f"theme json missing: {sorted(missing)}"
assert len(d["ansi"]) == 16, "ansi must have 16 colors"
assert {"accent", "surface", "chrome", "background"} <= d["colors"].keys(), "colors map incomplete"
PY
done

if [ "$MODE" = uninstall ]; then
  [ -f "$SETTINGS" ] || { echo "no settings.json in $APP_HOME" >&2; exit 1; }
  last="$(ls -1t "$SETTINGS".bak-onepiece-* 2>/dev/null | head -n1 || true)"
  [ -n "$last" ] || { echo "no backup of settings.json found" >&2; exit 1; }
  if command -v herdr-app >/dev/null 2>&1; then
    cur="$(herdr-app status 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin).get("layout",""))' 2>/dev/null || true)"
    if [ "$cur" = "$LAYOUT" ]; then herdr-app do layout.switch --name dev-layout >/dev/null 2>&1 || true; fi
  fi
  cp "$last" "$SETTINGS"
  for name in $NAMES; do rm -f "$APP_HOME/themes/$name.json"; done
  for m in $MODS; do rm -rf "${APP_HOME:?}/mods/$m"; done
  rm -f "$APP_HOME/layouts/$LAYOUT.json" "$APP_HOME/layouts/.state/$LAYOUT.json"
  rm -f "$CORE_HOME"/templates/onepiece-*.md
  echo "restored $SETTINGS from $last"
  echo "removed  $APP_HOME/themes/onepiece-grandline*.json"
  prev="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("theme",""))' "$SETTINGS")"
  if [ -n "$prev" ] && command -v herdr-app >/dev/null 2>&1; then
    herdr-app do app.theme --name "$prev" >/dev/null 2>&1 || true
  fi
  exit 0
fi

variant="$(python3 - "$SETTINGS" <<'PY'
import json, os, sys
path = sys.argv[1]
d = json.load(open(path)) if os.path.exists(path) else {}
d.setdefault("appearance", "dark")
print("onepiece-grandline-light" if d["appearance"] == "light" else "onepiece-grandline")
PY
)"

if [ "$MODE" = dry ]; then
  echo "would copy: $NAMES -> $APP_HOME/themes/"
  echo "would copy: $MODS -> $APP_HOME/mods/"
  echo "would copy: layouts/$LAYOUT.json -> $APP_HOME/layouts/"
  echo "would copy: crew -> $CORE_HOME/templates/onepiece-*.md (hc run onepiece-<kru>)"
  echo "would set : theme = \"$variant\" (current appearance)"
  echo "dry run: nothing written"
  exit 0
fi

mkdir -p "$APP_HOME/themes" "$APP_HOME/mods" "$APP_HOME/layouts"
for name in $NAMES; do cp "$ROOT/$name.json" "$APP_HOME/themes/$name.json"; done
for m in $MODS; do
  mkdir -p "$APP_HOME/mods/$m"
  cp -R "$ROOT/mods/$m/." "$APP_HOME/mods/$m/"
done
cp "$ROOT/layouts/$LAYOUT.json" "$APP_HOME/layouts/$LAYOUT.json"

# The app remembers each layout's theme slot per appearance; if those drifted
# (a toggle test, a manual edit) Settings would show the wrong variant.
# Crew personas double as hc templates: `hc run onepiece-nami "rencanakan X"`.
mkdir -p "$CORE_HOME/templates"
command -v "${CREW_AGENT:-opencode}" >/dev/null 2>&1 ||
  echo "note: ${CREW_AGENT:-opencode} not on PATH — presets will fail until it is" >&2
python3 - "$ROOT/crew-profiles.json" "$CORE_HOME/templates" "${CREW_AGENT:-opencode}" <<'PY'
import json, os, sys
src, outdir, command = sys.argv[1:4]
for c in json.load(open(src))["crew"]:
    name = "onepiece-" + c["id"]
    text = (
        "---\n"
        f"name: {name}\n"
        f'description: {c["name"]} — {c["role"]} (Grand Line crew)\n'
        f"command: {command}\n"
        "---\n\n"
        + c["system_prompt"].rstrip()
        + "\n"
    )
    path = os.path.join(outdir, name + ".md")
    if not (os.path.exists(path) and open(path).read() == text):
        open(path, "w").write(text)
        print("template:", path)
PY

state="$APP_HOME/layouts/.state/$LAYOUT.json"
if [ -f "$state" ]; then
  python3 - "$state" <<'PY'
import json, sys
path = sys.argv[1]
d = json.load(open(path))
d["theme"] = {"light": "onepiece-grandline-light", "dark": "onepiece-grandline"}
open(path, "w").write(json.dumps(d, indent=2) + "\n")
PY
fi

if python3 - "$SETTINGS" "$variant" "$SETTINGS.tmp" <<'PY'
import json, os, sys
path, name, tmp = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(open(path)) if os.path.exists(path) else {}
d.setdefault("appearance", "dark")
d["theme"] = name
out = json.dumps(d, indent=2) + "\n"
if os.path.exists(path) and open(path).read() == out:
    sys.exit(10)
open(tmp, "w").write(out)
PY
then
if [ -f "$SETTINGS" ]; then cp "$SETTINGS" "$SETTINGS.bak-onepiece-$(date +%Y%m%d-%H%M%S)"; fi
  mv "$SETTINGS.tmp" "$SETTINGS"
  echo "settings: theme = \"$variant\""
else
  code=$?
  rm -f "$SETTINGS.tmp"
  [ "$code" -eq 10 ] && echo "settings already installed" || exit "$code"
fi

for name in $NAMES; do echo "wrote  : $APP_HOME/themes/$name.json"; done
echo "mods   : $APP_HOME/mods/{$(echo "$MODS" | tr ' ' ',')}"
echo "layout : $APP_HOME/layouts/$LAYOUT.json"
if command -v herdr-app >/dev/null 2>&1; then
  if herdr-app do app.theme --name "$variant" >/dev/null 2>&1; then
    echo "applied: herdr-app app.theme $variant"
    herdr-app do layout.switch --name "$LAYOUT" >/dev/null 2>&1 || true
    echo "layout : herdr-app layout.switch $LAYOUT"
  else
    echo "note: window not open — theme and layout show on next launch"
  fi
fi
