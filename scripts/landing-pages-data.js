/**
 * Data for the SEO landing pages — shared by generate-landing-pages.js
 * (HTML + sitemap + robots) and generate-og-cards.js (per-page share cards).
 *
 * Each page: slug, emoji, title (tag + h2 links), heading (h1), description
 * (meta), intro, math (bullet list), fact, table (static indexable content),
 * and optionally live (instant on-page answer instead of redirecting) and
 * cta (submit button text).
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
        table: {
            heading: 'Billion-second birthdays by birth year',
            headers: ['Born', 'Billion-second birthday'],
            rows: yearRows(11574.074, 1975, 2005),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '2-billion-seconds',
        emoji: '⏳',
        title: '2 Billion Seconds Old Calculator',
        heading: 'When will you be 2 billion seconds old?',
        description: 'Calculate the exact date you turn 2,000,000,000 seconds old — about 63.4 years after you were born. Free two-billion-second birthday calculator.',
        intro: 'Your second billion seconds takes just as long as the first, but gets none of the press. It arrives about <strong>63 years and 4½ months</strong> after you were born — squarely in "still plenty of time to celebrate properly" territory. Enter your birthday to find your exact moment.',
        math: [
            '2,000,000,000 seconds ÷ 86,400 seconds per day = <strong>23,148 days</strong>',
            '23,148 days ÷ 365.2425 days per year ≈ <strong>63.38 years</strong>',
            'Bonus nerd milestone: at 68.1 years you pass 2³¹ seconds — the number that overflows a 32-bit Unix clock in the year 2038',
        ],
        fact: 'Almost nobody reaches 3 billion seconds — that takes 95.1 years. If you get there, you have earned the biggest cake technology can produce.',
        table: {
            heading: 'Two-billion-second birthdays by birth year',
            headers: ['Born', '2-billion-second birthday'],
            rows: yearRows(23148.148, 1945, 1980),
            note: JAN1_NOTE,
        },
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
        table: {
            heading: '10,000-day birthdays by birth year',
            headers: ['Born', '10,000th day'],
            rows: yearRows(10000, 1985, 2010),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '20000-days',
        emoji: '🗓️',
        title: '20,000 Days Old Calculator',
        heading: 'When will you be 20,000 days old?',
        description: 'Calculate the exact date you turn 20,000 days old — about 54.8 years after birth. Free 20,000-day milestone calculator with calendar reminders.',
        intro: 'Day 20,000 arrives about <strong>54 years and 9 months</strong> after you were born. It is the rare big round number that lands mid-life rather than at the start or end of it — and it deserves more than a normal Tuesday. Enter your birthday to find yours.',
        math: [
            '20,000 days ÷ 365.2425 days per year ≈ <strong>54.76 years</strong>',
            'That lands about 9 months after your 54th birthday',
            'You passed 10,000 days at ~27.4 years; 30,000 days waits at ~82.1',
        ],
        fact: 'By day 20,000 your heart has beaten roughly 2 billion times. It seems fair to give it a party.',
        table: {
            heading: '20,000-day birthdays by birth year',
            headers: ['Born', '20,000th day'],
            rows: yearRows(20000, 1955, 1985),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '1000-days',
        emoji: '👶',
        title: '1,000 Days Old Calculator',
        heading: 'When will your baby be 1,000 days old?',
        description: 'Calculate the exact date your child turns 1,000 days old — about 2 years and 9 months after birth. A perfect nerdy toddler milestone.',
        intro: 'The 1,000th day lands about <strong>2 years and 9 months</strong> after birth — the classic first big round number, and a favorite excuse for a tiny party. (Child-development researchers talk about "the first 1,000 days" too, though they usually count from conception — this calculator counts from birth.) Enter a birthday to find the date.',
        math: [
            '1,000 days ÷ 365.2425 days per year ≈ <strong>2.74 years</strong>',
            'That lands about 8.9 months after the second birthday',
            'The next stops: 2,000 days (~5.5 years) and 5,000 days (~13.7 years)',
        ],
        fact: 'A 1,000-day-old has slept roughly 13,000 hours — and so, approximately, have the parents. In shifts.',
        table: {
            heading: '1,000-day birthdays by birth year',
            headers: ['Born', '1,000th day'],
            rows: yearRows(1000, 2020, 2026),
            note: JAN1_NOTE,
        },
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
        table: {
            heading: 'Half birthdays by birth month',
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
        table: {
            heading: 'Mars birthdays vs Earth age',
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
        title: 'Saturn Return Calculator',
        heading: 'When is your Saturn return?',
        description: 'Calculate your Saturn return — the moment Saturn completes a full orbit and comes back to where it was when you were born, around age 29.5. Find your date.',
        intro: 'Saturn takes <strong>29.46 Earth years</strong> to circle the Sun. When it finally returns to the spot it occupied at your birth — your first Saturn return, at about age 29½ — astrologers call it a rite of passage into real adulthood, and astronomers call it one full Saturnian orbit. Either way, it happens exactly once every three decades, and this calculator finds your date.',
        math: [
            'Saturn’s orbital period is <strong>10,759 Earth days</strong> — 29.46 years',
            'First Saturn return: ~age 29½ · second: ~58.9 · third: ~88.4',
            'The astrological return (Saturn re-entering your natal position) can drift a few months either way because Saturn appears to move backwards — retrograde — for about 4½ months each year',
        ],
        fact: 'Whether or not the planets run your life, "one Saturn orbit old" is an objectively great birthday. It is also one of hundreds of planetary milestones this site tracks — Mercury years to Neptune years.',
        table: {
            heading: 'First Saturn return by birth year',
            headers: ['Born', 'First Saturn return (astronomical)'],
            rows: yearRows(10759.22, 1970, 2005),
            note: 'Dates assume a January 1 birth and Saturn’s mean orbital period; the astrological return can shift by a few months. Enter your birthday above for your date.',
        },
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
        table: {
            heading: '1,000-week birthdays by birth year',
            headers: ['Born', '1,000th week'],
            rows: yearRows(7000, 1995, 2015),
            note: JAN1_NOTE,
        },
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
        table: {
            heading: 'Million-minute birthdays by birth year',
            headers: ['Born', 'Millionth minute'],
            rows: yearRows(694.444, 2019, 2026),
            note: JAN1_NOTE,
        },
    },
    {
        slug: 'how-many-days-old',
        emoji: '🧮',
        title: 'How Many Days Old Am I? Calculator',
        heading: 'How many days old are you?',
        description: 'Find out exactly how many days, weeks, hours, minutes, and seconds you have been alive — instantly and free, with your next big milestones.',
        live: true,
        cta: 'How Old Am I?',
        intro: 'Enter your birthday and get your age in days — plus weeks, hours, minutes, and live-ticking seconds — instantly. Counting in days makes age more interesting: a birthday only comes once a year, but a round thousand days comes around every 2¾ years.',
        math: [
            'Days old = days elapsed since your birth date (this calculator counts calendar days from midnight)',
            'An 80-year life is about <strong>29,200 days</strong> — or 4,170 weeks, or 2.5 billion seconds',
            'The famous ones: 10,000 days ≈ 27.4 years, 20,000 days ≈ 54.8 years, 30,000 days ≈ 82.1 years',
        ],
        fact: 'Know your day count and you unlock the good milestones: day 12,345, day 11,111, day 16,384 (2¹⁴), and every palindrome in between.',
        table: {
            heading: 'Days-old milestones cheat sheet',
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
