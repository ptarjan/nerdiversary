/**
 * Milestone data: constants, number sequences, and the tables of values and
 * user-facing text that js/calculator.js turns into events. The website and
 * the notification worker both use this module (the worker through
 * js/calculator.js), so a change here changes
 * both the results page and when push notifications fire.
 */

// ============================================================================
// TIME CONSTANTS
// ============================================================================

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
// Average Gregorian year and month. Every "N years" figure the site shows
// and every fractional-age event uses these averages, not calendar dates.
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
const MS_PER_MONTH = MS_PER_DAY * 30.4375;

// Upper bound for age-based loops (birthdays, holidays, fractional ages).
// The window callers actually get is Calculator.calculate's yearsAhead.
const MAX_YEARS = 120;

// Synodic month (new moon to new moon), in days
const SYNODIC_MONTH_DAYS = 29.530589;

// Lunar-month counts that get an event
const lunationMilestones = [
    100, 200, 250, 300, 400, 500, 600, 700, 750, 800, 900, 1000
];

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

// Speed of light in meters per second (exact by definition)
const SPEED_OF_LIGHT = 299792458;
const METERS_PER_LIGHT_YEAR = 9.461e15;

// Distances light covers in a round amount of time. Each gets an event at
// `seconds` after birth. `name` is shown in the title and `desc` finishes the
// description sentence (no trailing period).
const LIGHT_TIME_UNITS = [
    { seconds: 1, name: '1 light-second', wikiKey: 'lightSecond', desc: '299,792 km, enough to go around Earth\'s equator 7.5 times' },
    { seconds: 60, name: '1 light-minute', wikiKey: 'lightMinute', desc: 'about 18 million km, an eighth of the way to the Sun' },
    { seconds: 499, name: '1 astronomical unit', wikiKey: 'au', desc: 'the average distance from Earth to the Sun, 149.6 million km. Sunlight takes 8 minutes 19 seconds to cross it' },
    { seconds: 3600, name: '1 light-hour', wikiKey: 'lightHour', desc: 'about 1.08 billion km, past Jupiter\'s orbit but short of Saturn\'s' },
    { seconds: 86400, name: '1 light-day', wikiKey: 'lightDay', desc: 'about 25.9 billion km, 173 times the Earth-Sun distance and more than four times Pluto\'s average distance from the Sun' }
];

// Destinations for the "Light from your birth reaches X" events, in meters.
// `where` is appended straight after the name in the description, so it
// carries its own leading space or comma. Each key must also be a WIKI_URLS key.
const COSMIC_DISTANCES = {
    moon: { name: 'the Moon', meters: 384400000, icon: '🌙' },
    sun: { name: 'the Sun', meters: 149597870700, icon: '☀️' },
    marsClosest: { name: 'Mars', where: ' at its closest to Earth', meters: 54600000000, icon: '🔴' },
    jupiter: { name: 'Jupiter', where: ' at a typical closest approach to Earth', meters: 628730000000, icon: '🪐' },
    saturn: { name: 'Saturn', where: ' at a typical closest approach to Earth', meters: 1275000000000, icon: '💫' },
    neptune: { name: 'Neptune', where: ' at a typical closest approach to Earth', meters: 4347000000000, icon: '🔵' },
    voyager1: { name: 'Voyager 1', where: ', the most distant spacecraft, as of 2023', meters: 24000000000000, icon: '🛸' },
    proximaCentauri: { name: 'Proxima Centauri', where: ', the nearest star after the Sun', meters: 4.0208e16, icon: '⭐' }
};

// ============================================================================
// MATHEMATICAL CONSTANTS
// ============================================================================

const { PI } = Math;
const { E } = Math;
const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = 2 * Math.PI;

// ============================================================================
// PLANETARY DATA
// ============================================================================

