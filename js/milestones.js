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

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

// Speed of light in meters per second
const SPEED_OF_LIGHT = 299792458;
const METERS_PER_LIGHT_YEAR = 9.461e15;

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

// Lookup maps for O(1) index access (avoids O(n) indexOf calls)
const FIBONACCI_INDEX = new Map(FIBONACCI.map((v, i) => [v, i + 1]));
const LUCAS_INDEX = new Map(LUCAS.map((v, i) => [v, i + 1]));

// Perfect numbers (sum of proper divisors = number)
const PERFECT_NUMBERS = [6, 28, 496, 8128];

// Triangular numbers T(n) = n*(n+1)/2
const TRIANGULAR = [];
for (let n = 1; n <= 100; n++) {
    TRIANGULAR.push(n * (n + 1) / 2);
}
const TRIANGULAR_INDEX = new Map(TRIANGULAR.map((v, i) => [v, i]));

// Palindrome numbers (interesting ones for days)
const PALINDROMES = [101, 111, 121, 131, 141, 151, 161, 171, 181, 191, 202, 212, 303, 313, 404, 414, 505, 515, 606, 616, 707, 717, 808, 818, 909, 919, 1001, 1111, 1221, 1331, 1441, 1551, 1661, 1771, 1881, 1991, 2002, 2112, 2222, 2332, 2442, 2552, 2662, 2772, 2882, 2992, 3003, 3113, 3223, 3333, 4004, 4114, 4224, 4334, 4444, 5005, 5115, 5225, 5335, 5445, 5555, 6006, 6116, 6226, 6336, 6446, 6556, 6666, 7007, 7117, 7227, 7337, 7447, 7557, 7667, 7777, 8008, 8118, 8228, 8338, 8448, 8558, 8668, 8778, 8888, 9009, 9119, 9229, 9339, 9449, 9559, 9669, 9779, 9889, 9999, 10001, 10101, 10201, 11011, 11111, 11211, 11311, 11411, 11511, 11611, 11711, 11811, 11911, 12021, 12121, 12221, 12321];

// Repunit numbers (all 1s)
const REPUNITS = [11, 111, 1111, 11111, 111111, 1111111, 11111111];

// Powers of 2 for binary milestones
const POWERS_OF_2 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// ============================================================================
// MILESTONE DEFINITIONS
// ============================================================================

const secondMilestones = [
    { value: 1e6, label: '1 Million Seconds', short: '10⁶ seconds' },
    { value: 1e7, label: '10 Million Seconds', short: '10⁷ seconds' },
    { value: 5e7, label: '50 Million Seconds', short: '5×10⁷ seconds' },
    { value: 1e8, label: '100 Million Seconds', short: '10⁸ seconds' },
    { value: 2.5e8, label: '250 Million Seconds', short: '2.5×10⁸ seconds' },
    { value: 5e8, label: '500 Million Seconds', short: '5×10⁸ seconds' },
    { value: 7.5e8, label: '750 Million Seconds', short: '7.5×10⁸ seconds' },
    { value: 1e9, label: '1 Billion Seconds', short: '10⁹ seconds' },
    { value: 1111111111, label: '1,111,111,111 Seconds', short: '1.1B repunit seconds' },
    { value: 1234567890, label: '1,234,567,890 Seconds', short: 'sequential digits!' },
    { value: 1.3e9, label: '1.3 Billion Seconds', short: '1.3×10⁹ seconds' },
    { value: 1.4e9, label: '1.4 Billion Seconds', short: '1.4×10⁹ seconds' },
    { value: 1.5e9, label: '1.5 Billion Seconds', short: '1.5×10⁹ seconds' },
    { value: 2e9, label: '2 Billion Seconds', short: '2×10⁹ seconds' },
    { value: 2.5e9, label: '2.5 Billion Seconds', short: '2.5×10⁹ seconds' },
    { value: 3e9, label: '3 Billion Seconds', short: '3×10⁹ seconds' }
];

