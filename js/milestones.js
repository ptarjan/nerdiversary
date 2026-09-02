/**
 * Shared Milestone Calculations
 * Used by both website (nerdiversary.js) and calendar worker (worker.js)
 */

// ============================================================================
// TIME CONSTANTS
// ============================================================================

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000; // Gregorian calendar average
const MS_PER_MONTH = MS_PER_DAY * 30.4375;

// Maximum years to calculate milestones for
const MAX_YEARS = 120;

// Synodic month (new moon to new moon) in days
const SYNODIC_MONTH_DAYS = 29.530589;

// Lunation milestones (round-number lunar months since birth)
const lunationMilestones = [
    100, 200, 250, 300, 400, 500, 600, 700, 750, 800, 900, 1000
];

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

// Speed of light in meters per second
const SPEED_OF_LIGHT = 299792458;
const METERS_PER_LIGHT_YEAR = 9.461e15;

// Light-time units for milestones
const LIGHT_TIME_UNITS = [
    { seconds: 1, name: '1 Light-Second', wikiKey: 'lightSecond', desc: '299,792 km, enough to circle Earth\'s equator 7.5 times' },
    { seconds: 60, name: '1 Light-Minute', wikiKey: 'lightMinute', desc: 'about 18 million km, an eighth of the way to the Sun' },
    { seconds: 499, name: '1 Astronomical Unit', wikiKey: 'au', desc: 'the Earth-Sun distance, so the sunlight hitting you now is 8 minutes 19 seconds old' },
    { seconds: 3600, name: '1 Light-Hour', wikiKey: 'lightHour', desc: 'about 1.08 billion km, out past Jupiter but short of Saturn' },
    { seconds: 86400, name: '1 Light-Day', wikiKey: 'lightDay', desc: 'about 173 AU, more than four times as far out as Pluto' }
];

// Cosmic distances in meters
const COSMIC_DISTANCES = {
    moon: { name: 'the Moon', meters: 384400000, icon: '🌙' },
    sun: { name: 'the Sun', meters: 149597870700, icon: '☀️' },
    marsClosest: { name: 'Mars (closest)', meters: 54600000000, icon: '🔴' },
    jupiter: { name: 'Jupiter', meters: 628730000000, icon: '🪐' },
    saturn: { name: 'Saturn', meters: 1275000000000, icon: '💫' },
    neptune: { name: 'Neptune', meters: 4347000000000, icon: '🔵' },
    voyager1: { name: 'Voyager 1', meters: 24000000000000, icon: '🛸' },
    proximaCentauri: { name: 'Proxima Centauri', meters: 4.0208e16, icon: '⭐' }
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

// Fibonacci sequence (extended for seconds milestones - covers 95+ years)
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155, 165580141, 267914296, 433494437, 701408733, 1134903170, 1836311903, 2971215073];

// Lucas numbers (like Fibonacci but starts 2, 1)
const LUCAS = [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322, 521, 843, 1364, 2207, 3571, 5778, 9349, 15127, 24476, 39603, 64079, 103682, 167761, 271443, 439204, 710647, 1149851, 1860498, 3010349, 4870847, 7881196, 12752043, 20633239, 33385282, 54018521, 87403803];

// Lookup maps for O(1) index access (avoids O(n) indexOf calls).
// FIBONACCI omits the leading duplicate 1, so array[i] is conventionally F(i+2)
// (F(1)=F(2)=1, F(3)=2, ...). LUCAS starts at L(0)=2, so array[i] is L(i).
const FIBONACCI_INDEX = new Map(FIBONACCI.map((v, i) => [v, i + 2]));
const LUCAS_INDEX = new Map(LUCAS.map((v, i) => [v, i]));

// Perfect numbers (sum of proper divisors = number)
const PERFECT_NUMBERS = [6, 28, 496, 8128];