const PLANETS = {
    mercury: { name: 'Mercury', days: 87.969, icon: '☿️' },
    venus: { name: 'Venus', days: 224.701, icon: '♀️' },
    mars: { name: 'Mars', days: 686.980, icon: '♂️' },
    jupiter: { name: 'Jupiter', days: 4332.59, icon: '♃' },
    saturn: { name: 'Saturn', days: 10759.22, icon: '♄' },
    uranus: { name: 'Uranus', days: 30688.5, icon: '⛢' },
    neptune: { name: 'Neptune', days: 60182, icon: '♆' }
};

// ============================================================================
// NUMBER SEQUENCES
// ============================================================================

// Fibonacci numbers up to 2,971,215,073 (about 94 years in seconds)
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155, 165580141, 267914296, 433494437, 701408733, 1134903170, 1836311903, 2971215073];

// Lucas numbers: the Fibonacci rule, starting 2, 1
const LUCAS = [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322, 521, 843, 1364, 2207, 3571, 5778, 9349, 15127, 24476, 39603, 64079, 103682, 167761, 271443, 439204, 710647, 1149851, 1860498, 3010349, 4870847, 7881196, 12752043, 20633239, 33385282, 54018521, 87403803];

// Value -> conventional index, for the F₂₁ / L₁₀ labels.
// FIBONACCI omits the leading duplicate 1, so array[i] is F(i+2)
// (F(1)=F(2)=1, F(3)=2, ...). LUCAS starts at L(0)=2, so array[i] is L(i).
const FIBONACCI_INDEX = new Map(FIBONACCI.map((v, i) => [v, i + 2]));
const LUCAS_INDEX = new Map(LUCAS.map((v, i) => [v, i]));

// Perfect numbers (equal to the sum of their proper divisors); these four are
// all of them below 33,550,336, and the calculator's copy says so
const PERFECT_NUMBERS = [6, 28, 496, 8128];

// Triangular numbers T(n) = n*(n+1)/2 for n = 1..150. The range must cover
// every INTERESTING_TRIANGULAR entry (the largest is 8128 = T(127)), or the
// day filter never sees it. TRIANGULAR_INDEX maps a value to its array index,
// which is n - 1.
const TRIANGULAR = [];
for (let n = 1; n <= 150; n++) {
    TRIANGULAR.push(n * (n + 1) / 2);
}
const TRIANGULAR_INDEX = new Map(TRIANGULAR.map((v, i) => [v, i]));

// Palindromes the day filter picks from: it keeps 1,000-15,000 that are
// multiples of 1111, repdigits, or listed in INTERESTING_PALINDROME_DAYS
const PALINDROMES = [101, 111, 121, 131, 141, 151, 161, 171, 181, 191, 202, 212, 303, 313, 404, 414, 505, 515, 606, 616, 707, 717, 808, 818, 909, 919, 1001, 1111, 1221, 1331, 1441, 1551, 1661, 1771, 1881, 1991, 2002, 2112, 2222, 2332, 2442, 2552, 2662, 2772, 2882, 2992, 3003, 3113, 3223, 3333, 4004, 4114, 4224, 4334, 4444, 5005, 5115, 5225, 5335, 5445, 5555, 5775, 6006, 6116, 6226, 6336, 6446, 6556, 6666, 7007, 7117, 7227, 7337, 7447, 7557, 7667, 7777, 8008, 8118, 8228, 8338, 8448, 8558, 8668, 8778, 8888, 9009, 9119, 9229, 9339, 9449, 9559, 9669, 9779, 9889, 9999, 10001, 10101, 10201, 11011, 11111, 11211, 11311, 11411, 11511, 11611, 11711, 11811, 11911, 12021, 12121, 12221, 12321, 12921];

// Repunits (numbers written only with 1s); the calculator picks a range per unit
const REPUNITS = [111, 1111, 11111, 111111, 1111111, 11111111, 111111111, 1111111111];

