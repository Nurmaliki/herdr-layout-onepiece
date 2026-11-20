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
| node graph Luffy → Nami/Zoro/Franky + pil Robin/Usopp (status live) | `onepiece-alur` |
| 50% kiri: crew chat (kalimat terakhir tiap agent) + input `hc send` + Den Den Mushi | `onepiece-chat` |
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
| `fetch-avatars.py` | avatar kru dari internet (Fandom `onepiece.fandom.com`) → `mods/onepiece-alur/avatars/` |
| `make-avatars.py` | alternatif: avatar via API OpenAI Images (butuh `OPENAI_IMAGE_KEY`) |

## Catatan

- Thema per-layout juga tersimpan di `~/.config/herdr-app/layouts/.state/<layout>.json`
  (`theme.dark` / `theme.light`). `settings.json` adalah default untuk layout tanpa override.
- Warna ANSI terminal ikut tema; TUI di dalam pane (OpenCode dll.) punya tema sendiri.
- `~/.config/herdr-app/themes/<nama>.json` = id tema; pakai `app.theme` untuk ganti.
- `layouts/.state/<layout>.json` menyimpan `theme.{light,dark}` dan override `nodes.*.size`
  (kalau blok melar, hapus entri `nodes` itu — app menulisnya dari geometri terakhir).
  `./install-theme.sh` menormalkan `theme` ke pasangan yang benar; `--uninstall` ikut
  menghapus state-nya supaya tidak menunjuk tema yang sudah dibuang.
- `HERDR_APP_HOME=/path ./install-theme.sh` untuk home lain.
- Klik node kru = fokus pane agent-nya; menu sidebar = Voyages/Crew/Log Pose/Bounty.
- Belly = 5.000.000 + 500.000/agent selesai + 50.000/terminal hidup (lihat `currency.rewards`),
  disimpan sebagai nilai tertinggi di `localStorage` mod.
- SET SAIL membuka tab shell baru; ANCHOR mengembalikan fokus ke terminal.
- Crew chat mengirim `hc send <agent> <teks>` ke agent yang sedang fokus; Enter = kirim,
  tiap baris menampilkan jam perubahan status, dan ikon Den Den Mushi = lompat ke kru yang `blocked`.
- Topbar: `+` = tab baru, `☀/☾` = tukar tema gelap ↔ parchment. Tombol ini menulis
  `settings.json` (`theme` + `appearance`) lalu `app.theme` — perlu dua-duanya, karena
  pilihan Appearance yang menentukan slot tema. Kalau kamu ubah Appearance manual di
  Settings, cukup klik tombol ini sekali lagi supaya sinkron.
- Crew chat membaca baris terakhir tiap terminal (`hc read --json`) tiap 5 detik, membuang
  ANSI/box/TUI chrome; baris status di atasnya + jam menunjukkan perubahan status.
- Ikon: `svg()` = mask satu warna (di-tint tema), `image()` = SVG/PNG penuh warna.
- Avatar tanpa key: `python3 fetch-avatars.py` (atau `. luffy zoro`) — ambil potret infobox wiki,
  crop 96px, tulis `avatars/index.json`; mod membacanya tiap 15 detik, tanpa file tetap pakai inisial.
- Avatar resmi API: `OPENAI_IMAGE_KEY=sk-... python3 make-avatars.py` (`api.openai.com`, `gpt-image-1`).
- Gambar avatar **tidak di-commit** (`.gitignore`): materi berhak cipta Eiichiro Oda/Toei,
  untuk pemakaian pribadi di mesin sendiri; repo hanya berisi skrip pengambilnya.
- Tombol `☀/☾` mengubah `appearance` **global** di `settings.json`, jadi layout lain
  (dev-layout dsb.) ikut berganti terang/gelap. Kalau tidak mau, ganti tema lewat
  `./install-theme.sh` saja.
- Crew chat bukan transkrip: yang tampil kalimat **terakhir** yang terbaca di terminal
  agent, jadi sesekali bisa kena baris TUI yang aneh (progress/status). Itu batas
  heuristiknya, bukan bug.
- `./test-fungsi.sh` butuh window Herdr terbuka + ImageMagick (`magick`). Titik sampel
  pakai persentase, jadi tahan resize; kalau jendela dikecilkan sangat sempit, panel
  inspector bisa tidak ada di 92% lebar dan cek itu gagal.
- Yang tidak bisa dites skrip: klik mouse literal (`on_click`). Itu butuh izin
  Accessibility untuk Terminal; skrip hanya menguji command yang dipanggil tombolnya.
- Yang tidak diporting: font Cinzel (tidak terpasang), animasi garis dashed
  (runtime hanya menganimasikan opacity/transform).
## Cek fungsi (app harus terbuka)

```sh
./test-fungsi.sh
```

23 cek terhadap window yang hidup: layout aktif + `errors: []`, enam mod dimuat runtime
(`herdr-app check`), tema benar-benar terpain (sampel piksel: chrome sidebar, parchment
inspector, merah SET SAIL — light dan dark), `settings.json` tidak dilawan balik app,
`layout.switch` pulang-pergi, `tab.new`/`tab.close` (perintah tombol `+`), enam potret
96x96, dan `hc read --json` (sumber crew chat). Setelan tema kamu dipulihkan di akhir,
termasuk kalau tes gagal.