// Triangular numbers T(n) = n*(n+1)/2
// Goes to n=150 so INTERESTING_TRIANGULAR entries like 5778 (T(107)) and
// 8128 (T(127)) are reachable by the day-milestone filter
const TRIANGULAR = [];
for (let n = 1; n <= 150; n++) {
    TRIANGULAR.push(n * (n + 1) / 2);
}
const TRIANGULAR_INDEX = new Map(TRIANGULAR.map((v, i) => [v, i]));

// Palindrome numbers (interesting ones for days)
const PALINDROMES = [101, 111, 121, 131, 141, 151, 161, 171, 181, 191, 202, 212, 303, 313, 404, 414, 505, 515, 606, 616, 707, 717, 808, 818, 909, 919, 1001, 1111, 1221, 1331, 1441, 1551, 1661, 1771, 1881, 1991, 2002, 2112, 2222, 2332, 2442, 2552, 2662, 2772, 2882, 2992, 3003, 3113, 3223, 3333, 4004, 4114, 4224, 4334, 4444, 5005, 5115, 5225, 5335, 5445, 5555, 5775, 6006, 6116, 6226, 6336, 6446, 6556, 6666, 7007, 7117, 7227, 7337, 7447, 7557, 7667, 7777, 8008, 8118, 8228, 8338, 8448, 8558, 8668, 8778, 8888, 9009, 9119, 9229, 9339, 9449, 9559, 9669, 9779, 9889, 9999, 10001, 10101, 10201, 11011, 11111, 11211, 11311, 11411, 11511, 11611, 11711, 11811, 11911, 12021, 12121, 12221, 12321, 12921];

// Repunit numbers (all 1s)
const REPUNITS = [11, 111, 1111, 11111, 111111, 1111111, 11111111];

// Powers of 2 for binary milestones
const POWERS_OF_2 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// Powers of 2 for minute milestones
const MINUTE_POWERS = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

// Hexadecimal milestones
const HEX_MILESTONES = [
    { value: 0x100000, hex: '0x100000' },
    { value: 0x1000000, hex: '0x1000000' },
    { value: 0xFFFFFF, hex: '0xFFFFFF' },
    { value: 0x10000000, hex: '0x10000000' },
    { value: 0xDEADBEEF, hex: '0xDEADBEEF' }
];

// Palindrome hours
const PALINDROME_HOURS = [10001, 10101, 10201, 11011, 11111, 11211, 12021, 12121, 12221, 12321];

// Perfect numbers that work as hour milestones
const PERFECT_HOUR_NUMBERS = [496, 8128];

// Interesting triangular numbers for day milestones
const INTERESTING_TRIANGULAR = [666, 1225, 2016, 3003, 5050, 5778, 8128];

// Interesting palindrome days
const INTERESTING_PALINDROME_DAYS = [
    1001, 1221, 1331, 1441, 2112, 2552, 3003, 5005, 5775, 7007, 7337, 9009,
    10001, 10101, 11011, 11111, 12321, 12921
];

// Distance formatting thresholds (in meters)
const DISTANCE_THRESHOLD_LIGHT_YEAR = 1e15;
const DISTANCE_THRESHOLD_TRILLION_KM = 1e12;
const DISTANCE_THRESHOLD_BILLION_KM = 1e9;
const DISTANCE_THRESHOLD_MILLION_KM = 1e6;

// Milestone calculation limits
// High enough that fast planets aren't cut off within a lifetime:
// Mercury completes ~500 orbits in 120 Earth years (the maxDate check
// stops the loop early for slower planets)
const MAX_PLANETARY_YEARS = 500;
const SPEED_OF_LIGHT_MAX_MULTIPLE = 10;

// ============================================================================
// WIKIPEDIA URLS
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
// ============================================================================