// Exponents n for the 2^n-seconds events (2^20 s is about 12 days, 2^32 s about 136 years)
const POWERS_OF_2 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// Exponents n for the 2^n-minutes events
const MINUTE_POWERS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

// Second counts that are round or notable in hex. `note` is an optional
// closing sentence for the description.
const HEX_MILESTONES = [
    { value: 0x100000, hex: '0x100000' },
    { value: 0x1000000, hex: '0x1000000', note: '16,777,216 is also the number of colors a 24-bit screen can show.' },
    { value: 0xFFFFFF, hex: '0xFFFFFF', note: 'FFFFFF is also the web color code for white.' },
    { value: 0x10000000, hex: '0x10000000' },
    { value: 0xDEADBEEF, hex: '0xDEADBEEF', note: 'Programmers write DEADBEEF into memory as a marker because it spells English words using only hex digits.' }
];

// Hour counts that are palindromes; all get an event
const PALINDROME_HOURS = [10001, 10101, 10201, 11011, 11111, 11211, 12021, 12121, 12221, 12321];

// Perfect numbers that also get an hours event (496 h is about 21 days,
// 8,128 h about 339 days)
const PERFECT_HOUR_NUMBERS = [496, 8128];

// Triangular numbers that get a days event even when n is not a multiple of 10
const INTERESTING_TRIANGULAR = [666, 1225, 2016, 3003, 5050, 5778, 8128];

// Palindromes that get a days event even when not a multiple of 1111 or a repdigit
const INTERESTING_PALINDROME_DAYS = [
    1001, 1221, 1331, 1441, 2112, 2552, 3003, 5005, 5775, 7007, 7337, 9009,
    10001, 10101, 11011, 11111, 12321, 12921
];

// Distance formatting thresholds, in meters. The names describe the value's
// magnitude, not the unit shown: at 1e12 m the text switches to "billion km",
// at 1e9 m to "million km", below that it prints thousands of km.
const DISTANCE_THRESHOLD_LIGHT_YEAR = 1e15;
const DISTANCE_THRESHOLD_TRILLION_KM = 1e12;
const DISTANCE_THRESHOLD_BILLION_KM = 1e9;
const DISTANCE_THRESHOLD_MILLION_KM = 1e6;

// Loop caps. MAX_PLANETARY_YEARS must exceed Mercury's orbits in MAX_YEARS
// (about 498 in 120 years); slower planets stop at the maxDate check first.
// SPEED_OF_LIGHT_MAX_MULTIPLE: 1c..10c seconds, 10c being about 95 years.
const MAX_PLANETARY_YEARS = 500;
const SPEED_OF_LIGHT_MAX_MULTIPLE = 10;

// ============================================================================
// WIKIPEDIA URLS
// Keys are referenced by wikiKey fields, planet and destination keys, and
// baseMilestones names. A key with no entry renders as plain text, not a link.
// ============================================================================

