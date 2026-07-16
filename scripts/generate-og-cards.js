/**
 * Generate Open Graph share-card PNGs (1200×630) — one per milestone category
 * plus a default, plus one per SEO landing page (lp-<slug>.jpg). Rendered
 * with Playwright so emoji and gradients look right.
 *
 * Run: node scripts/generate-og-cards.js
 * Output: assets/og/<name>.jpg (committed — the worker /share route and
 * the static pages reference them by URL)
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PAGES } from './landing-pages-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'assets', 'og');

const CARDS = [
    { name: 'default', emoji: '🎉', label: 'Nerdy milestone incoming!' },
    { name: 'planetary', emoji: '🪐', label: 'A planetary birthday approaches' },
    { name: 'decimal', emoji: '🔢', label: 'A big round number approaches' },
    { name: 'binary', emoji: '💻', label: 'A power-of-two moment approaches' },
    { name: 'mathematical', emoji: '📐', label: 'A mathematical moment approaches' },
    { name: 'fibonacci', emoji: '🌀', label: 'A Fibonacci moment approaches' },
    { name: 'scientific', emoji: '🔬', label: 'A cosmic milestone approaches' },
    { name: 'pop-culture', emoji: '🎬', label: 'A legendary moment approaches' },
    ...PAGES.map(p => ({ name: `lp-${p.slug}`, emoji: p.emoji, label: p.heading })),
];

function cardHtml({ emoji, label }) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 28px;
    background:
      radial-gradient(ellipse 900px 500px at 20% 0%, rgba(124, 58, 237, 0.35), transparent),
      radial-gradient(ellipse 700px 400px at 85% 100%, rgba(59, 130, 246, 0.25), transparent),
      linear-gradient(160deg, #0a0a1a 0%, #141032 60%, #0a0a1a 100%);
    font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #fff; position: relative;
  }
  .star { position: absolute; background: #fff; border-radius: 50%; }
  .emoji { font-size: 160px; line-height: 1; }
  .title {
    font-size: 84px; font-weight: 900; letter-spacing: 0.06em;
    background: linear-gradient(90deg, #c084fc, #f4d58d);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .label { font-size: 38px; color: rgba(255, 255, 255, 0.85); }
  .url { position: absolute; bottom: 36px; font-size: 26px; color: rgba(255, 255, 255, 0.5); letter-spacing: 0.04em; }
</style></head>
<body>
  ${Array.from({ length: 60 }, (_, i) => {
        const x = (i * 137.5) % 100;
        const y = (i * 61.8) % 100;
        const s = 1 + (i % 3);
        const o = 0.2 + ((i % 5) / 8);
        return `<div class="star" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;opacity:${o}"></div>`;
    }).join('')}
  <div class="emoji">${emoji}</div>
  <div class="title">NERDIVERSARY</div>
  <div class="label">${label}</div>
  <div class="url">paultarjan.com/nerdiversary</div>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const card of CARDS) {
    await page.setContent(cardHtml(card), { waitUntil: 'networkidle' });
    const file = path.join(OUT_DIR, `${card.name}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
    console.log(`✓ ${path.relative(process.cwd(), file)}`);
}

await browser.close();