const secondMilestones = [
    { value: 1e6, label: '1 Million Seconds', short: '10⁶ seconds (≈11.6 days)' },
    { value: 1e7, label: '10 Million Seconds', short: '10⁷ seconds (≈116 days)' },
    { value: 5e7, label: '50 Million Seconds', short: '5×10⁷ seconds (≈1.6 years)' },
    { value: 1e8, label: '100 Million Seconds', short: '10⁸ seconds (≈3.2 years)' },
    { value: 2.5e8, label: '250 Million Seconds', short: '2.5×10⁸ seconds (≈7.9 years)' },
    { value: 5e8, label: '500 Million Seconds', short: '5×10⁸ seconds (≈15.8 years)' },
    { value: 7.5e8, label: '750 Million Seconds', short: '7.5×10⁸ seconds (≈23.8 years)' },
    { value: 1e9, label: '1 Billion Seconds', short: '10⁹ seconds (≈31.7 years)' },
    { value: 1111111111, label: '1,111,111,111 Seconds', short: '1,111,111,111 seconds, all ones (≈35.2 years)' },
    { value: 1234567890, label: '1,234,567,890 Seconds', short: '1,234,567,890 seconds, the digits in order (≈39.1 years)' },
    { value: 1.3e9, label: '1.3 Billion Seconds', short: '1.3×10⁹ seconds (≈41.2 years)' },
    { value: 1.4e9, label: '1.4 Billion Seconds', short: '1.4×10⁹ seconds (≈44.4 years)' },
    { value: 1.5e9, label: '1.5 Billion Seconds', short: '1.5×10⁹ seconds (≈47.5 years)' },
    { value: 2e9, label: '2 Billion Seconds', short: '2×10⁹ seconds (≈63.4 years)' },
    { value: 2.5e9, label: '2.5 Billion Seconds', short: '2.5×10⁹ seconds (≈79.2 years)' },
    { value: 3e9, label: '3 Billion Seconds', short: '3×10⁹ seconds (≈95.1 years)' }
];

const minuteMilestones = [
    { value: 1e5, label: '100,000 Minutes', short: '10⁵ minutes (≈69 days)' },
    { value: 5e5, label: '500,000 Minutes', short: '5×10⁵ minutes (≈347 days)' },
    { value: 1e6, label: '1 Million Minutes', short: '10⁶ minutes (≈1.9 years)' },
    { value: 2e6, label: '2 Million Minutes', short: '2×10⁶ minutes (≈3.8 years)' },
    { value: 3e6, label: '3 Million Minutes', short: '3×10⁶ minutes (≈5.7 years)' },
    { value: 5e6, label: '5 Million Minutes', short: '5×10⁶ minutes (≈9.5 years)' },
    { value: 7.5e6, label: '7.5 Million Minutes', short: '7.5×10⁶ minutes (≈14.3 years)' },
    { value: 1e7, label: '10 Million Minutes', short: '10⁷ minutes (≈19 years)' },
    { value: 1.5e7, label: '15 Million Minutes', short: '1.5×10⁷ minutes (≈28.5 years)' },
    { value: 2e7, label: '20 Million Minutes', short: '2×10⁷ minutes (≈38 years)' },
    { value: 21e6, label: '21 Million Minutes', short: '21×10⁶ minutes (≈39.9 years)' },
    { value: 22e6, label: '22 Million Minutes', short: '22×10⁶ minutes (≈41.8 years)' },
    { value: 22222222, label: '22,222,222 Minutes', short: '22,222,222 minutes, all twos (≈42.3 years)' },
    { value: 23e6, label: '23 Million Minutes', short: '23×10⁶ minutes (≈43.7 years)' },
    { value: 24e6, label: '24 Million Minutes', short: '24×10⁶ minutes (≈45.6 years)' },
    { value: 2.5e7, label: '25 Million Minutes', short: '2.5×10⁷ minutes (≈47.5 years)' },
    { value: 3e7, label: '30 Million Minutes', short: '3×10⁷ minutes (≈57 years)' },
    { value: 4e7, label: '40 Million Minutes', short: '4×10⁷ minutes (≈76.1 years)' },
    { value: 5e7, label: '50 Million Minutes', short: '5×10⁷ minutes (≈95.1 years)' }
];