const WIKI_URLS = {
    fibonacci: 'https://en.wikipedia.org/wiki/Fibonacci_sequence',
    lucas: 'https://en.wikipedia.org/wiki/Lucas_number',
    perfect: 'https://en.wikipedia.org/wiki/Perfect_number',
    triangular: 'https://en.wikipedia.org/wiki/Triangular_number',
    palindrome: 'https://en.wikipedia.org/wiki/Palindromic_number',
    repunit: 'https://en.wikipedia.org/wiki/Repunit',
    phi: 'https://en.wikipedia.org/wiki/Golden_ratio',
    pi: 'https://en.wikipedia.org/wiki/Pi',
    e: 'https://en.wikipedia.org/wiki/E_(mathematical_constant)',
    tau: 'https://en.wikipedia.org/wiki/Tau_(mathematics)',
    speedOfLight: 'https://en.wikipedia.org/wiki/Speed_of_light',
    tenKHours: 'https://en.wikipedia.org/wiki/Outliers_(book)',
    answer42: 'https://en.wikipedia.org/wiki/Phrases_from_The_Hitchhiker%27s_Guide_to_the_Galaxy#The_Answer_to_the_Ultimate_Question_of_Life,_the_Universe,_and_Everything_is_42',
    binary: 'https://en.wikipedia.org/wiki/Binary_number',
    ternary: 'https://en.wikipedia.org/wiki/Ternary_numeral_system',
    quinary: 'https://en.wikipedia.org/wiki/Quinary',
    senary: 'https://en.wikipedia.org/wiki/Senary',
    septenary: 'https://en.wikipedia.org/wiki/Septenary',
    octal: 'https://en.wikipedia.org/wiki/Octal',
    dozenal: 'https://en.wikipedia.org/wiki/Duodecimal',
    hexadecimal: 'https://en.wikipedia.org/wiki/Hexadecimal',
    vigesimal: 'https://en.wikipedia.org/wiki/Vigesimal',
    Babylonian: 'https://en.wikipedia.org/wiki/Sexagesimal',
    piDay: 'https://en.wikipedia.org/wiki/Pi_Day',
    starWarsDay: 'https://en.wikipedia.org/wiki/Star_Wars_Day',
    tauDay: 'https://en.wikipedia.org/wiki/Tau_Day',
    eDay: 'https://en.wikipedia.org/wiki/E_Day',
    moleDay: 'https://en.wikipedia.org/wiki/Mole_Day',
    fibonacciDay: 'https://en.wikipedia.org/wiki/Fibonacci_Day',
    lunation: 'https://en.wikipedia.org/wiki/Lunar_month#Synodic_month',
    mercury: 'https://en.wikipedia.org/wiki/Mercury_(planet)#Orbit,_rotation,_and_longitude',
    venus: 'https://en.wikipedia.org/wiki/Venus#Orbit_and_rotation',
    mars: 'https://en.wikipedia.org/wiki/Mars#Orbit_and_rotation',
    jupiter: 'https://en.wikipedia.org/wiki/Jupiter#Orbit_and_rotation',
    saturn: 'https://en.wikipedia.org/wiki/Saturn#Orbit_and_rotation',
    uranus: 'https://en.wikipedia.org/wiki/Uranus#Orbit_and_rotation',
    neptune: 'https://en.wikipedia.org/wiki/Neptune#Orbit_and_rotation',
    lightSecond: 'https://en.wikipedia.org/wiki/Light-second',
    lightMinute: 'https://en.wikipedia.org/wiki/Light-minute',
    lightHour: 'https://en.wikipedia.org/wiki/Light-hour',
    lightDay: 'https://en.wikipedia.org/wiki/Light-day',
    lightYear: 'https://en.wikipedia.org/wiki/Light-year',
    au: 'https://en.wikipedia.org/wiki/Astronomical_unit',
    moon: 'https://en.wikipedia.org/wiki/Moon',
    sun: 'https://en.wikipedia.org/wiki/Sun',
    marsClosest: 'https://en.wikipedia.org/wiki/Mars',
    voyager1: 'https://en.wikipedia.org/wiki/Voyager_1',
    proximaCentauri: 'https://en.wikipedia.org/wiki/Proxima_Centauri',
};

// ============================================================================
// MILESTONE DEFINITIONS
// Round counts in each unit. `label` is the event title as shown; the
// description adds the approximate duration and `note`, an optional closing
// sentence. Event ids are `<unit>-<value>`, so changing a label is safe but
// changing a value changes the id.
// ============================================================================

