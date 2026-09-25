/**
 * Content of the search landing pages. Read by generate-landing-pages.js
 * (the HTML, sitemap and robots.txt), generate-og-cards.js (each page's
 * lp-<slug>.jpg card) and the tests.
 *
 * Fields per page (strings may contain HTML):
 *   slug         file name: <slug>.html and assets/og/lp-<slug>.jpg
 *   emoji        shown above the h1 and on the card
 *   title        <title> (with " - Nerdiversary" appended), og/twitter
 *                title, and link text from the other landing pages
 *   heading      the h1, the card's label and og:image:alt
 *   description  meta, og and twitter description
 *   intro, fact  paragraphs;  math  bullet list under "The math"
 *   table        optional { heading, headers, rows, note } date table
 *   live         optional; true answers on the page instead of opening
 *                results.html
 *   cta          optional submit button text
 *
 * Searchers want the number, so title and description state it first.
 * Title stays within 45 characters so it fits Google's ~60 with the suffix;
 * description within 155. npm test enforces both limits.
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

const JAN1_NOTE = 'These dates assume a January 1 birth. Enter your birthday above to get yours.';

const AVG_YEAR = '365.2425 days per year (the average calendar year, counting leap days)';

export const PAGES = [
    {
        slug: 'billion-seconds',
        emoji: '🔢',
        title: '1 billion seconds is 31.7 years: your date',
        heading: 'You turn 1 billion seconds old at 31.7 years',
        description: '1 billion seconds is 31.7 years: about 31 years, 8 months and 8 days after you are born. Enter your birthday to get your date.',
        intro: 'A billion seconds is <strong>about 31 years, 8 months and 8 days</strong>. No calendar marks it, so most people pass it without noticing. Enter your birthday to get your date. For the exact second, add your birth time in the <a href="index.html">full calculator</a>.',
        math: [
            '1,000,000,000 seconds ÷ 86,400 seconds per day = <strong>11,574 days</strong>, plus 1 hour, 46 minutes and 40 seconds',
            `11,574 days ÷ ${AVG_YEAR} = <strong>31.69 years</strong>`,
            'Because of those extra 1 hour 46 minutes 40 seconds, birth time matters: born at 9:00 AM, you reach a billion seconds at 10:46:40 AM',
        ],
        fact: 'A million seconds is 11.6 days. A billion seconds is 1,000 times longer: 31.7 years.',
        table: {
            heading: 'Billion-second birthday by birth year',
            headers: ['Born', 'Turns 1 billion seconds old'],
            rows: yearRows(11574.074, 1975, 2005),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '2-billion-seconds',
        emoji: '⏳',
        title: '2 billion seconds is 63.4 years: your date',
        heading: 'You turn 2 billion seconds old at 63.4 years',
        description: '2 billion seconds is 63.4 years: about 63 years and 4½ months after you are born. Enter your birthday to get your date.',
        intro: 'Two billion seconds is <strong>about 63 years and 4½ months</strong>. It takes exactly as long as the first billion, and even fewer people notice it. Enter your birthday to get your date. For the exact second, add your birth time in the <a href="index.html">full calculator</a>.',
        math: [
            '2,000,000,000 seconds ÷ 86,400 seconds per day = <strong>23,148 days</strong>, plus 3 hours, 33 minutes and 20 seconds',
            `23,148 days ÷ ${AVG_YEAR} = <strong>63.38 years</strong>`,
            'At 68.05 years you pass 2³¹ seconds (2,147,483,648), one more than a signed 32-bit integer can hold. Computers that count seconds from 1970 that way run out on January 19, 2038',
        ],
        fact: '3 billion seconds is 95.1 years, so for most people 2 billion is the last billion-second birthday they reach.',
        table: {
            heading: '2-billion-second birthday by birth year',
            headers: ['Born', 'Turns 2 billion seconds old'],
            rows: yearRows(23148.148, 1945, 1980),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '10000-days',
        emoji: '📆',
        title: '10,000 days is 27.4 years: find your date',
        heading: 'You turn 10,000 days old at 27.4 years',
        description: '10,000 days is 27.4 years: about 4½ months after your 27th birthday. Enter your birthday to get the date you turn 10,000 days old.',
        intro: '10,000 days is <strong>27.38 years</strong>, so you reach day 10,000 about 4½ months after your 27th birthday. Enter your birthday to get the exact date.',
        math: [
            `10,000 days ÷ ${AVG_YEAR} = <strong>27.38 years</strong>`,
            '0.38 of a year is about 4½ months',
            'The next round numbers: 20,000 days at 54.8 years, 30,000 days at 82.1 years',
        ],
        fact: 'An 80-year life is about 29,220 days, so day 10,000 comes roughly a third of the way through.',
        table: {
            heading: '10,000th day by birth year',
            headers: ['Born', 'Turns 10,000 days old'],
            rows: yearRows(10000, 1985, 2010),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '20000-days',
        emoji: '🗓️',
        title: '20,000 days is 54.8 years: find your date',
        heading: 'You turn 20,000 days old at 54.8 years',
        description: '20,000 days is 54.8 years: about 9 months after your 54th birthday. Enter your birthday to get the date you turn 20,000 days old.',
        intro: '20,000 days is <strong>54.76 years</strong>, so you reach day 20,000 about 9 months after your 54th birthday. Enter your birthday to get the exact date.',
        math: [
            `20,000 days ÷ ${AVG_YEAR} = <strong>54.76 years</strong>`,
            '0.76 of a year is about 9 months',
            'You reach 10,000 days at 27.4 years and 30,000 days at 82.1 years',
        ],
        fact: 'At an average of 70 beats a minute, a heart beats about 2 billion times in 20,000 days.',
        table: {
            heading: '20,000th day by birth year',
            headers: ['Born', 'Turns 20,000 days old'],
            rows: yearRows(20000, 1955, 1985),
            note: JAN1_NOTE,
        },
    },
    {
        slug: '1000-days',
        emoji: '👶',
        title: '1,000 days old is 2.74 years: find the date',
        heading: 'A child turns 1,000 days old at 2.74 years',
        description: '1,000 days is 2.74 years: in the week before a child turns 2 years and 9 months. Enter the birthday to get the date they turn 1,000 days old.',
        intro: '1,000 days is <strong>2.74 years</strong>, so a child reaches it in the week before turning 2 years and 9 months. Child-health researchers also talk about “the first 1,000 days”, but they count from conception, so their 1,000 days end around the second birthday. This page counts from birth.',
        math: [
            `1,000 days ÷ ${AVG_YEAR} = <strong>2.74 years</strong>`,
            'That is about 8.9 months after the second birthday',
            'The next round numbers: 2,000 days at 5.5 years, 5,000 days at 13.7 years',
        ],
        fact: '1,000 days is also 24,000 hours, or 86.4 million seconds.',
        table: {
            heading: '1,000th day by birth year',
            headers: ['Born', 'Turns 1,000 days old'],
            rows: yearRows(1000, 2020, 2026),
            note: JAN1_NOTE,
        },
    },
    {
        slug: 'half-birthday',
        emoji: '🎂',
        title: 'Half birthday: 182.6 days after your birthday',
        heading: 'Your half birthday is 182.6 days after your birthday',
        description: 'Your half birthday is 182.6 days after your birthday, which can be up to 2 days off “same date, 6 months later”. Get your ½, ¼ and ¾ birthdays.',
        intro: 'Your half birthday is the day you turn some-and-a-half years old (<strong>5½, 10½, 30½</strong> and so on): 182.6 days after your birthday. Counting “same date, six months later” can be up to 2 days off, because months run from 28 to 31 days. Enter your birthday to get your half, quarter and three-quarter birthdays for every year.',
        math: [
            'A year averages 365.2425 days once leap days are counted. Half of that is <strong>182.62 days</strong>',
            'Six calendar months range from 181 to 184 days, which is why the “same date” shortcut drifts',
            'Quarter birthday: 91.3 days after your birthday. Three-quarter birthday: 273.9 days after',
        ],
        fact: 'Children with summer birthdays often celebrate their half birthday at school instead, since their real one falls in the holidays.',
        table: {
            heading: 'Half birthday by birth month',
            headers: ['Born', 'Half birthday (182.6 days later)'],
            rows: Array.from({ length: 12 }, (_, m) => {
                const born = new Date(Date.UTC(2025, m, 1));
                const half = new Date(born.getTime() + Math.round(182.62125 * MS_PER_DAY));
                const opts = { month: 'long', day: 'numeric', timeZone: 'UTC' };
                return [born.toLocaleDateString('en-US', opts), half.toLocaleDateString('en-US', opts)];
            }),
            note: 'Examples use the 1st of each month in a non-leap year. Born later in the month? Add the same number of days.',
        },
    },
    {
        slug: 'mars-year',
        emoji: '♂️',
        title: 'A Mars year is 687 days: your age on Mars',
        heading: 'Your age in Mars years is your Earth age ÷ 1.88',
        description: 'A Mars year is 687 Earth days, or 1.88 Earth years, so a 30-year-old is 15.9 in Mars years. Enter your birthday to get the date of each Mars birthday.',
        intro: 'Mars takes <strong>687 Earth days</strong> (1.88 Earth years) to go around the Sun once. That is one Mars year, so your age in Mars years is your Earth age divided by 1.88. Enter your birthday to get the date of each of your Mars birthdays.',
        math: [
            'Mars orbits the Sun once every <strong>686.98 Earth days</strong>',
            'Age in Mars years = age in Earth days ÷ 686.98',
            'A 30-year-old is 30 × 365.2425 = 10,957 days old, which is 15.9 Mars years',
        ],
        fact: 'The same calculation works for every planet. A Mercury year is 88 Earth days, so Mercury birthdays come about four times a year. A Neptune year is 165 Earth years, so nobody has had one.',
        table: {
            heading: 'Mars years in Earth years',
            headers: ['Age on Mars', 'Age on Earth'],
            rows: Array.from({ length: 16 }, (_, i) => {
                const n = i + 1;
                const years = (n * 686.98) / DAYS_PER_YEAR;
                return [`${n} Mars year${n === 1 ? '' : 's'}`, `${years.toFixed(1)} Earth years`];
            }),
            note: 'One Mars year = 686.98 Earth days = 1.88 Earth years.',
        },
    },
    {
        slug: 'saturn-return',
        emoji: '🪐',
        title: 'Saturn return is at age 29.5: find your date',
        heading: 'Your first Saturn return is at age 29½',
        description: 'Your first Saturn return is at age 29.5, one Saturn orbit (10,759 days) after birth. Enter your birthday to get the date, plus the second and third.',
        intro: 'Saturn takes <strong>29.46 Earth years</strong> to go around the Sun, so at about 29½ it is back where it was when you were born. That is your Saturn return. It is the same date as your first Saturn birthday: the day you turn 1 in Saturn years, one Saturn year being 29.46 Earth years. Astrologers tie it to the start of adulthood. Enter your birthday to get your date.',
        math: [
            'Saturn’s orbital period is <strong>10,759 Earth days</strong>, or 29.46 years',
            'First return: age 29.5. Second: 58.9. Third: 88.4',
            'Astrologers date the return from when Saturn gets back to its birth position in the zodiac. That can differ from the orbital date by a few months, because for about 4½ months each year Saturn appears to move backwards across the sky (retrograde) as Earth overtakes it',
        ],
        fact: 'This site uses the orbital date. The same calculation gives your birthdays on every other planet, from Mercury (every 88 days) to Neptune (every 165 years).',
        table: {
            heading: 'First Saturn return by birth year',
            headers: ['Born', 'First Saturn return (orbital)'],
            rows: yearRows(10759.22, 1970, 2005),
            note: 'These dates assume a January 1 birth and Saturn’s average orbital period. The astrological date can differ by a few months. Enter your birthday above to get yours.',
        },
    },
    {
        slug: '1000-weeks',
        emoji: '📅',
        title: '1,000 weeks old is 19.2 years: your date',
        heading: 'You turn 1,000 weeks old at 19.2 years',
        description: '1,000 weeks is 7,000 days, or 19.2 years: about 2 months after your 19th birthday. Enter your birthday to get the date you turn 1,000 weeks old.',
        intro: '1,000 weeks is <strong>7,000 days</strong>, or 19.17 years, so you turn 1,000 weeks old about 2 months after your 19th birthday. Enter your birthday to get the exact date.',
        math: [
            '1,000 weeks × 7 days = <strong>7,000 days</strong>',
            `7,000 days ÷ ${AVG_YEAR} = <strong>19.17 years</strong>`,
            '2,000 weeks: 38.3 years. 3,000 weeks: 57.5 years. 4,000 weeks: 76.7 years',
        ],
        fact: 'An 80-year life is about 4,174 weeks. Oliver Burkeman’s book on time management, <em>Four Thousand Weeks</em>, is named after that number.',
        table: {
            heading: '1,000th week by birth year',
            headers: ['Born', 'Turns 1,000 weeks old'],
            rows: yearRows(7000, 1995, 2015),
            note: JAN1_NOTE,
        },
    },
    {
        slug: 'million-minutes',
        emoji: '⏱️',
        title: '1 million minutes is 1.9 years: the date',
        heading: 'A child turns 1 million minutes old at 1.9 years',
        description: '1 million minutes is 694 days, or 1.9 years: about 5 weeks before the second birthday. Enter a birthday to get the date.',
        intro: 'A million minutes is <strong>694 days, 10 hours and 40 minutes</strong>, or 1.9 years. A child reaches it about 5 weeks before their second birthday. Enter the birthday to get the date. For the exact minute, add the birth time in the <a href="index.html">full calculator</a>.',
        math: [
            '1,000,000 minutes ÷ 1,440 minutes per day = <strong>694.4 days</strong>',
            `694.4 days ÷ ${AVG_YEAR} = <strong>1.90 years</strong>`,
            'For comparison, a million seconds is only 11.6 days',
        ],
        fact: 'A 365-day year is 525,600 minutes, the number sung in “Seasons of Love” from the musical <em>Rent</em>. A million minutes is just under two of those.',
        table: {
            heading: 'Millionth minute by birth year',
            headers: ['Born', 'Turns 1 million minutes old'],
            rows: yearRows(694.444, 2019, 2026),
            note: JAN1_NOTE,
        },
    },
    {
        slug: 'how-many-days-old',
        emoji: '🧮',
        title: 'How many days old am I? Live counter',
        heading: 'How many days old are you?',
        description: 'Enter your birthday to see your age in days, weeks, hours, minutes and seconds, counting up live. 10,000 days is 27.4 years; 20,000 is 54.8.',
        live: true,
        cta: 'Count my days',
        intro: 'Enter your birthday and your age in days appears here, with weeks, hours, minutes and seconds counting up live. A round thousand days comes every 2.74 years, so you get one far more often than a birthday ending in zero.',
        math: [
            'Days old = full days since midnight on your birth date, in your time zone',
            'An 80-year life is about <strong>29,220 days</strong>: 4,174 weeks, or 2.5 billion seconds',
            '10,000 days = 27.4 years. 20,000 days = 54.8 years. 30,000 days = 82.1 years',
        ],
        fact: 'Some day counts are worth marking even though they are not round: day 11,111 (age 30.4), day 12,345 (age 33.8), and day 16,384 (age 44.9), which is 2¹⁴, a power of two.',
        table: {
            heading: 'Days old in years',
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
            note: 'Enter your birthday above to see where you are on this list.',
        },
    },
];
