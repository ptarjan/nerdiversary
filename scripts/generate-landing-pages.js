/**
 * Generate SEO landing pages — one per high-search-volume milestone — plus
 * sitemap.xml and robots.txt. Output is committed so deploys stay build-free.
 *
 * Run: node scripts/generate-landing-pages.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://paultarjan.com/nerdiversary/';

const PAGES = [
    {
        slug: 'billion-seconds',
        emoji: '🔢',
        title: 'Billion Second Birthday Calculator',
        heading: 'When will you be 1 billion seconds old?',
        description: 'Find the exact date and time you turn 1,000,000,000 seconds old — about 31.7 years after you were born. Free billion-second birthday calculator.',
        intro: 'One billion seconds is one of the great hidden birthdays. It arrives roughly <strong>31 years, 8 months, and 8 days</strong> after you were born — and unless someone does the math, it slips by unnoticed. Enter your birthday (and birth time, if you know it) to find your exact billion-second moment.',
        math: [
            '1,000,000,000 seconds ÷ 86,400 seconds per day = <strong>11,574 days</strong> (and change)',
            '11,574 days ÷ 365.2425 days per year ≈ <strong>31.69 years</strong>',
            'If you were born at 9:00 AM, your billionth second lands at 10:46:40 AM — the time of day matters!',
        ],
        fact: 'To put a billion in perspective: a million seconds is only 11.6 days. A billion is 31.7 years. That gap is why billionaires and millionaires are not the same thing.',
    },
    {
        slug: '10000-days',
        emoji: '📆',
        title: '10,000 Days Old Calculator',
        heading: 'When will you be 10,000 days old?',
        description: 'Calculate the exact date you turn 10,000 days old — about 27.4 years after birth. Free 10,000-day birthday calculator with calendar reminders.',
        intro: 'Your 10,000th day on Earth arrives about <strong>27 years and 4.5 months</strong> after you were born — a once-in-a-lifetime round number that almost everyone misses. Enter your birthday to find yours.',
        math: [
            '10,000 days ÷ 365.2425 days per year ≈ <strong>27.38 years</strong>',
            'That lands roughly 4 months and 17 days after your 27th birthday',
            'Next stops: 20,000 days (~54.8 years) and 30,000 days (~82.1 years)',
        ],
        fact: 'A well-lived life is about 30,000 days long. Day 10,000 is a good moment to check the scoreboard.',
    },
    {
        slug: 'half-birthday',
        emoji: '🎂',
        title: 'Half Birthday Calculator',
        heading: 'When is your half birthday?',
        description: 'Find your exact half birthday — and your quarter and three-quarter birthdays too. Free half-birthday calculator with calendar export.',
        intro: 'Your half birthday is the day you turn exactly <strong>N½ years old</strong> — celebrated by summer babies with winter parties, and by anyone who thinks one birthday a year is not enough. This calculator finds your half, quarter, and three-quarter birthdays for every year of your life.',
        math: [
            'A half year here is half of 365.2425 days: <strong>182.62 days</strong> — not just “same day, six months later”',
            'That is why your true half birthday can drift a day from the naive date',
            'You also get ¼ (91.3 days) and ¾ (273.9 days) birthdays for extra celebrations',
        ],
        fact: 'Half birthdays are the gateway drug to nerdy milestones. Once you celebrate 29½, you are ready for 1 billion seconds.',
    },
    {
        slug: 'mars-year',
        emoji: '♂️',
        title: 'Mars Year Birthday Calculator',
        heading: 'How old are you in Mars years?',
        description: 'Calculate your age in Mars years and find your next Martian birthday — one Mars year is 687 Earth days. Includes all the planets.',
        intro: 'A year on Mars lasts <strong>687 Earth days</strong> — about 1.88 Earth years. Your Mars birthdays are rarer and stranger than the Earth kind, and yes, you are much younger there. Enter your birthday to find your Martian age and your next Mars-year milestone.',
        math: [
            'Mars orbits the Sun every <strong>686.98 Earth days</strong>',
            'Your age in Mars years = your age in Earth days ÷ 686.98',
            'A 30-year-old Earthling is a spry 15.9 in Mars years',
        ],
        fact: 'The calculator does all seven other planets too. Mercury birthdays come every 88 days; if you make it to one Neptune year (165 Earth years), notify the press.',
    },
    {
        slug: '1000-weeks',
        emoji: '📅',
        title: '1,000 Weeks Old Calculator',
        heading: 'When will you be 1,000 weeks old?',
        description: 'Find the exact date you turn 1,000 weeks old — about 19.2 years after birth. Free 1,000-week milestone calculator.',
        intro: 'Your 1,000th week arrives just past your 19th birthday — <strong>7,000 days</strong> into your life, before your brain has even finished wiring itself. Enter a birthday to find this and every other week-count milestone.',
        math: [
            '1,000 weeks × 7 = <strong>7,000 days</strong>',
            '7,000 ÷ 365.2425 ≈ <strong>19.16 years</strong> — about 2 months after turning 19',
            '2,000 weeks lands at ~38.3 years; 3,000 weeks at ~57.5; 4,000 weeks is a stretch goal',
        ],
        fact: 'The average human life is about 4,000 weeks — the number Oliver Burkeman built a whole book around. Knowing which week you are on is clarifying.',
    },
    {
        slug: 'million-minutes',
        emoji: '⏱️',
        title: '1 Million Minutes Old Calculator',
        heading: 'When will you (or your kid) be 1 million minutes old?',
        description: 'Calculate the exact moment of the 1,000,000-minute birthday — about 1.9 years after birth. A perfect nerdy toddler milestone.',
        intro: 'One million minutes arrives <strong>1 year and 328 days</strong> after birth — a perfect nerdy milestone for toddlers, and a favorite of spreadsheet-inclined parents. Enter a birthday (birth time recommended — minutes matter here) to find the exact moment.',
        math: [
            '1,000,000 minutes ÷ 1,440 minutes per day ≈ <strong>694.4 days</strong>',
            '694.4 ÷ 365.2425 ≈ <strong>1.90 years</strong> — a few weeks before the second birthday',
            'The million-second birthday comes much sooner: 11.6 days old',
        ],
        fact: 'Broadway did the math first: 525,600 minutes is one year. A million minutes is one year, ten months, and a lot more diapers.',
    },
];

function pageHtml(page) {
    const canonical = `${SITE_URL}${page.slug}.html`;
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
    <meta property="og:title" content="${page.title}">
    <meta property="og:description" content="${page.description}">
    <meta property="og:image" content="${SITE_URL}assets/og/default.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#7c3aed">

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
                    <span class="btn-text">Find My Milestone</span>
                    <span class="btn-icon">🚀</span>
                </button>
            </form>
        </section>

        <section class="landing-content">
            <p>${page.intro}</p>

            <h2>The math</h2>
            <ul>
                ${page.math.map(m => `<li>${m}</li>`).join('\n                ')}
            </ul>

            <p>${page.fact}</p>

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

    <script>
        const maxEl = document.getElementById('lp-date');
        maxEl.max = new Date().toISOString().split('T')[0];
        document.getElementById('lp-form').addEventListener('submit', e => {
            e.preventDefault();
            const d = maxEl.value;
            if (d) {
                location.href = 'results.html?family=' + encodeURIComponent('You|' + d);
            }
        });
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
const urls = ['', ...PAGES.map(p => `${p.slug}.html`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('✓ sitemap.xml');

// Robots
fs.writeFileSync(path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /results.html\n\nSitemap: ${SITE_URL}sitemap.xml\n`);
console.log('✓ robots.txt');
