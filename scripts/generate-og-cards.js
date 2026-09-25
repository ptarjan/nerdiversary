/**
 * Render the 1200x630 JPEG link-preview cards into assets/og/:
 *   default.jpg and <category>.jpg  used by the worker's /share page, which
 *                                   picks one by the milestone's category
 *   lp-<slug>.jpg                   one per landing page in landing-pages-data.js
 * Headless Chromium draws them, so emoji render as they do in a browser.
 * The output is committed; rerun after changing a label, a landing page's
 * heading or emoji, or the category list (which must match
 * OG_CARD_CATEGORIES in worker/worker.js).
 *
 * Run: npm run generate:og
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PAGES } from './landing-pages-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'assets', 'og');

const CARDS = [
    { name: 'default', emoji: '🎉', label: 'Birthdays counted in seconds, planets and more' },
    { name: 'planetary', emoji: '🪐', label: 'A birthday on Earth or another planet is coming up' },
    { name: 'decimal', emoji: '🔢', label: 'A round-number milestone is coming up' },
    { name: 'binary', emoji: '💻', label: 'A power-of-two milestone is coming up' },
    { name: 'mathematical', emoji: '📐', label: 'A math milestone: π, palindromes, perfect numbers and more' },
    { name: 'fibonacci', emoji: '🌀', label: 'A Fibonacci-number milestone is coming up' },
    { name: 'scientific', emoji: '🔬', label: 'A physics or astronomy milestone is coming up' },
    { name: 'pop-culture', emoji: '🎬', label: 'A pop-culture milestone is coming up' },
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
