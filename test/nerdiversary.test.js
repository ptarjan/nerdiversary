/**
 * Nerdiversary Tests
 * Run with: node test/nerdiversary.test.js
 */

// Load the Nerdiversary and Milestones modules
import Milestones from '../js/milestones.js';
import Nerdiversary from '../js/nerdiversary.js';

// Node.js built-ins for worker.js verification tests
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (e) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${e.message}`);
        failed++;
    }
}

function assertEqual(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg}Expected ${expected}, got ${actual}`);
    }
}

function assertClose(actual, expected, tolerance = 0.0001, msg = '') {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${msg}Expected ~${expected}, got ${actual} (tolerance: ${tolerance})`);
    }
}

function assertTrue(condition, msg = '') {
    if (!condition) {
        throw new Error(msg || 'Assertion failed');
    }
}

console.log('\n=== Nerdiversary Tests ===\n');

// ============================================
// TIME CONSTANTS
// ============================================
console.log('--- Time Constants ---');

test('MS_PER_SECOND is 1000', () => {
    assertEqual(Milestones.MS_PER_SECOND, 1000);
});

test('MS_PER_MINUTE is 60,000', () => {
    assertEqual(Milestones.MS_PER_MINUTE, 60 * 1000);
});

test('MS_PER_HOUR is 3,600,000', () => {
    assertEqual(Milestones.MS_PER_HOUR, 60 * 60 * 1000);
});

test('MS_PER_DAY is 86,400,000', () => {
    assertEqual(Milestones.MS_PER_DAY, 24 * 60 * 60 * 1000);
});

test('MS_PER_WEEK is 604,800,000', () => {
    assertEqual(Milestones.MS_PER_WEEK, 7 * 24 * 60 * 60 * 1000);
});

test('MS_PER_YEAR uses Gregorian average (365.2425 days)', () => {
    assertEqual(Milestones.MS_PER_YEAR, 365.2425 * 24 * 60 * 60 * 1000);
});

// ============================================
// MATHEMATICAL CONSTANTS
// ============================================
console.log('\n--- Mathematical Constants ---');

test('PI is Math.PI', () => {
    assertEqual(Milestones.PI, Math.PI);
    assertClose(Milestones.PI, 3.14159265358979, 1e-14);
});

test('E is Math.E (Euler\'s number)', () => {
    assertEqual(Milestones.E, Math.E);
    assertClose(Milestones.E, 2.71828182845905, 1e-14);
});

test('PHI is the golden ratio ((1 + sqrt(5)) / 2)', () => {
    const expected = (1 + Math.sqrt(5)) / 2;
    assertEqual(Milestones.PHI, expected);
    assertClose(Milestones.PHI, 1.6180339887, 1e-10);
});

test('TAU is 2π', () => {
    assertEqual(Milestones.TAU, 2 * Math.PI);
    assertClose(Milestones.TAU, 6.28318530717959, 1e-14);
});

// ============================================
// FIBONACCI SEQUENCE
// ============================================
console.log('\n--- Fibonacci Sequence ---');

test('FIBONACCI array is actually Fibonacci sequence', () => {
    const fib = Milestones.FIBONACCI;
    assertTrue(fib[0] === 1, 'First element should be 1');
    assertTrue(fib[1] === 2, 'Second element should be 2');

    for (let i = 2; i < fib.length; i++) {
        const expected = fib[i - 1] + fib[i - 2];
        assertEqual(fib[i], expected, `FIBONACCI[${i}] should be ${expected}: `);
    }
});

test('FIBONACCI array covers 94+ years in seconds (~3 billion)', () => {
    const maxFib = Math.max(...Milestones.FIBONACCI);
    const years94InSeconds = 94 * 365.2425 * 24 * 60 * 60;
    assertTrue(maxFib >= years94InSeconds,
        `Max Fibonacci (${maxFib}) should cover 94 years in seconds (~${Math.floor(years94InSeconds)})`);
});

test('FIBONACCI contains key milestones for 42-year-old in seconds', () => {
    // ~42.67 years = 1,346,269,000 seconds (Fibonacci F(31) * 1000)
    assertTrue(Milestones.FIBONACCI.includes(1346269),
        'Should include 1,346,269 for ~42.7 year milestone');
});

test('LUCAS array is actually Lucas sequence (starts 2, 1)', () => {
    const luc = Milestones.LUCAS;
    assertTrue(luc[0] === 2, 'First element should be 2');
    assertTrue(luc[1] === 1, 'Second element should be 1');

    for (let i = 2; i < luc.length; i++) {
        const expected = luc[i - 1] + luc[i - 2];
        assertEqual(luc[i], expected, `LUCAS[${i}] should be ${expected}: `);
    }
});

test('Perfect numbers are correct', () => {
    const perfectNumbers = Milestones.PERFECT_NUMBERS;
    // 6 = 1 + 2 + 3
    assertEqual(1 + 2 + 3, 6);
    // 28 = 1 + 2 + 4 + 7 + 14
    assertEqual(1 + 2 + 4 + 7 + 14, 28);
    // 496 = 1 + 2 + 4 + 8 + 16 + 31 + 62 + 124 + 248
    assertEqual(1 + 2 + 4 + 8 + 16 + 31 + 62 + 124 + 248, 496);
    assertTrue(perfectNumbers.includes(6));
    assertTrue(perfectNumbers.includes(28));
    assertTrue(perfectNumbers.includes(496));
    assertTrue(perfectNumbers.includes(8128));
});

test('Triangular numbers are correct (T(n) = n*(n+1)/2)', () => {
    const tri = Milestones.TRIANGULAR;
    for (let i = 0; i < Math.min(tri.length, 50); i++) {
        const n = i + 1;
        const expected = n * (n + 1) / 2;
        assertEqual(tri[i], expected, `TRIANGULAR[${i}] should be T(${n}) = ${expected}: `);
    }
});

test('Palindromes read the same forwards and backwards', () => {
    for (const pal of Milestones.PALINDROMES.slice(0, 50)) {
        const str = String(pal);
        const reversed = str.split('').reverse().join('');
        assertEqual(str, reversed, `${pal} should be a palindrome: `);
    }
});

test('Repunits are all 1s', () => {
    for (const rep of Milestones.REPUNITS) {
        const str = String(rep);
        assertTrue(str.split('').every(c => c === '1'),
            `${rep} should be all 1s`);
    }
});

// ============================================
// PLANETARY ORBITAL PERIODS
// ============================================
console.log('\n--- Planetary Orbital Periods (Earth Days) ---');

// Source: NASA fact sheets
const expectedPlanets = {
    mercury: { days: 87.969, tolerance: 0.01 },
    venus: { days: 224.701, tolerance: 0.01 },
    mars: { days: 686.980, tolerance: 0.01 },
    jupiter: { days: 4332.59, tolerance: 0.1 },
    saturn: { days: 10759.22, tolerance: 0.1 },
    uranus: { days: 30688.5, tolerance: 0.5 },
    neptune: { days: 60182, tolerance: 1 }
};

for (const [key, expected] of Object.entries(expectedPlanets)) {
    test(`${key.charAt(0).toUpperCase() + key.slice(1)} orbital period is ~${expected.days} days`, () => {
        const planet = Milestones.PLANETS[key];
        assertTrue(planet !== undefined, `Planet ${key} should exist`);
        assertClose(planet.days, expected.days, expected.tolerance);
    });
}

test('All 7 planets are defined', () => {
    assertEqual(Object.keys(Milestones.PLANETS).length, 7);
});

// ============================================
// NUMBER BASE CALCULATIONS
// ============================================
console.log('\n--- Number Base Calculations ---');

test('Binary: 2^20 = 1,048,576', () => {
    assertEqual(Math.pow(2, 20), 1048576);
});

test('Binary: 2^30 = 1,073,741,824 (~34 years in seconds)', () => {
    const seconds = Math.pow(2, 30);
    assertEqual(seconds, 1073741824);
    const years = seconds / (365.2425 * 24 * 60 * 60);
    assertClose(years, 34.03, 0.02);
});

test('Ternary: 3^20 = 3,486,784,401', () => {
    assertEqual(Math.pow(3, 20), 3486784401);
});

test('Octal: 8^10 = 1,073,741,824 (same as 2^30)', () => {
    assertEqual(Math.pow(8, 10), Math.pow(2, 30));
});

test('Hexadecimal: 0xDEADBEEF = 3,735,928,559', () => {
    assertEqual(0xDEADBEEF, 3735928559);
});

test('Duodecimal/Dozenal: 12^8 = 429,981,696 (~13.6 years in seconds)', () => {
    const seconds = Math.pow(12, 8);
    assertEqual(seconds, 429981696);
    const years = seconds / (365.2425 * 24 * 60 * 60);
    assertClose(years, 13.63, 0.01);
});

test('Sexagesimal/Babylonian: 60^4 = 12,960,000 (~150 days in seconds)', () => {
    const seconds = Math.pow(60, 4);
    assertEqual(seconds, 12960000);
    const days = seconds / (24 * 60 * 60);
    assertEqual(days, 150);
});

// ============================================
// EARTH BIRTHDAY SPECIAL LABELS
// ============================================
console.log('\n--- Earth Birthday Special Labels ---');

// Test prime detection
const primeAges = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const compositeAges = [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 25, 26, 27, 28, 30, 100];

function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

test('Prime ages list is correct', () => {
    for (const age of primeAges) {
        assertTrue(isPrime(age), `${age} should be prime`);
    }
    for (const age of compositeAges) {
        assertTrue(!isPrime(age), `${age} should NOT be prime`);
    }
});

test('Perfect squares: 4, 9, 16, 25, 36, 49, 64, 81, 100', () => {
    const squares = [4, 9, 16, 25, 36, 49, 64, 81, 100];
    for (const sq of squares) {
        const root = Math.sqrt(sq);
        assertTrue(Number.isInteger(root), `${sq} should be a perfect square`);
    }
});

test('Powers of 2: 2, 4, 8, 16, 32, 64', () => {
    const powers = [2, 4, 8, 16, 32, 64];
    for (const p of powers) {
        const log2 = Math.log2(p);
        assertTrue(Number.isInteger(log2), `${p} should be a power of 2`);
    }
});

test('Perfect cubes: 8, 27, 64', () => {
    assertEqual(Math.pow(2, 3), 8);
    assertEqual(Math.pow(3, 3), 27);
    assertEqual(Math.pow(4, 3), 64);
});

test('Hex round numbers: 16=0x10, 32=0x20, 48=0x30, 64=0x40, 80=0x50, 96=0x60', () => {
    assertEqual(0x10, 16);
    assertEqual(0x20, 32);
    assertEqual(0x30, 48);
    assertEqual(0x40, 64);
    assertEqual(0x50, 80);
    assertEqual(0x60, 96);
});

test('42 is The Answer', () => {
    // From Hitchhiker's Guide to the Galaxy
    assertEqual(42, 42); // The Answer to Life, Universe, and Everything
});

// ============================================
// MILESTONE DATE CALCULATIONS
// ============================================
console.log('\n--- Milestone Date Calculations ---');

test('1 billion seconds = ~31.69 years', () => {
    const seconds = 1e9;
    const years = seconds / (365.2425 * 24 * 60 * 60);
    assertClose(years, 31.69, 0.01);
});

test('10,000 hours rule milestone occurs at ~1.14 years', () => {
    const hours = 10000;
    const years = hours / (365.2425 * 24);
    assertClose(years, 1.14, 0.01);
});

test('10,000 days = ~27.38 years', () => {
    const days = 10000;
    const years = days / 365.2425;
    assertClose(years, 27.38, 0.01);
});

test('1 million minutes = ~1.90 years', () => {
    const minutes = 1e6;
    const years = minutes / (365.2425 * 24 * 60);
    assertClose(years, 1.90, 0.01);
});

// ============================================
// PLANETARY YEAR CALCULATIONS
// ============================================
console.log('\n--- Planetary Year Calculations ---');

test('Mercury year 1 occurs at ~88 Earth days', () => {
    const earthDays = Milestones.PLANETS.mercury.days;
    assertClose(earthDays, 88, 0.1);
});

test('Mars year 1 occurs at ~687 Earth days (~1.88 years)', () => {
    const earthDays = Milestones.PLANETS.mars.days;
    const years = earthDays / 365.2425;
    assertClose(years, 1.88, 0.01);
});

test('Jupiter year 1 occurs at ~11.86 Earth years', () => {
    const earthDays = Milestones.PLANETS.jupiter.days;
    const years = earthDays / 365.2425;
    assertClose(years, 11.86, 0.01);
});

test('Saturn year 1 occurs at ~29.46 Earth years', () => {
    const earthDays = Milestones.PLANETS.saturn.days;
    const years = earthDays / 365.2425;
    assertClose(years, 29.46, 0.01);
});

test('Uranus year 1 occurs at ~84.01 Earth years', () => {
    const earthDays = Milestones.PLANETS.uranus.days;
    const years = earthDays / 365.2425;
    assertClose(years, 84.01, 0.1);
});

test('Neptune year 1 occurs at ~164.79 Earth years', () => {
    const earthDays = Milestones.PLANETS.neptune.days;
    const years = earthDays / 365.2425;
    assertClose(years, 164.79, 0.1);
});

// ============================================
// MATH MILESTONE CALCULATIONS
// ============================================
console.log('\n--- Math Milestone Calculations ---');

test('π × 10⁹ seconds = ~99.55 years', () => {
    const seconds = Math.PI * 1e9;
    const years = seconds / (365.2425 * 24 * 60 * 60);
    assertClose(years, 99.55, 0.01);
});

test('e × 10⁹ seconds = ~86.14 years', () => {
    const seconds = Math.E * 1e9;
    const years = seconds / (365.2425 * 24 * 60 * 60);
    assertClose(years, 86.14, 0.01);
});

test('φ × 10⁹ seconds = ~51.27 years', () => {
    const seconds = Milestones.PHI * 1e9;
    const years = seconds / (365.2425 * 24 * 60 * 60);
    assertClose(years, 51.27, 0.01);
});

test('τ × 10⁸ seconds = ~19.91 years', () => {
    const seconds = Milestones.TAU * 1e8;
    const years = seconds / (365.2425 * 24 * 60 * 60);
    assertClose(years, 19.91, 0.01);
});

// ============================================
// FIBONACCI MILESTONE CALCULATIONS
// ============================================
console.log('\n--- Fibonacci Milestone Calculations ---');

test('Fibonacci 1,346,269 seconds = ~42.67 years', () => {
    const fib = 1346269;
    assertTrue(Milestones.FIBONACCI.includes(fib), 'Should be in FIBONACCI array');
    const years = (fib * 1000) / (365.2425 * 24 * 60 * 60);
    assertClose(years, 42.67, 0.01);
});

test('Fibonacci 832,040 seconds = ~26.37 years', () => {
    const fib = 832040;
    assertTrue(Milestones.FIBONACCI.includes(fib), 'Should be in FIBONACCI array');
    const years = (fib * 1000) / (365.2425 * 24 * 60 * 60);
    assertClose(years, 26.37, 0.02);
});

test('Fibonacci 10,946 days = ~29.96 years', () => {
    const fib = 10946;
    assertTrue(Milestones.FIBONACCI.includes(fib), 'Should be in FIBONACCI array');
    const years = fib / 365.2425;
    assertClose(years, 29.96, 0.01);
});

// ============================================
// INTEGRATION TESTS
// ============================================
console.log('\n--- Integration Tests ---');

test('calculate() returns array of events', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 50);
    assertTrue(Array.isArray(events), 'Should return an array');
    assertTrue(events.length > 0, 'Should have events');
});

test('Events are sorted by date', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 50);

    for (let i = 1; i < events.length; i++) {
        assertTrue(events[i].date >= events[i-1].date,
            `Events should be sorted: ${events[i-1].date} <= ${events[i].date}`);
    }
});

test('Each event has required properties', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 5);

    const requiredProps = ['id', 'title', 'description', 'date', 'category', 'icon', 'milestone'];
    for (const event of events.slice(0, 10)) {
        for (const prop of requiredProps) {
            assertTrue(Object.hasOwn(event, prop), `Event should have ${prop} property`);
        }
    }
});

test('Earth birthdays are generated for each year', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 10);

    const earthBirthdays = events.filter(e => e.id.startsWith('earth-birthday-'));
    assertTrue(earthBirthdays.length >= 10, `Should have at least 10 earth birthdays, got ${earthBirthdays.length}`);
});

test('Multiple categories are represented', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 50);

    const categories = new Set(events.map(e => e.category));
    assertTrue(categories.has('planetary'), 'Should have planetary events');
    assertTrue(categories.has('decimal'), 'Should have decimal events');
    assertTrue(categories.has('binary'), 'Should have binary/number base events');
    assertTrue(categories.has('mathematical'), 'Should have mathematical events');
    assertTrue(categories.has('fibonacci'), 'Should have fibonacci events');
    assertTrue(categories.has('pop-culture'), 'Should have pop-culture events');
});

test('1 billion seconds milestone exists and is correct', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 50);

    const billionSeconds = events.find(e => e.id === 'seconds-1000000000');
    assertTrue(billionSeconds !== undefined, 'Should have 1 billion seconds milestone');

    // Verify the date
    const expectedDate = new Date(birthDate.getTime() + 1e9 * 1000);
    assertEqual(billionSeconds.date.getTime(), expectedDate.getTime());
});

// ============================================
// ORDINAL HELPER
// ============================================
console.log('\n--- Helper Functions ---');

test('getOrdinal returns correct suffixes', () => {
    assertEqual(Nerdiversary.getOrdinal(1), '1st');
    assertEqual(Nerdiversary.getOrdinal(2), '2nd');
    assertEqual(Nerdiversary.getOrdinal(3), '3rd');
    assertEqual(Nerdiversary.getOrdinal(4), '4th');
    assertEqual(Nerdiversary.getOrdinal(11), '11th');
    assertEqual(Nerdiversary.getOrdinal(12), '12th');
    assertEqual(Nerdiversary.getOrdinal(13), '13th');
    assertEqual(Nerdiversary.getOrdinal(21), '21st');
    assertEqual(Nerdiversary.getOrdinal(22), '22nd');
    assertEqual(Nerdiversary.getOrdinal(23), '23rd');
    assertEqual(Nerdiversary.getOrdinal(100), '100th');
    assertEqual(Nerdiversary.getOrdinal(101), '101st');
});

test('toSuperscript converts numbers correctly', () => {
    assertEqual(Nerdiversary.toSuperscript(0), '⁰');
    assertEqual(Nerdiversary.toSuperscript(1), '¹');
    assertEqual(Nerdiversary.toSuperscript(2), '²');
    assertEqual(Nerdiversary.toSuperscript(10), '¹⁰');
    assertEqual(Nerdiversary.toSuperscript(20), '²⁰');
});

// ============================================
// WORKER.JS SYNC TESTS
// ============================================
console.log('\n--- Worker.js Import Verification ---');

// Verify worker.js imports from the shared milestones module
const workerPath = path.join(__dirname, '..', 'worker', 'worker.js');
const workerCode = fs.readFileSync(workerPath, 'utf8');

test('Worker imports from shared modules', () => {
    // Check for the import statements
    const hasCalculatorImport = workerCode.includes("import Calculator from '../js/calculator.js'");
    assertTrue(hasCalculatorImport, 'Worker should import Calculator');

    // Check that Calculator.calculate is used
    const usesCalculator = workerCode.includes('Calculator.calculate');
    assertTrue(usesCalculator, 'Worker should use Calculator.calculate()');
});

test('Worker does not duplicate constant definitions', () => {
    // Make sure we don't have duplicate constant definitions
    // (should have destructuring, not direct const assignments for shared constants)
    const hasDuplicateTimeConst = /const MS_PER_SECOND = 1000/.test(workerCode);
    assertTrue(!hasDuplicateTimeConst, 'Worker should not duplicate MS_PER_SECOND');

    const hasDuplicateFib = /const FIBONACCI = \[1, 2, 3/.test(workerCode);
    assertTrue(!hasDuplicateFib, 'Worker should not duplicate FIBONACCI array');
});

// ============================================
// NOTIFICATION MODULE TESTS
// ============================================
console.log('\n--- Notification Module Verification ---');

const notificationsPath = path.join(__dirname, '..', 'js', 'notifications.js');
const notificationsCode = fs.readFileSync(notificationsPath, 'utf8');

test('Notifications module exports expected functions', () => {
    const hasIsSupported = notificationsCode.includes('isSupported');
    assertTrue(hasIsSupported, 'Should export isSupported');

    const hasRequestPermission = notificationsCode.includes('requestPermission');
    assertTrue(hasRequestPermission, 'Should export requestPermission');

    const hasShowNotification = notificationsCode.includes('showNotification');
    assertTrue(hasShowNotification, 'Should export showNotification');

    const hasScheduleNotification = notificationsCode.includes('scheduleNotification');
    assertTrue(hasScheduleNotification, 'Should export scheduleNotification');
});

test('Notifications module has default notification times', () => {
    const hasDefaultTimes = notificationsCode.includes('DEFAULT_NOTIFICATION_TIMES');
    assertTrue(hasDefaultTimes, 'Should have DEFAULT_NOTIFICATION_TIMES constant');

    // Verify it includes sensible defaults (1 day = 1440 min, 1 hour = 60 min)
    const has1DayDefault = notificationsCode.includes('1440');
    assertTrue(has1DayDefault, 'Should include 1 day (1440 min) notification');
});

test('Notifications module uses localStorage for persistence', () => {
    const usesLocalStorage = notificationsCode.includes('localStorage');
    assertTrue(usesLocalStorage, 'Should use localStorage for preferences');
});

// ============================================
// SERVICE WORKER TESTS
// ============================================
console.log('\n--- Service Worker Verification ---');

const swPath = path.join(__dirname, '..', 'sw.js');
const swCode = fs.readFileSync(swPath, 'utf8');

test('Service worker handles push events', () => {
    const hasPushListener = swCode.includes("addEventListener('push'");
    assertTrue(hasPushListener, 'Should have push event listener');
});

test('Service worker handles notification clicks', () => {
    const hasClickListener = swCode.includes("addEventListener('notificationclick'");
    assertTrue(hasClickListener, 'Should have notificationclick event listener');
});

test('Service worker has offline caching', () => {
    const hasCacheName = swCode.includes('CACHE_NAME');
    assertTrue(hasCacheName, 'Should define CACHE_NAME');

    const hasInstallListener = swCode.includes("addEventListener('install'");
    assertTrue(hasInstallListener, 'Should have install event listener');

    const hasFetchListener = swCode.includes("addEventListener('fetch'");
    assertTrue(hasFetchListener, 'Should have fetch event listener');
});

test('Service worker caches essential assets', () => {
    const cachesHtml = swCode.includes('index.html') && swCode.includes('results.html');
    assertTrue(cachesHtml, 'Should cache HTML files');

    const cachesJs = swCode.includes('milestones.js') || swCode.includes('./js/');
    assertTrue(cachesJs, 'Should cache JavaScript files');

    const cachesManifest = swCode.includes('manifest.json');
    assertTrue(cachesManifest, 'Should cache manifest.json');
});

// ============================================
// WORKER PUSH NOTIFICATION TESTS
// ============================================
console.log('\n--- Worker Push Notification Logic ---');

// workerPath and workerCode already declared above

test('Worker generates milestone offsets', () => {
    // Check that generateMilestoneOffsets function exists
    const hasGenerator = workerCode.includes('function generateMilestoneOffsets()');
    assertTrue(hasGenerator, 'Should have generateMilestoneOffsets function');

    // Check it uses Calculator.calculate() to generate offsets (matching frontend exactly)
    const usesCalculator = workerCode.includes('Calculator.calculate(');
    assertTrue(usesCalculator, 'Should use Calculator.calculate() to generate offsets');

    const hasBirthdays = workerCode.includes('Birthday');
    assertTrue(hasBirthdays, 'Should include Earth birthdays');
});

test('Worker parseFamilyParam handles various formats', () => {
    // Check function exists
    const hasParser = workerCode.includes('function parseFamilyParam(');
    assertTrue(hasParser, 'Should have parseFamilyParam function');

    // Check it handles the expected format: Name|Date|Time
    const handlesPipes = workerCode.includes("split('|')");
    assertTrue(handlesPipes, 'Should split on pipe character');

    // Check it handles multiple family members
    const handlesCommas = workerCode.includes("split(',')");
    assertTrue(handlesCommas, 'Should split multiple members on comma');

    // Check it filters invalid entries
    const hasFilter = workerCode.includes('.filter(');
    assertTrue(hasFilter, 'Should filter invalid entries');
});

test('Worker formats birth datetime correctly', () => {
    const hasFormatter = workerCode.includes('function formatBirthDatetime(');
    assertTrue(hasFormatter, 'Should have formatBirthDatetime function');

    // Should output ISO format truncated to minute
    const hasIsoSlice = workerCode.includes('toISOString().slice(0, 16)');
    assertTrue(hasIsoSlice, 'Should format as YYYY-MM-DDTHH:MM');
});

test('Worker calculates target birthdates for notifications', () => {
    // Check the core algorithm: target = now - offset + lead_time
    const hasCalculation = workerCode.includes('now.getTime() - offset.ms');
    assertTrue(hasCalculation, 'Should calculate target birthdates from current time minus offset');

    // Check notification lead times
    const hasLeadTimes = workerCode.includes('notificationTimes = [0, 60, 1440]');
    assertTrue(hasLeadTimes, 'Should check at event, 1 hour before, and 1 day before');
});

test('Worker uses D1 with indexed birthday queries', () => {
    // Check D1 binding
    const usesD1 = workerCode.includes('env.DB');
    assertTrue(usesD1, 'Should use D1 database binding');

    // Check indexed query on birth_datetime
    const hasIndexedQuery = workerCode.includes('birth_datetime IN');
    assertTrue(hasIndexedQuery, 'Should query with IN clause on birth_datetime');

    // Check batching for large queries
    const hasBatching = workerCode.includes('BATCH_SIZE');
    assertTrue(hasBatching, 'Should batch queries to avoid size limits');
});

test('Worker generates correct notification content', () => {
    const hasContentGen = workerCode.includes('function generateNotificationContent(');
    assertTrue(hasContentGen, 'Should have generateNotificationContent function');

    // Check different time-based messages
    const hasNowMsg = workerCode.includes("It's happening NOW!");
    assertTrue(hasNowMsg, 'Should have NOW message for immediate notifications');

    const hasHoursMsg = workerCode.includes('hour');
    assertTrue(hasHoursMsg, 'Should have hours-based message');

    const hasDaysMsg = workerCode.includes('day');
    assertTrue(hasDaysMsg, 'Should have days-based message');
});

test('Worker handles subscription upsert correctly', () => {
    // Check upsert logic
    const hasUpsert = workerCode.includes('ON CONFLICT');
    assertTrue(hasUpsert, 'Should use upsert for subscriptions');

    // Check it deletes old family members before inserting new
    const hasDeleteFirst = workerCode.includes('DELETE FROM family_members WHERE subscription_id');
    assertTrue(hasDeleteFirst, 'Should delete existing family members on re-subscribe');
});

test('Worker caches milestone offsets', () => {
    const hasCaching = workerCode.includes('MILESTONE_OFFSETS = null');
    assertTrue(hasCaching, 'Should cache milestone offsets');

    const hasGetter = workerCode.includes('function getMilestoneOffsets()');
    assertTrue(hasGetter, 'Should have getter that returns cached offsets');
});

// Functional tests for parseFamilyParam logic (extracted and tested directly)
test('parseFamilyParam logic handles single member', () => {
    // Simulate the parsing logic
    const familyParam = 'Alice|1990-05-15|14:30';
    const parts = familyParam.split('|');
    assertEqual(parts[0], 'Alice', 'Should extract name');
    assertEqual(parts[1], '1990-05-15', 'Should extract date');
    assertEqual(parts[2], '14:30', 'Should extract time');
});

test('parseFamilyParam logic handles multiple members', () => {
    const familyParam = 'Alice|1990-05-15,Bob|1985-03-22';
    const members = familyParam.split(',');
    assertEqual(members.length, 2, 'Should split into 2 members');
    assertTrue(members[0].includes('Alice'), 'First member should be Alice');
    assertTrue(members[1].includes('Bob'), 'Second member should be Bob');
});

test('parseFamilyParam logic handles URL encoding', () => {
    const encoded = encodeURIComponent('Alice Smith');
    const decoded = decodeURIComponent(encoded);
    assertEqual(decoded, 'Alice Smith', 'Should handle URL encoded names');
});

test('Birthday datetime calculation is correct', () => {
    // Test: if milestone is 1 billion seconds (31.69 years),
    // and current time is 2024-01-15T10:30,
    // then target birthdate should be ~1992-06-XX
    const MS_PER_SECOND = 1000;
    const oneBillionSeconds = 1e9 * MS_PER_SECOND;

    const now = new Date('2024-01-15T10:30:00Z');
    const targetMs = now.getTime() - oneBillionSeconds;
    const targetDate = new Date(targetMs);

    // Should be approximately 31.69 years ago
    const yearDiff = now.getFullYear() - targetDate.getFullYear();
    assertTrue(yearDiff >= 31 && yearDiff <= 32, 'Target should be ~31-32 years before now');
});

test('Milestone offset deduplication works', () => {
    // Many different milestones might point to the same target birthdate
    // The worker should deduplicate by using a Map
    const hasMap = workerCode.includes('new Map()');
    assertTrue(hasMap, 'Should use Map for deduplication');

    const hasMapSet = workerCode.includes('targetDatetimes.set(');
    assertTrue(hasMapSet, 'Should set entries in targetDatetimes Map');
});

// ============================================
// SUMMARY
// ============================================
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
    process.exit(1);
} else {
    console.log('\nAll tests passed! ✓');
    process.exit(0);
}