const secondMilestones = [
    { value: 1e6, label: '1 million seconds' },
    { value: 1e7, label: '10 million seconds' },
    { value: 5e7, label: '50 million seconds' },
    { value: 1e8, label: '100 million seconds' },
    { value: 2.5e8, label: '250 million seconds' },
    { value: 5e8, label: '500 million seconds' },
    { value: 7.5e8, label: '750 million seconds' },
    { value: 1e9, label: '1 billion seconds' },
    { value: 1111111111, label: '1,111,111,111 seconds', note: 'That is ten 1s in a row.' },
    { value: 1234567890, label: '1,234,567,890 seconds', note: 'Its digits run 1 to 9, then 0.' },
    { value: 1.3e9, label: '1.3 billion seconds' },
    { value: 1.4e9, label: '1.4 billion seconds' },
    { value: 1.5e9, label: '1.5 billion seconds' },
    { value: 2e9, label: '2 billion seconds' },
    { value: 2.5e9, label: '2.5 billion seconds' },
    { value: 3e9, label: '3 billion seconds' }
];

const minuteMilestones = [
    { value: 1e5, label: '100,000 minutes' },
    { value: 5e5, label: '500,000 minutes' },
    { value: 1e6, label: '1 million minutes' },
    { value: 2e6, label: '2 million minutes' },
    { value: 3e6, label: '3 million minutes' },
    { value: 5e6, label: '5 million minutes' },
    { value: 7.5e6, label: '7.5 million minutes' },
    { value: 1e7, label: '10 million minutes' },
    { value: 1.5e7, label: '15 million minutes' },
    { value: 2e7, label: '20 million minutes' },
    { value: 21e6, label: '21 million minutes' },
    { value: 22e6, label: '22 million minutes' },
    { value: 22222222, label: '22,222,222 minutes', note: 'That is eight 2s in a row.' },
    { value: 23e6, label: '23 million minutes' },
    { value: 24e6, label: '24 million minutes' },
    { value: 2.5e7, label: '25 million minutes' },
    { value: 3e7, label: '30 million minutes' },
    { value: 4e7, label: '40 million minutes' },
    { value: 5e7, label: '50 million minutes' }
];

const hourMilestones = [
    { value: 1e4, label: '10,000 hours' },
    { value: 2.5e4, label: '25,000 hours' },
    { value: 5e4, label: '50,000 hours' },
    { value: 7.5e4, label: '75,000 hours' },
    { value: 1e5, label: '100,000 hours' },
    { value: 1.5e5, label: '150,000 hours' },
    { value: 2e5, label: '200,000 hours' },
    { value: 2.5e5, label: '250,000 hours' },
    { value: 3e5, label: '300,000 hours' },
    { value: 4e5, label: '400,000 hours' },
    { value: 5e5, label: '500,000 hours' },
    { value: 6e5, label: '600,000 hours' },
    { value: 7.5e5, label: '750,000 hours' },
    { value: 1e6, label: '1 million hours' }
];

const dayMilestones = [
    { value: 1000, label: '1,000 days' },
    { value: 1500, label: '1,500 days' },
    { value: 2000, label: '2,000 days' },
    { value: 2500, label: '2,500 days' },
    { value: 3000, label: '3,000 days' },
    { value: 4000, label: '4,000 days' },
    { value: 5000, label: '5,000 days' },
    { value: 6000, label: '6,000 days' },
    { value: 7000, label: '7,000 days' },
    { value: 7500, label: '7,500 days' },
    { value: 8000, label: '8,000 days' },
    { value: 9000, label: '9,000 days' },
    { value: 10000, label: '10,000 days' },
    { value: 11111, label: '11,111 days', note: 'That is five 1s in a row.' },
    { value: 12345, label: '12,345 days', note: 'Its digits run 1 to 5.' },
    { value: 15000, label: '15,000 days' },
    { value: 16000, label: '16,000 days' },
    { value: 16384, label: '16,384 days', note: '16,384 is 2¹⁴, a power of 2.' },
    { value: 17000, label: '17,000 days' },
    { value: 17500, label: '17,500 days' },
    { value: 18000, label: '18,000 days' },
    { value: 20000, label: '20,000 days' },
    { value: 22222, label: '22,222 days', note: 'That is five 2s in a row.' },
    { value: 25000, label: '25,000 days' },
    { value: 27500, label: '27,500 days' },
    { value: 30000, label: '30,000 days' },
    { value: 33333, label: '33,333 days', note: 'That is five 3s in a row.' }
];

