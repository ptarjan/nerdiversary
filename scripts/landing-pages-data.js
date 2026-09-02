/**
 * Data for the SEO landing pages — shared by generate-landing-pages.js
 * (HTML + sitemap + robots) and generate-og-cards.js (per-page share cards).
 *
 * Each page: slug, emoji, title (tag + h2 links), heading (h1), description
 * (meta), intro, math (bullet list), fact, table (static indexable content),
 * and optionally live (instant on-page answer instead of redirecting) and
 * cta (submit button text).
 *
 * Copy rules (from Search Console data): searchers want the NUMBER, so
 * title and description lead with the answer, never with "Calculator".
 * Title ≤ 45 chars (the " - Nerdiversary" suffix eats the rest of Google's
 * ~60); description ≤ 155 chars with the numeric answer early.
 */

export const SITE_URL = 'https://paultarjan.com/nerdiversary/';

const MS_PER_DAY = 86400000;
const DAYS_PER_YEAR = 365.2425;

/** Format a UTC date like "August 8, 2021". */
function fmtUTC(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Milestone date for a January 1 birth in `year`, `offsetDays` later. */
function milestoneDate(year, offsetDays) {
    return fmtUTC(new Date(Date.UTC(year, 0, 1) + Math.round(offsetDays * MS_PER_DAY)));
}

/** Rows of [born Jan 1 YEAR, milestone date] for a range of birth years. */
function yearRows(offsetDays, from, to) {
    const rows = [];
    for (let y = from; y <= to; y++) {
        rows.push([`January 1, ${y}`, milestoneDate(y, offsetDays)]);
    }
    return rows;
}

const JAN1_NOTE = 'Dates assume a January 1 birth — enter your exact birthday above for your date.';

/** "X years and Y months" for a day count, for prose sanity checks. */
export function daysToYears(days) {
    return days / DAYS_PER_YEAR;
}

export const PAGES = [
    {
        slug: 'billion-seconds',
        emoji: '🔢',
        title: '1 Billion Seconds Is 31.7 Years: Your Date',
        heading: 'Your billion-second birthday lands at age 31.7',
        description: 'One billion seconds is 31.7 years — your billion birthday lands 31 years, 8 months, 8 days after birth. Get the exact date and time of yours.',
        intro: 'How long is a billion seconds? <strong>31 years, 8 months, and 8 days</strong> — which makes the billion-second birthday one of the great hidden ones. Unless someone does the math, it slips by unnoticed. Enter your birthday (and birth time, if you know it) to pin down your exact billionth second.',
        math: [
            '1,000,000,000 seconds ÷ 86,400 seconds per day = <strong>11,574 days</strong> (and change)',
            '11,574 days ÷ 365.2425 days per year ≈ <strong>31.69 years</strong>',
            'Born at 9:00 AM? Your billionth second strikes at 10:46:40 AM — the time of day matters',
        ],
        fact: 'For scale: a million seconds is only 11.6 days, while a billion is 31.7 years. That gap is why millionaires and billionaires are not the same thing.',
        table: {
            heading: 'When is your billion-second birthday? By birth year',
            headers: ['Born', 'Billion-second birthday'],
            rows: yearRows(11574.074, 1975, 2005),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '2-billion-seconds',
        emoji: '⏳',
        title: '2 Billion Seconds Is 63.4 Years: Your Date',
        heading: 'Your 2-billion-second birthday lands at age 63.4',
        description: 'Two billion seconds is 63.4 years — the 2,000,000,000-second birthday arrives about 63 years and 4½ months after birth. Find your exact date.',
        intro: 'How long is 2 billion seconds? <strong>63 years and 4½ months</strong>. Your second billion takes just as long as the first but gets none of the press — and it lands squarely in "still plenty of time to celebrate properly" territory. Enter your birthday to find your exact moment.',
        math: [
            '2,000,000,000 seconds ÷ 86,400 seconds per day = <strong>23,148 days</strong>',
            '23,148 days ÷ 365.2425 days per year ≈ <strong>63.38 years</strong>',
            'Bonus nerd milestone: at 68.1 years you pass 2³¹ seconds — the number that overflows a 32-bit Unix clock in 2038',
        ],
        fact: 'Going bigger: 3 billion seconds takes 95.1 years, and 8 billion would take 253½ — so 2 billion is realistically your last big seconds birthday. Earn the cake.',
        table: {
            heading: 'When is your 2-billion-second birthday? By birth year',
            headers: ['Born', '2-billion-second birthday'],
            rows: yearRows(23148.148, 1945, 1980),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '10000-days',
        emoji: '📆',
        title: '10,000 Days Is 27.4 Years: Find Your Date',
        heading: 'How long is 10,000 days? About 27.4 years',
        description: '10,000 days is 27.4 years — 27 years and roughly 4½ months. Find the exact date you turn 10,000 days old, or what was 10,000 days ago.',
        intro: 'How many years is 10,000 days? <strong>27.38</strong> — you hit day 10,000 about 27 years and 4½ months after you were born, a once-in-a-lifetime round number that almost everyone misses. It works in reverse, too: 10,000 days ago is 27-and-a-bit years back. Enter your birthday to find your date.',
        math: [
            '10,000 days ÷ 365.2425 days per year ≈ <strong>27.38 years</strong>',
            'That lands roughly 4 months and 17 days after your 27th birthday',
            'Next stops: 20,000 days (~54.8 years) and 30,000 days (~82.1 years)',
        ],
        fact: 'A well-lived life is about 30,000 days long, so day 10,000 is a good moment to check the scoreboard. (100,000 days would be 273.8 years — the calculator will happily print that date; biology will not cooperate.)',
        table: {
            heading: 'When is your 10,000th day? By birth year',
            headers: ['Born', '10,000th day'],
            rows: yearRows(10000, 1985, 2010),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '20000-days',
        emoji: '🗓️',
        title: '20,000 Days Is 54.8 Years: Find Your Date',
        heading: 'How long is 20,000 days? About 54.8 years',
        description: '20,000 days is 54.8 years — day 20,000 lands about 9 months after your 54th birthday. Find your exact date and put it on the calendar.',
        intro: 'How many years is 20,000 days? <strong>54.76</strong> — about 54 years and 9 months. Day 20,000 is the rare big round number that lands mid-life rather than at the start or end of it, and it deserves more than a normal Tuesday. Enter your birthday to find yours.',
        math: [
            '20,000 days ÷ 365.2425 days per year ≈ <strong>54.76 years</strong>',
            'That lands about 9 months after your 54th birthday',
            'You passed 10,000 days at ~27.4 years; 30,000 days waits at ~82.1',
        ],
        fact: 'By day 20,000 your heart has beaten roughly 2 billion times. Throwing it a party seems like the least you can do.',
        table: {
            heading: 'When is your 20,000th day? By birth year',
            headers: ['Born', '20,000th day'],
            rows: yearRows(20000, 1955, 1985),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '1000-days',
        emoji: '👶',
        title: '1,000 Days Old Is 2.74 Years: Baby Milestone',
        heading: 'Your baby turns 1,000 days old at 2 years, 9 months',
        description: '1,000 days old is 2.74 years — about 2 years and 9 months. Find the exact date your child hits day 1,000, the classic first big round number.',
        intro: 'How long is 1,000 days? <strong>2 years and 9 months</strong>, near enough — the first big round number of a life, and a favorite excuse for a tiny party. (Child-development researchers talk about "the first 1,000 days" too, though they usually count from conception — this calculator counts from birth.) Enter a birthday to find the date.',
        math: [
            '1,000 days ÷ 365.2425 days per year ≈ <strong>2.74 years</strong>',
            'That lands about 8.9 months after the second birthday',
            'Next stops: 2,000 days (~5.5 years) and 5,000 days (~13.7 years)',
        ],
        fact: 'A 1,000-day-old has slept roughly 13,000 hours — and so, approximately, have the parents. In shifts.',
        table: {
            heading: 'When is day 1,000? By birth year',
            headers: ['Born', '1,000th day'],
            rows: yearRows(1000, 2020, 2026),
            note: JAN1_NOTE,
        },
    },
    {
        slug: 'half-birthday',
        emoji: '🎂',
        title: 'Your Half Birthday Is 182.6 Days Later',
        heading: 'Your half birthday lands 182.6 days after your birthday',
        description: 'Your half birthday falls 182.6 days after your birthday — not simply "same day, six months later." Find your exact half, quarter, and ¾ birthdays.',
        intro: 'Your half birthday is the day you turn exactly <strong>N½ years old</strong> — 182.6 days after the real one, which is why it can land a day off the "same date, six months on" guess. Celebrated by summer babies with winter parties, and by anyone who thinks one birthday a year is not enough. This calculator finds your half, quarter, and three-quarter birthdays for every year of your life.',
        math: [
            'A half year here is half of 365.2425 days: <strong>182.62 days</strong> — not just “same day, six months later”',
            'That is why your true half birthday can drift a day from the naive date',
            'You also get ¼ (91.3 days) and ¾ (273.9 days) birthdays for extra celebrations',
        ],
        fact: 'Half birthdays are the gateway drug to nerdy milestones. Once you celebrate 29½, you are ready for 1 billion seconds.',
        table: {
            heading: 'Half birthday examples by birth month',
            headers: ['Born', 'Half birthday (≈182.6 days later)'],
            rows: Array.from({ length: 12 }, (_, m) => {
                const born = new Date(Date.UTC(2025, m, 1));
                const half = new Date(born.getTime() + Math.round(182.62125 * MS_PER_DAY));
                const opts = { month: 'long', day: 'numeric', timeZone: 'UTC' };
                return [born.toLocaleDateString('en-US', opts), half.toLocaleDateString('en-US', opts)];
            }),
            note: 'Examples use the 1st of each month — born later in the month, your half birthday shifts by the same number of days.',
        },
    },
    {
        slug: 'mars-year',
        emoji: '♂️',
        title: 'A Mars Year Is 687 Days: Your Age on Mars',
        heading: 'How old are you in Mars years? Divide by 1.88',
        description: 'One Mars year is 687 Earth days — 1.88 Earth years — so a 30-year-old is 15.9 on Mars. Calculate your Martian age and your next Mars birthday.',
        intro: 'A year on Mars lasts <strong>687 Earth days</strong> — about 1.88 Earth years — so your age in Mars years is your Earth age divided by 1.88. Mars birthdays are rarer and stranger than the Earth kind, and yes, you are much younger there. Enter your birthday to find your Martian age and your next Mars-year milestone.',
        math: [
            'Mars orbits the Sun every <strong>686.98 Earth days</strong>',
            'Your age in Mars years = your age in Earth days ÷ 686.98',
            'A 30-year-old Earthling is a spry 15.9 in Mars years',
        ],
        fact: 'The calculator does all seven other planets too. Mercury birthdays come every 88 days; if you make it to one Neptune year (165 Earth years), notify the press.',
        table: {
            heading: 'Every Mars birthday, in Earth years',
            headers: ['Mars birthday', 'Earth age'],
            rows: Array.from({ length: 16 }, (_, i) => {
                const n = i + 1;
                const years = (n * 686.98) / DAYS_PER_YEAR;
                const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
                return [`${n}${suffix} Mars year`, `${years.toFixed(1)} Earth years`];
            }),
            note: 'One Mars year = 686.98 Earth days (1.88 Earth years).',
        },
    },
    {
        slug: 'saturn-return',
        emoji: '🪐',
        title: 'Saturn Return Age Is 29.5: Find Your Date',
        heading: 'Your Saturn return arrives at age 29½',
        description: 'Your first Saturn return hits at age 29.5 — one full Saturn orbit (10,759 days) after your birth. Find your exact date, plus the second and third.',
        intro: 'What age is your Saturn return? About <strong>29½</strong> — Saturn takes 29.46 Earth years to circle the Sun, so that is when it first returns to the spot it occupied at your birth. Astrologers call it a rite of passage into real adulthood; astronomers call it one full Saturnian orbit. Either way, it happens exactly once every three decades, and this calculator finds your date.',
        math: [
            'Saturn’s orbital period is <strong>10,759 Earth days</strong> — 29.46 years',
            'First Saturn return: ~age 29½ · second: ~58.9 · third: ~88.4',
            'The astrological return (Saturn re-entering your natal position) can drift a few months either way because Saturn appears to move backwards — retrograde — for about 4½ months each year',
        ],
        fact: 'Whether or not the planets run your life, "one Saturn orbit old" is an objectively great birthday. It is also one of hundreds of planetary milestones this site tracks — Mercury years to Neptune years.',
        table: {
            heading: 'Your first Saturn return by birth year',
            headers: ['Born', 'First Saturn return (astronomical)'],
            rows: yearRows(10759.22, 1970, 2005),
            note: 'Dates assume a January 1 birth and Saturn’s mean orbital period; the astrological return can shift by a few months. Enter your birthday above for your date.',
        },
    },
    {
        slug: '1000-weeks',
        emoji: '📅',
        title: '1,000 Weeks Old Is 19.2 Years: Your Date',
        heading: '1,000 weeks old is 19.2 years old',
        description: '1,000 weeks is 19.2 years, or 7,000 days — you turn 1,000 weeks old just after your 19th birthday. Find the date, or what was 1,000 weeks ago.',
        intro: 'How long is 1,000 weeks? <strong>7,000 days</strong> — 19.2 years, which means you turn 1,000 weeks old a couple of months past your 19th birthday, before your brain has even finished wiring itself. (And 1,000 weeks ago? A hair over 19 years back.) Enter a birthday to find this and every other week-count milestone.',
        math: [
            '1,000 weeks × 7 = <strong>7,000 days</strong>',
            '7,000 ÷ 365.2425 ≈ <strong>19.16 years</strong> — about 2 months after turning 19',
            '2,000 weeks lands at ~38.3 years; 3,000 weeks at ~57.5; 4,000 weeks is a stretch goal',
        ],
        fact: 'The average human life is about 4,000 weeks — the number Oliver Burkeman built a whole book around. Knowing which week you are on is clarifying.',
        table: {
            heading: 'When is your 1,000th week? By birth year',
            headers: ['Born', '1,000th week'],
            rows: yearRows(7000, 1995, 2015),
            note: JAN1_NOTE,
        },
    },
    {
        slug: 'million-minutes',
        emoji: '⏱️',
        title: '1 Million Minutes Is 1.9 Years: The Date',
        heading: 'Your kid turns 1 million minutes old at 1.9 years',
        description: '1 million minutes is 1.9 years — 1 year and 328 days — so the millionth minute lands a few weeks before the second birthday. Find the exact moment.',
        intro: 'How long is a million minutes? <strong>1 year and 328 days</strong> — which parks the million-minute birthday a few weeks shy of the second one. It is a perfect nerdy milestone for toddlers, and a favorite of spreadsheet-inclined parents. Enter a birthday (birth time recommended — minutes matter here) to find the exact moment.',
        math: [
            '1,000,000 minutes ÷ 1,440 minutes per day ≈ <strong>694.4 days</strong>',
            '694.4 ÷ 365.2425 ≈ <strong>1.90 years</strong> — a few weeks before the second birthday',
            'The million-second birthday comes much sooner: 11.6 days old',
        ],
        fact: 'Broadway did the math first: 525,600 minutes is one year. A million minutes is one year, ten months, and a lot more diapers.',
        table: {
            heading: 'When is the millionth minute? By birth year',
            headers: ['Born', 'Millionth minute'],
            rows: yearRows(694.444, 2019, 2026),
            note: JAN1_NOTE,
        },
    },
    {
        slug: 'how-many-days-old',
        emoji: '🧮',
        title: 'How Many Days Old Am I? Live Counter',
        heading: 'How many days old are you? Watch it tick',
        description: 'Enter your birthday, see your age in days instantly — plus weeks, hours, minutes, and live-ticking seconds, and your next round-number milestone.',
        live: true,
        cta: 'How Old Am I?',
        intro: 'Enter your birthday and your age in days appears right here — plus weeks, hours, minutes, and seconds ticking live on the page. Counting in days makes age more interesting: a birthday only comes once a year, but a round thousand days comes around every 2¾ years.',
        math: [
            'Days old = days elapsed since your birth date (this calculator counts calendar days from midnight)',
            'An 80-year life is about <strong>29,200 days</strong> — or 4,170 weeks, or 2.5 billion seconds',
            'The famous ones: 10,000 days ≈ 27.4 years, 20,000 days ≈ 54.8 years, 30,000 days ≈ 82.1 years',
        ],
        fact: 'Know your day count and you unlock the good milestones: day 12,345, day 11,111, day 16,384 (2¹⁴), and every palindrome in between.',
        table: {
            heading: 'Days old to years: the cheat sheet',
            headers: ['Days old', 'Age in years'],
            rows: [
                ['1,000 days', '2.7 years'],
                ['5,000 days', '13.7 years'],
                ['7,000 days (1,000 weeks)', '19.2 years'],
                ['10,000 days', '27.4 years'],
                ['15,000 days', '41.1 years'],
                ['20,000 days', '54.8 years'],
                ['25,000 days', '68.4 years'],
                ['30,000 days', '82.1 years'],
            ],
            note: 'Enter your birthday above to see exactly where you are on this ladder.',
        },
    },
];
