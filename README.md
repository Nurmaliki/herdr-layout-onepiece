# One Piece: Grand Line — Herdr theme

Aplikasi Herdr (`Herdr.app`) memuat tema dari `~/.config/herdr-app/`, bukan `config.toml`.
`config.toml` hanya dipakai CLI `herdr` di terminal.

## Pasang

```sh
cd ~/Documents/work/learn/herdr-layout-onepiece
./install-theme.sh --dry-run   # lihat rencana, tidak menulis
./install-theme.sh             # copy 2 tema + set sesuai Appearance
```

Yang dilakukan:

1. copy `onepiece-grandline.json` (gelap) dan `onepiece-grandline-light.json` (parchment) → `~/.config/herdr-app/themes/`
2. backup `settings.json` → `settings.json.bak-onepiece-<timestamp>`
3. set `theme` sesuai `appearance` di `settings.json` (`light` → parchment, `dark` → navy)
4. `herdr-app do app.theme --name <varian>` (langsung berubah tanpa restart)

**Penting:** pilihan Appearance cuma memilih file tema, tidak mengubah warna. Jadi tema gelap di slot
Light tetap gelap. Karena itu ada dua file; jalankan ulang `./install-theme.sh` setelah mengganti
Appearance supaya slot yang sedang aktif ikut terisi.

Idempotent: dijalankan dua kali tidak membuat backup baru.

## Batal

```sh
./install-theme.sh --uninstall
```

Restore `settings.json` terakhir dan hapus file tema.

## Layout & mods (UI 4 zona)

Herdr tidak memakai Svelte/React dan tidak bisa di-inject CSS. UI-nya dirakit dari
`layouts/<name>.json` + `mods/<name>/main.js` (JavaScript `gpui-kit`). Installer
menyalin keduanya, lalu mengaktifkan layout.

Zona yang terpasang:

| zona | mod |
| --- | --- |
| topbar: Jolly Roger, mission, tab kapal | `onepiece-nav` |
| sidebar 240px: menu + daftar + WANTED/Belly | `onepiece-sidebar` |
| node graph Luffy → Nami/Zoro/Franky (status live) | `onepiece-alur` |
| 50% kiri: crew chat + input kirim perintah + Den Den Mushi | `onepiece-chat` |
| tombol SET SAIL / ANCHOR di bawah terminal | `onepiece-actions` |
| panel kanan 300px: integrity, peta, Log Pose, bounty | `onepiece-inspector` |

Balik ke layout lama: `herdr-app do layout.switch --name dev-layout`.

## Isi

| file | fungsi |
| --- | --- |
| `onepiece-grandline.json` | tema gelap: navy `#0B132B` + emas |
| `onepiece-grandline-light.json` | tema parchment `#F4ECD8` + tinta `#1C2541` |
| `install-theme.sh` | pemasang (dry-run, uninstall, pilih varian, validasi, backup) |
| `test-install.sh` | self-check pemasang + kontras AA kedua tema |
| `index.html`, `theme-onepiece.css` | preview desain 4 zona (bukan tema Herdr) |
| `layouts/onepiece-grandline.json` | susunan 4 zona (topbar, sidebar, alur, terminal, inspector) |
| `mods/onepiece-*/` | 6 mod UI (nav, sidebar, alur, chat, inspector, actions) + ikon SVG (`jolly.svg`, `compass.svg`, `denden.svg`, `i-*.svg`) |
| `check.py` | validasi preview: token, id, ARIA, kontras AA |
| `crew-profiles.json` | 6 kru: prompt panjang, `title`, `status_idle/active`, warna badge, `avatar_prompt`, reward Belly |

## Catatan

- Thema per-layout juga tersimpan di `~/.config/herdr-app/layouts/.state/<layout>.json`
  (`theme.dark` / `theme.light`). `settings.json` adalah default untuk layout tanpa override.
- Warna ANSI terminal ikut tema; TUI di dalam pane (OpenCode dll.) punya tema sendiri.
- `~/.config/herdr-app/themes/<nama>.json` = id tema; pakai `app.theme` untuk ganti.
- `HERDR_APP_HOME=/path ./install-theme.sh` untuk home lain.
- Klik node kru = fokus pane agent-nya; menu sidebar = Voyages/Crew/Log Pose/Bounty.
- Belly dihitung dari agent selesai + terminal hidup, disimpan di `localStorage` mod.
- SET SAIL membuka tab shell baru; ANCHOR mengembalikan fokus ke terminal.
- Crew chat mengirim `hc send <agent> <teks>` ke agent yang sedang fokus; Enter = kirim.
- Ikon: `svg()` = mask satu warna (di-tint tema), `image()` = SVG penuh warna.
- Yang tidak diporting: font Cinzel (tidak terpasang), animasi garis dashed
  (runtime hanya menganimasikan opacity/transform).
