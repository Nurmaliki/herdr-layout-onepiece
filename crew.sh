#!/bin/sh
# crew <kru> <tugas> — panggil kru (persona template onepiece-<kru>) + tugasnya.
#
# `hc run --bg <template> "<tugas>"` sering berakhir {"sent":false}: opencode masih
# booting dan hc menolak mengetik ke pane yang "output has not settled". Di sini
# pane dinyalakan dulu, lalu persona+tugas dikirim ulang sampai hc menerimanya.
# Format pesannya sama dengan yang hc buat sendiri, supaya kru tetap tahu harus
# lapor ke pemanggilnya.
kru=${1:?pakai: crew <kru> <tugas>}
shift
[ "$#" -gt 0 ] || { echo "tugas kosong: crew $kru \"<tugas>\"" >&2; exit 2; }
# The name ends up in a shell-visible envelope and in the template path.
case "$kru" in *[!a-z0-9-]*) echo "nama kru tidak valid: $kru" >&2; exit 2 ;; esac
case "$*" in *"</hc>"*) echo "tugas tidak boleh memuat </hc>" >&2; exit 2 ;; esac
tpl="${HERDR_CORE_HOME:-$HOME/.config/herdr-core}/templates/onepiece-$kru.md"
[ -f "$tpl" ] || { echo "template tidak ada: $tpl (jalankan ./install-theme.sh)" >&2; exit 1; }

# Kru kerja di repo mana pun: CREW_CWD=/path/to/project ./crew.sh nami "..."
cwd=${CREW_CWD:-$PWD}
[ -d "$cwd" ] || { echo "CREW_CWD bukan folder: $cwd" >&2; exit 2; }

# Kalau kru sudah hidup: pindahkan ke $cwd kalau masih di folder lain (persona
# hilang kalau hanya dikirim ulang), atau pakai yang sudah ada kalau cocok.
hc get "$kru" >/dev/null 2>&1 && {
  live_cwd=$(hc get "$kru" 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin).get("cwd") or "")' 2>/dev/null || true)
  if [ -z "$CREW_KEEP" ] && [ "$live_cwd" != "$cwd" ]; then
    echo "kru $kru masih hidup di ${live_cwd:-?}; memindahkan ke $cwd (CREW_KEEP=1 untuk menghentikan)" >&2
    hc kill "$kru" >/dev/null 2>&1 || true
    sleep 2
    hc rm "$kru" >/dev/null 2>&1 || true
  else
    [ -n "$live_cwd" ] && [ "$live_cwd" != "$cwd" ] &&
      echo "kru $kru tetap di $live_cwd (CREW_KEEP=1)" >&2
  fi
}

# Tanpa HC_TERMINAL_ID jangan menebak nama pemanggil: kirim tanpa alamat balasan.
caller=${HC_TERMINAL_ID:-}
reach=${caller:+ reach=\"hc send $caller when done or stuck\"}

hc run --bg --name "$kru" --cwd "$cwd" opencode >/dev/null 2>&1 &
body=$(awk '/^---$/{n++; next} n>=2' "$tpl")
msg="<hc from=\"${caller:-user}\"$reach>Proyek: kerja di $cwd (cd ke sana dulu bila perlu).
$body
$*</hc>"

sleep 1
hc get "$kru" >/dev/null 2>&1 || { echo "gagal menyalakan pane $kru" >&2; exit 1; }

i=0
until hc send "$kru" "$msg" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "gagal mengirim ke $kru setelah 2 menit; cek: hc read $kru" >&2
    exit 1
  fi
  sleep 2
done
echo "terkirim ke $kru"