const weekMilestones = [
    { value: 250, label: '250 weeks' },
    { value: 500, label: '500 weeks' },
    { value: 750, label: '750 weeks' },
    { value: 1000, label: '1,000 weeks' },
    { value: 1250, label: '1,250 weeks' },
    { value: 1500, label: '1,500 weeks' },
    { value: 1750, label: '1,750 weeks' },
    { value: 2000, label: '2,000 weeks' },
    { value: 2100, label: '2,100 weeks' },
    { value: 2200, label: '2,200 weeks' },
    { value: 2222, label: '2,222 weeks', note: 'That is four 2s in a row.' },
    { value: 2300, label: '2,300 weeks' },
    { value: 2400, label: '2,400 weeks' },
    { value: 2500, label: '2,500 weeks' },
    { value: 3000, label: '3,000 weeks' }
];

const monthMilestones = [
    { value: 100, label: '100 months' },
    { value: 200, label: '200 months' },
    { value: 250, label: '250 months' },
    { value: 300, label: '300 months' },
    { value: 400, label: '400 months' },
    { value: 444, label: '444 months', note: 'That is three 4s in a row.' },
    { value: 500, label: '500 months' },
    { value: 555, label: '555 months', note: 'That is three 5s in a row.' },
    { value: 600, label: '600 months' },
    { value: 666, label: '666 months', note: '666 is the number of the beast in the Book of Revelation.' },
    { value: 750, label: '750 months' },
    { value: 1000, label: '1,000 months' }
];

