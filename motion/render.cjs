// Usage:
//   node render.cjs stills 1.2,3.0,...            -> out/stills/f_<t>.png
//   node render.cjs video <start> <end> <out.mp4>  -> silent H.264 frames (60 fps)
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const R = process.env.RENDER_DEPS || '/tmp/r/node_modules';
const { chromium } = require(path.join(R, 'playwright-core'));
const FFMPEG = process.env.FFMPEG || require(path.join(R, 'ffmpeg-static'));
const ROOT = __dirname, FPS = 60;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); s.end(b); });
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.error('PAGEERROR', e.message));
  await p.goto(`http://127.0.0.1:${port}/film.html?capture=1`);
  await p.evaluate(() => window.ready);
  const [mode, a, c, out] = process.argv.slice(2);
  if (mode === 'stills') {
    fs.mkdirSync(path.join(ROOT, 'out/stills'), { recursive: true });
    for (const t of a.split(',').map(Number)) {
      await p.evaluate((t) => window.seek(t), t);
      await p.screenshot({ path: path.join(ROOT, `out/stills/f_${t.toFixed(2).padStart(5, '0')}.png`) });
    }
  } else {
    const f0 = Math.round(+a * FPS), f1 = Math.round(+c * FPS);
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      await p.evaluate((t) => window.seek(t), f / FPS);
      const buf = await p.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (f % 120 === 0) console.log(`frame ${f}/${f1} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
  }
  await b.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