const hourMilestones = [
    { value: 1e4, label: '10,000 Hours', short: '10⁴ hours (≈1.14 years)' },
    { value: 2.5e4, label: '25,000 Hours', short: '2.5×10⁴ hours (≈2.9 years)' },
    { value: 5e4, label: '50,000 Hours', short: '5×10⁴ hours (≈5.7 years)' },
    { value: 7.5e4, label: '75,000 Hours', short: '7.5×10⁴ hours (≈8.6 years)' },
    { value: 1e5, label: '100,000 Hours', short: '10⁵ hours (≈11.4 years)' },
    { value: 1.5e5, label: '150,000 Hours', short: '1.5×10⁵ hours (≈17.1 years)' },
    { value: 2e5, label: '200,000 Hours', short: '2×10⁵ hours (≈22.8 years)' },
    { value: 2.5e5, label: '250,000 Hours', short: '2.5×10⁵ hours (≈28.5 years)' },
    { value: 3e5, label: '300,000 Hours', short: '3×10⁵ hours (≈34.2 years)' },
    { value: 4e5, label: '400,000 Hours', short: '4×10⁵ hours (≈45.6 years)' },
    { value: 5e5, label: '500,000 Hours', short: '5×10⁵ hours (≈57 years)' },
    { value: 6e5, label: '600,000 Hours', short: '6×10⁵ hours (≈68.4 years)' },
    { value: 7.5e5, label: '750,000 Hours', short: '7.5×10⁵ hours (≈85.6 years)' },
    { value: 1e6, label: '1 Million Hours', short: '10⁶ hours (≈114 years)' }
];

const dayMilestones = [
    { value: 1000, label: '1,000 Days', short: '10³ days (≈2.7 years)' },
    { value: 1500, label: '1,500 Days', short: '1.5×10³ days (≈4.1 years)' },
    { value: 2000, label: '2,000 Days', short: '2×10³ days (≈5.5 years)' },
    { value: 2500, label: '2,500 Days', short: '2.5×10³ days (≈6.8 years)' },
    { value: 3000, label: '3,000 Days', short: '3×10³ days (≈8.2 years)' },
    { value: 4000, label: '4,000 Days', short: '4×10³ days (≈11 years)' },
    { value: 5000, label: '5,000 Days', short: '5×10³ days (≈13.7 years)' },
    { value: 6000, label: '6,000 Days', short: '6×10³ days (≈16.4 years)' },
    { value: 7000, label: '7,000 Days', short: '7×10³ days (≈19.2 years)' },
    { value: 7500, label: '7,500 Days', short: '7.5×10³ days (≈20.5 years)' },
    { value: 8000, label: '8,000 Days', short: '8×10³ days (≈21.9 years)' },
    { value: 9000, label: '9,000 Days', short: '9×10³ days (≈24.6 years)' },
    { value: 10000, label: '10,000 Days', short: '10⁴ days (≈27.4 years)' },
    { value: 11111, label: '11,111 Days', short: '11,111 days, all ones (≈30.4 years)' },
    { value: 12345, label: '12,345 Days', short: '12,345 days, the digits in order (≈33.8 years)' },
    { value: 15000, label: '15,000 Days', short: '1.5×10⁴ days (≈41.1 years)' },
    { value: 16000, label: '16,000 Days', short: '1.6×10⁴ days (≈43.8 years)' },
    { value: 16384, label: '16,384 Days', short: '2¹⁴ days (≈44.9 years)' },
    { value: 17000, label: '17,000 Days', short: '1.7×10⁴ days (≈46.5 years)' },
    { value: 17500, label: '17,500 Days', short: '1.75×10⁴ days (≈47.9 years)' },
    { value: 18000, label: '18,000 Days', short: '1.8×10⁴ days (≈49.3 years)' },
    { value: 20000, label: '20,000 Days', short: '2×10⁴ days (≈54.8 years)' },
    { value: 22222, label: '22,222 Days', short: '22,222 days, all twos (≈60.8 years)' },
    { value: 25000, label: '25,000 Days', short: '2.5×10⁴ days (≈68.4 years)' },
    { value: 27500, label: '27,500 Days', short: '2.75×10⁴ days (≈75.3 years)' },
    { value: 30000, label: '30,000 Days', short: '3×10⁴ days (≈82.1 years)' },
    { value: 33333, label: '33,333 Days', short: '33,333 days, all threes (≈91.3 years)' }
];