// Powers of each base that read as 1 followed by zeros in that base.
// `name` is the WIKI_URLS key, `label` the base's name in text, `about` a
// parenthetical explaining it. Powers per unit are chosen to land within a
// lifetime.
const baseMilestones = [
    { base: 3, name: 'ternary', label: 'ternary', about: 'base 3, digits 0 to 2', icon: '🔺', units: [
        { powers: [15, 16, 17, 18, 19, 20], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [11, 12, 13, 14, 15], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [8, 9, 10, 11, 12], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [6, 7, 8, 9], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 5, name: 'quinary', label: 'quinary', about: 'base 5, the way you count on one hand', icon: '🖐️', units: [
        { powers: [10, 11, 12, 13, 14], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [8, 9, 10, 11], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [6, 7, 8, 9], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [5, 6, 7], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 6, name: 'senary', label: 'senary', about: 'base 6, digits 0 to 5', icon: '🎲', units: [
        { powers: [9, 10, 11, 12, 13], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [7, 8, 9, 10], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [5, 6, 7, 8], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [4, 5, 6], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 7, name: 'septenary', label: 'septenary', about: 'base 7, digits 0 to 6', icon: '🌈', units: [
        { powers: [8, 9, 10, 11, 12], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [6, 7, 8, 9], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [5, 6, 7, 8], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [4, 5, 6], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 8, name: 'octal', label: 'octal', about: 'base 8, digits 0 to 7', icon: '🐙', units: [
        { powers: [7, 8, 9, 10, 11], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [5, 6, 7, 8], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5, 6, 7], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [3, 4, 5, 6], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 12, name: 'dozenal', label: 'dozenal', about: 'base 12, counting in dozens', icon: '🕛', units: [
        { powers: [6, 7, 8, 9], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [5, 6, 7], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5, 6], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [3, 4, 5], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 16, name: 'hexadecimal', label: 'hexadecimal', about: 'base 16, digits 0 to 9 then A to F', icon: '🔷', units: [
        { powers: [7, 8], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [5, 6, 7], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [3, 4], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 20, name: 'vigesimal', label: 'vigesimal', about: 'base 20, the system the Maya used', icon: '🏛️', units: [
        { powers: [6, 7, 8], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [5, 6], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [3, 4], unit: 'days', ms: MS_PER_DAY }
    ] },
    { base: 60, name: 'Babylonian', label: 'sexagesimal', about: 'base 60, the Babylonian system behind 60 minutes to the hour', icon: '⏰', units: [
        { powers: [4, 5], unit: 'seconds', ms: MS_PER_SECOND },
        { powers: [3, 4], unit: 'minutes', ms: MS_PER_MINUTE },
        { powers: [2, 3], unit: 'hours', ms: MS_PER_HOUR },
        { powers: [2], unit: 'days', ms: MS_PER_DAY }
    ] }
];

// `id` is fixed rather than derived from `label` because calculator.js rarity
// sets refer to it; edit the label freely, never the id.
const popCultureMilestones = [
    { id: 'pop-42-Million-Seconds', value: 42e6, unit: MS_PER_SECOND, label: '42 million seconds', icon: '🌌', desc: 'In The Hitchhiker\'s Guide to the Galaxy, 42 is the Answer to the Ultimate Question of Life, the Universe, and Everything. The computer Deep Thought took 7.5 million years to work it out. 42 million seconds takes you about 16 months.' },
    { id: 'pop-1-337-Days', value: 1337, unit: MS_PER_DAY, label: '1,337 days', icon: '🎮', desc: 'In leetspeak, where digits stand in for letters, 1337 spells "leet", short for elite. You reach day 1,337 at about 3 years 8 months old.' }
];

// Yearly holidays, shown to everyone. `month` is 0-based like Date.getUTCMonth()
// (2 = March). `name` becomes the event id and the start of the title
// ("Pi Day 2027"); a test checks no other milestone title starts with it.
// `desc` finishes the sentence "<name>: <desc>." (no trailing period).
const nerdyHolidays = [
    { month: 1, day: 7, name: 'e Day', icon: '🔢', desc: 'February 7 is written 2/7 in US date format, the first digits of e ≈ 2.71828, the base of natural logarithms', wikiKey: 'eDay' },
    { month: 2, day: 14, name: 'Pi Day', icon: '🥧', desc: 'March 14 is written 3/14 in US date format, the first digits of π ≈ 3.14159, a circle\'s circumference divided by its diameter. It is also Albert Einstein\'s birthday', wikiKey: 'piDay' },
    { month: 4, day: 4, name: 'May the 4th', icon: '⚔️', desc: 'Star Wars Day. "May the Fourth" sounds like "May the Force", as in the films\' line "May the Force be with you"', wikiKey: 'starWarsDay' },
    { month: 5, day: 28, name: 'Tau Day', icon: '🌀', desc: 'June 28 is written 6/28 in US date format, the first digits of τ = 2π ≈ 6.28318, the number of radians in a full circle', wikiKey: 'tauDay' },
    { month: 9, day: 23, name: 'Mole Day', icon: '⚗️', desc: 'October 23 is written 10/23 in US date format, matching the 10²³ in Avogadro\'s number: one mole of any substance holds about 6.022×10²³ particles. Chemists mark it from 6:02 in the morning to 6:02 in the evening', wikiKey: 'moleDay' },
    { month: 10, day: 23, name: 'Fibonacci Day', icon: '🌀', desc: 'November 23 is written 11/23 in US date format, the first four Fibonacci numbers: 1, 1, 2, 3. Each Fibonacci number is the sum of the two before it', wikiKey: 'fibonacciDay' }
];

// Ages that get extra text on the Earth birthday event, keyed by age.
// The string values are the notation shown, e.g. 64 -> '8²'.
const primeAges = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113]);
const squareAges = { 4: '2²', 9: '3²', 16: '4²', 25: '5²', 36: '6²', 49: '7²', 64: '8²', 81: '9²', 100: '10²' };
const powerOf2Ages = { 2: '2¹', 4: '2²', 8: '2³', 16: '2⁴', 32: '2⁵', 64: '2⁶' };
const cubeAges = { 8: '2³', 27: '3³', 64: '4³' };
const hexRoundAges = { 16: '0x10', 32: '0x20', 48: '0x30', 64: '0x40', 80: '0x50', 96: '0x60', 112: '0x70' };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// 1 -> "1st", 22 -> "22nd", 113 -> "113th"
function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Non-negative integers only: each digit maps to its superscript character
function toSuperscript(num) {
    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    return String(num).split('').map(d => superscripts[parseInt(d, 10)]).join('');
}

/**
 * Describe a span of time in the unit a reader thinks in: days under a year
 * (one decimal under 20 days), years otherwise, one decimal at most.
 * @param {number} ms
 * @returns {string} e.g. "about 11.6 days", "about 116 days", "about 31.7 years"
 */
function approxDuration(ms) {
    const round = n => String(Math.round(n * 10) / 10);
    if (ms < MS_PER_YEAR) {
        const days = ms / MS_PER_DAY;
        const shown = days < 20 ? round(days) : String(Math.round(days));
        return `about ${shown} day${shown === '1' ? '' : 's'}`;
    }
    const shown = round(ms / MS_PER_YEAR);
    return `about ${shown} year${shown === '1' ? '' : 's'}`;
}

// Non-negative integers only: each digit maps to its subscript character
function toSubscript(num) {
    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(num).split('').map(d => subscripts[parseInt(d, 10)]).join('');
}

// ============================================================================
// EXPORTS
// ============================================================================

const MilestonesExports = {
    // Time constants
    MS_PER_SECOND,
    MS_PER_MINUTE,
    MS_PER_HOUR,
    MS_PER_DAY,
    MS_PER_WEEK,
    MS_PER_YEAR,
    MS_PER_MONTH,

    // Math constants
    PI,
    E,
    PHI,
    TAU,

    // Physical constants
    SPEED_OF_LIGHT,
    METERS_PER_LIGHT_YEAR,
    COSMIC_DISTANCES,

    // Planetary data
    PLANETS,

    // Number sequences
    FIBONACCI,
    LUCAS,
    FIBONACCI_INDEX,
    LUCAS_INDEX,
    PERFECT_NUMBERS,
    PERFECT_HOUR_NUMBERS,
    TRIANGULAR,
    TRIANGULAR_INDEX,
    INTERESTING_TRIANGULAR,
    PALINDROMES,
    INTERESTING_PALINDROME_DAYS,
    REPUNITS,
    POWERS_OF_2,
    MINUTE_POWERS,
    HEX_MILESTONES,
    PALINDROME_HOURS,

    // Distance thresholds
    DISTANCE_THRESHOLD_LIGHT_YEAR,
    DISTANCE_THRESHOLD_TRILLION_KM,
    DISTANCE_THRESHOLD_BILLION_KM,
    DISTANCE_THRESHOLD_MILLION_KM,

    // Lunar
    SYNODIC_MONTH_DAYS,
    lunationMilestones,

    // Limits
    MAX_YEARS,
    MAX_PLANETARY_YEARS,
    SPEED_OF_LIGHT_MAX_MULTIPLE,

    // Wikipedia URLs
    WIKI_URLS,

    // Light-time units
    LIGHT_TIME_UNITS,

    // Milestone definitions
    secondMilestones,
    minuteMilestones,
    hourMilestones,
    dayMilestones,
    weekMilestones,
    monthMilestones,
    baseMilestones,
    popCultureMilestones,
    nerdyHolidays,

    // Birthday special labels
    primeAges,
    squareAges,
    powerOf2Ages,
    cubeAges,
    hexRoundAges,

    // Helper functions
    getOrdinal,
    toSuperscript,
    toSubscript,
    approxDuration
};

export default MilestonesExports;