const minuteMilestones = [
    { value: 1e5, label: '100,000 Minutes', short: '10⁵ minutes' },
    { value: 5e5, label: '500,000 Minutes', short: '5×10⁵ minutes' },
    { value: 1e6, label: '1 Million Minutes', short: '10⁶ minutes' },
    { value: 2e6, label: '2 Million Minutes', short: '2×10⁶ minutes' },
    { value: 3e6, label: '3 Million Minutes', short: '3×10⁶ minutes' },
    { value: 5e6, label: '5 Million Minutes', short: '5×10⁶ minutes' },
    { value: 7.5e6, label: '7.5 Million Minutes', short: '7.5×10⁶ minutes' },
    { value: 1e7, label: '10 Million Minutes', short: '10⁷ minutes' },
    { value: 1.5e7, label: '15 Million Minutes', short: '1.5×10⁷ minutes' },
    { value: 2e7, label: '20 Million Minutes', short: '2×10⁷ minutes' },
    { value: 21e6, label: '21 Million Minutes', short: '21×10⁶ minutes' },
    { value: 22e6, label: '22 Million Minutes', short: '22×10⁶ minutes' },
    { value: 22222222, label: '22,222,222 Minutes', short: 'repdigit minutes' },
    { value: 23e6, label: '23 Million Minutes', short: '23×10⁶ minutes' },
    { value: 24e6, label: '24 Million Minutes', short: '24×10⁶ minutes' },
    { value: 2.5e7, label: '25 Million Minutes', short: '2.5×10⁷ minutes' },
    { value: 3e7, label: '30 Million Minutes', short: '3×10⁷ minutes' },
    { value: 4e7, label: '40 Million Minutes', short: '4×10⁷ minutes' },
    { value: 5e7, label: '50 Million Minutes', short: '5×10⁷ minutes' }
];

const hourMilestones = [
    { value: 1e4, label: '10,000 Hours', short: '10⁴ hours' },
    { value: 2.5e4, label: '25,000 Hours', short: '2.5×10⁴ hours' },
    { value: 5e4, label: '50,000 Hours', short: '5×10⁴ hours' },
    { value: 7.5e4, label: '75,000 Hours', short: '7.5×10⁴ hours' },
    { value: 1e5, label: '100,000 Hours', short: '10⁵ hours' },
    { value: 1.5e5, label: '150,000 Hours', short: '1.5×10⁵ hours' },
    { value: 2e5, label: '200,000 Hours', short: '2×10⁵ hours' },
    { value: 2.5e5, label: '250,000 Hours', short: '2.5×10⁵ hours' },
    { value: 3e5, label: '300,000 Hours', short: '3×10⁵ hours' },
    { value: 4e5, label: '400,000 Hours', short: '4×10⁵ hours' },
    { value: 5e5, label: '500,000 Hours', short: '5×10⁵ hours' },
    { value: 6e5, label: '600,000 Hours', short: '6×10⁵ hours' },
    { value: 7.5e5, label: '750,000 Hours', short: '7.5×10⁵ hours' },
    { value: 1e6, label: '1 Million Hours', short: '10⁶ hours' }
];

const dayMilestones = [
    { value: 1000, label: '1,000 Days', short: '10³ days' },
    { value: 1500, label: '1,500 Days', short: '1.5×10³ days' },
    { value: 2000, label: '2,000 Days', short: '2×10³ days' },
    { value: 2500, label: '2,500 Days', short: '2.5×10³ days' },
    { value: 3000, label: '3,000 Days', short: '3×10³ days' },
    { value: 4000, label: '4,000 Days', short: '4×10³ days' },
    { value: 5000, label: '5,000 Days', short: '5×10³ days' },
    { value: 6000, label: '6,000 Days', short: '6×10³ days' },
    { value: 7000, label: '7,000 Days', short: '7×10³ days' },
    { value: 7500, label: '7,500 Days', short: '7.5×10³ days' },
    { value: 8000, label: '8,000 Days', short: '8×10³ days' },
    { value: 9000, label: '9,000 Days', short: '9×10³ days' },
    { value: 10000, label: '10,000 Days', short: '10⁴ days' },
    { value: 11111, label: '11,111 Days', short: '11,111 days' },
    { value: 12345, label: '12,345 Days', short: '12,345 days' },
    { value: 15000, label: '15,000 Days', short: '1.5×10⁴ days' },
    { value: 16000, label: '16,000 Days', short: '1.6×10⁴ days' },
    { value: 16384, label: '16,384 Days', short: '2¹⁴ days' },
    { value: 17000, label: '17,000 Days', short: '1.7×10⁴ days' },
    { value: 17500, label: '17,500 Days', short: '1.75×10⁴ days' },
    { value: 18000, label: '18,000 Days', short: '1.8×10⁴ days' },
    { value: 20000, label: '20,000 Days', short: '2×10⁴ days' },
    { value: 22222, label: '22,222 Days', short: '22,222 days' },
    { value: 25000, label: '25,000 Days', short: '2.5×10⁴ days' },
    { value: 27500, label: '27,500 Days', short: '2.75×10⁴ days' },
    { value: 30000, label: '30,000 Days', short: '3×10⁴ days' },
    { value: 33333, label: '33,333 Days', short: '33,333 days' }
];

