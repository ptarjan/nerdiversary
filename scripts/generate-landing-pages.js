/**
 * Generate SEO landing pages — one per high-search-volume milestone — plus
 * sitemap.xml and robots.txt. Output is committed so deploys stay build-free.
 *
 * Page copy and date tables live in landing-pages-data.js (shared with
 * generate-og-cards.js, which renders each page's share card).
 *
 * Run: node scripts/generate-landing-pages.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PAGES, SITE_URL } from './landing-pages-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function jsonLd(page, canonical) {
    const app = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: page.title,
        url: canonical,
        description: page.description,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isPartOf: { '@type': 'WebSite', name: 'Nerdiversary', url: SITE_URL },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    };
    const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Nerdiversary', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: page.title, item: canonical },
        ],
    };
    return `<script type="application/ld+json">
    ${JSON.stringify(app, null, 2).replace(/\n/g, '\n    ')}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify(breadcrumbs, null, 2).replace(/\n/g, '\n    ')}
    </script>`;
}

function tableHtml(table) {
    if (!table) return '';
    return `
            <h2>${table.heading}</h2>
            <div class="landing-table-wrap">
                <table class="landing-table">
                    <thead><tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>
${table.rows.map(r => `                        <tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n')}
                    </tbody>
                </table>
            </div>
            <p class="landing-table-note">${table.note}</p>
`;
}

/** Redirect to the full results page with the entered birthday. */
const redirectScript = `
        const maxEl = document.getElementById('lp-date');
        maxEl.max = new Date().toISOString().split('T')[0];
        document.getElementById('lp-form').addEventListener('submit', e => {
            e.preventDefault();
            const d = maxEl.value;
            if (d) {
                location.href = 'results.html?family=' + encodeURIComponent('You|' + d);
            }
        });`;

/** Show the age breakdown right on the page (with ticking seconds). */
const liveScript = `
        const maxEl = document.getElementById('lp-date');
        maxEl.max = new Date().toISOString().split('T')[0];
        let timer = null;
        document.getElementById('lp-form').addEventListener('submit', e => {
            e.preventDefault();
            const d = maxEl.value;
            if (!d) return;
            const birth = new Date(d + 'T00:00:00');
            const box = document.getElementById('lp-answer');
            const fmt = n => n.toLocaleString('en-US');
            const render = () => {
                const ms = Date.now() - birth.getTime();
                const days = Math.floor(ms / 86400000);
                box.innerHTML =
                    '<div class="answer-big">' + fmt(days) + ' days old</div>' +
                    '<div class="answer-lines">' +
                    '<span>' + fmt(Math.floor(days / 7)) + ' weeks</span>' +
                    '<span>' + fmt(Math.floor(ms / 3600000)) + ' hours</span>' +
                    '<span>' + fmt(Math.floor(ms / 60000)) + ' minutes</span>' +
                    '<span>' + fmt(Math.floor(ms / 1000)) + ' seconds</span>' +
                    '</div>' +
                    '<a class="answer-link" href="results.html?family=' +
                    encodeURIComponent('You|' + d) + '">See all your nerdy milestones →</a>';
            };
            box.hidden = false;
            render();
            clearInterval(timer);
            timer = setInterval(render, 1000);
            box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });`;

function pageHtml(page) {
    const canonical = `${SITE_URL}${page.slug}.html`;
    const ogImage = `${SITE_URL}assets/og/lp-${page.slug}.jpg`;
    const others = PAGES.filter(p => p.slug !== page.slug);
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} - Nerdiversary</title>
    <meta name="description" content="${page.description}">
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:site_name" content="Nerdiversary">
    <meta property="og:title" content="${page.title}">
    <meta property="og:description" content="${page.description}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${page.heading}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${page.title}">
    <meta name="twitter:description" content="${page.description}">
    <meta name="twitter:image" content="${ogImage}">
    <meta name="theme-color" content="#7c3aed">

    ${jsonLd(page, canonical)}

    <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
    <link rel="icon" href="favicon.ico" sizes="any">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="stars"></div>
    <div class="twinkling"></div>

    <nav class="navbar">
        <a href="index.html" class="nav-logo">
            <img src="assets/logo.svg" alt="Nerdiversary" class="nav-logo-img">
            <span>Nerdiversary</span>
        </a>
        <a href="index.html" class="nav-link">All milestones →</a>
    </nav>

    <main class="container landing-container">
        <header class="hero">
            <div class="landing-emoji">${page.emoji}</div>
            <h1 class="title landing-title">${page.heading}</h1>
        </header>

        <section class="input-section">
            <form id="lp-form" class="birthday-form">
                <div class="form-group">
                    <label for="lp-date">Your birthday</label>
                    <input type="date" id="lp-date" required>
                </div>
                <button type="submit" class="submit-btn">
                    <span class="btn-text">${page.cta || 'Find My Milestone'}</span>
                    <span class="btn-icon">🚀</span>
                </button>
            </form>${page.live ? `
            <div id="lp-answer" class="landing-answer" hidden></div>` : ''}
        </section>

        <section class="landing-content">
            <p>${page.intro}</p>

            <h2>The math</h2>
            <ul>
                ${page.math.map(m => `<li>${m}</li>`).join('\n                ')}
            </ul>

            <p>${page.fact}</p>
${tableHtml(page.table)}
            <p>This is one of hundreds of milestones <a href="index.html">Nerdiversary</a> tracks — billion-second birthdays, planetary years, Fibonacci days, powers of two, and more. You can subscribe to your milestones as a calendar feed or get push notifications when one is coming up.</p>

            <h2>More milestone calculators</h2>
            <ul class="landing-links">
                ${others.map(p => `<li><a href="${p.slug}.html">${p.title}</a></li>`).join('\n                ')}
            </ul>
        </section>

        <footer class="footer">
            <p class="footer-note">Because celebrating every 365.2425 days is so mainstream</p>
            <p class="footer-link"><a href="https://github.com/ptarjan/nerdiversary" target="_blank">GitHub</a></p>
        </footer>
    </main>

    <script>${page.live ? liveScript : redirectScript}
    </script>
</body>
</html>
`;
}

// Write landing pages
for (const page of PAGES) {
    const file = path.join(ROOT, `${page.slug}.html`);
    fs.writeFileSync(file, pageHtml(page));
    console.log(`✓ ${page.slug}.html`);
}

// Sitemap (results.html is noindex — personal data in the URL — so it's excluded)
const lastmod = new Date().toISOString().split('T')[0];
const urls = ['', ...PAGES.map(p => `${p.slug}.html`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('✓ sitemap.xml');

// Robots
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /results.html\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
console.log('✓ robots.txt');
