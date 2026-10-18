# BPG — EVERYTHING CONNECTED
30 s · 1920×1080 · 60 fps · 1800 frames · H.264/AAC 48 kHz · Bahasa Indonesia

## Files
| Path | Role |
|---|---|
| `film.html` / `film.js` | Editable film source. `window.seek(t)` renders any time deterministically. Open `film.html` for wall-clock preview, `film.html?t=12.3` for one frame. |
| `audio.cjs` | Original procedural score + SFX (seeded, no samples) -> `out/score_raw.wav` |
| `render.cjs` | Playwright frame capture piped into FFmpeg (`stills` or `video` mode) |
| `assets/` | Brand assets captured from bintangpituglobal.com |
| `deliverables/` | Final MP4s + contact sheet |

## Rebuild
```
# deps (outside the repo): playwright-core + ffmpeg-static in /tmp/r (RENDER_DEPS overrides)
node audio.cjs                                    # score
ffmpeg loudnorm two-pass -> out/score.wav          # -14 LUFS, TP -1.5
node render.cjs video 0 8 out/seg_a.mp4            # segments can run in parallel
node render.cjs video 8 19 out/seg_b.mp4
node render.cjs video 19 30 out/seg_c.mp4
```

## Brand & asset inventory (verified on bintangpituglobal.com)
- **Logo**: `/logo.png` (500×500 badge: gold BB monogram, seven stars, globe, wordmark) -> `assets/logo_badge.png`; `/logos.png` (3D rendered variant) -> `assets/logo_mark.png`. Used undistorted, revealed with a circular mask only.
- **Typography**: site sans = **Geist** (also Montserrat / Source Sans 3 / Poppins on some pages). Film uses Geist + Geist Mono (Google Fonts, OFL), stored locally.
- **Colours (from site CSS)**: navy `#202331`, gold `#8E6A2D` / `#B8924A` (button), light gold `#D9B877` (derived for dark bg), ivory `#FFFDF8` / `#FAF7F1`, slate `#696D78`, accent green `#1A9B65`, purple `#7657D6`, blue `#2774C8`.
  The brief suggested emerald; the live brand is navy + gold, so gold replaced emerald as the "connection" colour.
- **Products (exact site names & taglines)**: BPG Enterprise ERP — "Stok, gudang, dan pembukuan terpadu"; Omni-channel POS / PITUONE POS — "Kasir cepat offline dan multi-cabang"; Human Capital Module / PITUONE KARAJA — "Absensi wajah, lembur, dan gaji"; BPG Smart CRM — "Lacak prospek dan riwayat chat"; SaaS & Cloud Infrastructure — "Server andal, cepat, dan aman"; Web & Mobile App (Layanan) — "Pengembangan khusus untuk integrasi dan kebutuhan yang lebih kompleks". Also on site: PITUONE WEBSITE, BPG Digital Ebook, BPG E-Course Academy, White-Label SaaS.
- **Brand copy reused**: "BPG SUITE · Satu basis data", "Sekali catat, dipakai semua divisi", hero "Semua cabang, gudang, dan kasir Anda berada di satu layar."
- **Screenshots**: `assets/site_full.png` (full homepage, 1440 w), crops `site_hero.png`, `site_products.png`, `site_workflow.png`.

## Storyboard as built
1. 0–4 s Problem: Kasir / Gudang / Keuangan panels enter from different depths, a sale (TRX-0218) stalls, dashed links break.
2. 4–8 s One gold line threads the three panels, morphs (sampled line -> circle) into the ring that mask-reveals the real logo.
3. 8–14 s The logo shrinks into the transaction token; POS -> Inventori -> Keuangan -> Dashboard, each panel reacts (stock 48->46, journal row, sales Rp 2.340.000 -> 2.440.000). Camera tracks the token.
4. 14–20 s Workflow folds into the dashboard which becomes the "BPG Suite" hub; six product cards (site styling, real names) orbit in 2.5D and are highlighted in turn.
5. 20–25 s The hub grows into a browser showing the real homepage: hero -> cursor click "Jelajahi produk" -> product grid (POS, ERP, HC cards lift) -> "Yang berubah ketika satu sistem dipakai bersama".
6. 25–30 s Browser collapses to a gold line -> ring -> seven-star heptagram ("Pitu") -> logo, wordmark, tagline, CTA, URL (final hold ~3 s).

## Notes / simplifications
- `pop-cinematic-motion`, `spring-motion`, `motion-studio` skills are **not installed** in this environment; equivalent rules applied (closed-form springs, pure `seek(t)`, no unseeded randomness, no CSS transitions, rAF only for live preview).
- No authentic in-app product UI is publicly accessible, so workflow panels are **illustrative** (labelled on screen "Data transaksi bersifat ilustrasi"); ecosystem cards reproduce the website's own product-card styling rather than inventing dashboards.
- Only the homepage was captured; product/service detail pages were read via HTML text, not screenshotted.
- No client logos, testimonials or metrics are used. The site's own claim "Server andal, cepat, dan aman" appears only as the official tagline.
- No motion blur (kept UI/text sharp). Audio is fully synthesized original material (no licensing needed).

## Revision 2 — Premium Light Enterprise (gold accents)
- Canvas: warm ivory `#FAF8F3` -> `#F3EEE4` tonal falloff, 4.5% grid, barely visible radial light.
- Cards: solid `#FFFFFF`, border `#E8E1D3`, radius 16px, 3-layer soft shadow; 380x300; uniform gold icons on `#F3EEE4` tiles.
- Text: headings navy `#202331` (web), secondary `#696D78`, gold text on white uses deep web gold `#8E6A2D` (contrast ~4.9:1).
- Connections (follow the website's gold): base `#E2D3B3` 2–2.5px, active `#B8924A` 3px, token gold with white rim, arrival = gold border flash + lift + soft ring pulse.
- Requested green palette was replaced with BPG gold on client request; final reveal uses web navy `#202331` instead of deep forest.
- Light -> dark: the navy canvas opens vertically from the collapsed browser line (no hard cut).
- Fixes: child `visibility` leaking through hidden parents (now `display`), S1 token label no longer covers card data.