const weekMilestones = [
    { value: 250, label: '250 Weeks', short: '250 weeks (≈4.8 years)' },
    { value: 500, label: '500 Weeks', short: '500 weeks (≈9.6 years)' },
    { value: 750, label: '750 Weeks', short: '750 weeks (≈14.4 years)' },
    { value: 1000, label: '1,000 Weeks', short: '10³ weeks (≈19.2 years)' },
    { value: 1250, label: '1,250 Weeks', short: '1,250 weeks (≈24 years)' },
    { value: 1500, label: '1,500 Weeks', short: '1,500 weeks (≈28.7 years)' },
    { value: 1750, label: '1,750 Weeks', short: '1,750 weeks (≈33.5 years)' },
    { value: 2000, label: '2,000 Weeks', short: '2×10³ weeks (≈38.3 years)' },
    { value: 2100, label: '2,100 Weeks', short: '2,100 weeks (≈40.2 years)' },
    { value: 2200, label: '2,200 Weeks', short: '2,200 weeks (≈42.2 years)' },
    { value: 2222, label: '2,222 Weeks', short: '2,222 weeks, all twos (≈42.6 years)' },
    { value: 2300, label: '2,300 Weeks', short: '2,300 weeks (≈44.1 years)' },
    { value: 2400, label: '2,400 Weeks', short: '2,400 weeks (≈46 years)' },
    { value: 2500, label: '2,500 Weeks', short: '2,500 weeks (≈47.9 years)' },
    { value: 3000, label: '3,000 Weeks', short: '3×10³ weeks (≈57.5 years)' }
];

const monthMilestones = [
    { value: 100, label: '100 Months', short: '100 months (≈8.3 years)' },
    { value: 200, label: '200 Months', short: '200 months (≈16.7 years)' },
    { value: 250, label: '250 Months', short: '250 months (≈20.8 years)' },
    { value: 300, label: '300 Months', short: '300 months (≈25 years)' },
    { value: 400, label: '400 Months', short: '400 months (≈33.3 years)' },
    { value: 444, label: '444 Months', short: '444 months, all fours (≈37 years)' },
    { value: 500, label: '500 Months', short: '500 months (≈41.7 years)' },
    { value: 555, label: '555 Months', short: '555 months, all fives (≈46.3 years)' },
    { value: 600, label: '600 Months', short: '600 months (≈50 years)' },
    { value: 666, label: '666 Months', short: '666 months, the number of the beast (≈55.5 years)' },
    { value: 750, label: '750 Months', short: '750 months (≈62.5 years)' },
    { value: 1000, label: '1,000 Months', short: '10³ months (≈83.3 years)' }
];