const weekMilestones = [
    { value: 250, label: '250 Weeks', short: '250 weeks' },
    { value: 500, label: '500 Weeks', short: '500 weeks' },
    { value: 750, label: '750 Weeks', short: '750 weeks' },
    { value: 1000, label: '1,000 Weeks', short: '10³ weeks' },
    { value: 1250, label: '1,250 Weeks', short: '1,250 weeks' },
    { value: 1500, label: '1,500 Weeks', short: '1,500 weeks' },
    { value: 1750, label: '1,750 Weeks', short: '1,750 weeks' },
    { value: 2000, label: '2,000 Weeks', short: '2×10³ weeks' },
    { value: 2100, label: '2,100 Weeks', short: '2,100 weeks' },
    { value: 2200, label: '2,200 Weeks', short: '2,200 weeks' },
    { value: 2222, label: '2,222 Weeks', short: 'repdigit weeks' },
    { value: 2300, label: '2,300 Weeks', short: '2,300 weeks' },
    { value: 2400, label: '2,400 Weeks', short: '2,400 weeks' },
    { value: 2500, label: '2,500 Weeks', short: '2,500 weeks' },
    { value: 3000, label: '3,000 Weeks', short: '3×10³ weeks' }
];

const monthMilestones = [
    { value: 100, label: '100 Months', short: '100 months' },
    { value: 200, label: '200 Months', short: '200 months' },
    { value: 250, label: '250 Months', short: '250 months' },
    { value: 300, label: '300 Months', short: '300 months' },
    { value: 400, label: '400 Months', short: '400 months' },
    { value: 444, label: '444 Months', short: 'repdigit months' },
    { value: 500, label: '500 Months', short: '500 months' },
    { value: 555, label: '555 Months', short: 'repdigit months' },
    { value: 600, label: '600 Months', short: '600 months' },
    { value: 666, label: '666 Months', short: 'number of the beast months' },
    { value: 750, label: '750 Months', short: '750 months' },
    { value: 1000, label: '1,000 Months', short: '10³ months' }
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
    { value: 42e6, unit: MS_PER_SECOND, label: '42 Million Seconds', icon: '🌌', desc: 'The Answer to Life, the Universe, and Everything!' },
    { value: 1337, unit: MS_PER_DAY, label: '1,337 Days', icon: '🎮', desc: 'You are now officially 1337 (elite)!' }
];

// Nerdy holidays
const nerdyHolidays = [
    { month: 2, day: 14, name: 'Pi Day', icon: '🥧', desc: 'March 14 (3.14)' },
    { month: 4, day: 4, name: 'May the 4th', icon: '⚔️', desc: 'Star Wars Day' },
    { month: 5, day: 28, name: 'Tau Day', icon: '🌀', desc: 'June 28 (τ ≈ 6.28)' }
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
    TRIANGULAR,
    TRIANGULAR_INDEX,
    PALINDROMES,
    REPUNITS,
    POWERS_OF_2,

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
    toSuperscript
};

// ESM export
export default MilestonesExports;

// Global export for browsers (when loaded via script tag)
if (typeof window !== 'undefined') {
    window.Milestones = MilestonesExports;
}