// Number base milestones
const baseMilestones = [
    { base: 3, name: 'ternary', icon: '🔺', units: [
        { powers: [15, 16, 17, 18, 19, 20], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [11, 12, 13, 14, 15], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [8, 9, 10, 11, 12], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [6, 7, 8, 9], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 5, name: 'quinary', icon: '🖐️', units: [
        { powers: [10, 11, 12, 13, 14], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [8, 9, 10, 11], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [6, 7, 8, 9], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [5, 6, 7], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 6, name: 'senary', icon: '🎲', units: [
        { powers: [9, 10, 11, 12, 13], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [7, 8, 9, 10], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [5, 6, 7, 8], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [4, 5, 6], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 7, name: 'septenary', icon: '🌈', units: [
        { powers: [8, 9, 10, 11, 12], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [6, 7, 8, 9], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [5, 6, 7, 8], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [4, 5, 6], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 8, name: 'octal', icon: '🐙', units: [
        { powers: [7, 8, 9, 10, 11], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [5, 6, 7, 8], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5, 6, 7], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [3, 4, 5, 6], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 12, name: 'dozenal', icon: '🕛', units: [
        { powers: [6, 7, 8, 9], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [5, 6, 7], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5, 6], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [3, 4, 5], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 16, name: 'hexadecimal', icon: '🔷', units: [
        { powers: [7, 8], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [5, 6, 7], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [3, 4], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 20, name: 'vigesimal', icon: '🏛️', units: [
        { powers: [6, 7, 8], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [5, 6], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [4, 5], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [3, 4], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] },
    { base: 60, name: 'Babylonian', icon: '⏰', units: [
        { powers: [4, 5], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
        { powers: [3, 4], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
        { powers: [2, 3], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
        { powers: [2], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ] }
];

// Pop culture milestones
const popCultureMilestones = [
    { value: 42e6, unit: MS_PER_SECOND, label: '42 Million Seconds', icon: '🌌', desc: 'Your age in seconds just hit 42 million, the Answer to Life, the Universe, and Everything. Deep Thought needed 7.5 million years to compute it; you got there in about 16 months.' },
    { value: 1337, unit: MS_PER_DAY, label: '1,337 Days', icon: '🎮', desc: 'Day 1,337 of your life: in leetspeak those digits spell "leet". Peak elite status, reached about 4 months before your 4th birthday.' }
];

// Nerdy holidays
const nerdyHolidays = [
    { month: 1, day: 7, name: 'e Day', icon: '🔢', desc: 'the date reads 2/7, matching e ≈ 2.718, the base of natural logarithms', wikiKey: 'eDay' },
    { month: 2, day: 14, name: 'Pi Day', icon: '🥧', desc: 'the date reads 3/14, matching π ≈ 3.14159, and it is also Einstein\'s birthday', wikiKey: 'piDay' },
    { month: 4, day: 4, name: 'May the 4th', icon: '⚔️', desc: 'Star Wars Day, because "May the Fourth be with you"', wikiKey: 'starWarsDay' },
    { month: 5, day: 28, name: 'Tau Day', icon: '🌀', desc: 'the date reads 6/28, matching τ = 2π ≈ 6.283, one full turn in radians', wikiKey: 'tauDay' },
    { month: 9, day: 23, name: 'Mole Day', icon: '⚗️', desc: 'the date reads 10/23 for Avogadro\'s number, 6.022×10²³ particles per mole', wikiKey: 'moleDay' },
    { month: 10, day: 23, name: 'Fibonacci Day', icon: '🌀', desc: 'the date reads 11/23, spelling out 1, 1, 2, 3, the start of the Fibonacci sequence', wikiKey: 'fibonacciDay' }
];

// Earth birthday special labels
const primeAges = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113]);
const squareAges = { 4: '2²', 9: '3²', 16: '4²', 25: '5²', 36: '6²', 49: '7²', 64: '8²', 81: '9²', 100: '10²' };
const powerOf2Ages = { 2: '2¹', 4: '2²', 8: '2³', 16: '2⁴', 32: '2⁵', 64: '2⁶' };
const cubeAges = { 8: '2³', 27: '3³', 64: '4³' };
const hexRoundAges = { 16: '0x10', 32: '0x20', 48: '0x30', 64: '0x40', 80: '0x50', 96: '0x60', 112: '0x70' };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function toSuperscript(num) {
    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    return String(num).split('').map(d => superscripts[parseInt(d, 10)]).join('');
}

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
    toSubscript
};

// ESM export
export default MilestonesExports;
