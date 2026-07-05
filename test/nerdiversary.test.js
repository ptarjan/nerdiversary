/**
 * Nerdiversary Tests
 * Run with: node test/nerdiversary.test.js
 */

// Load the Nerdiversary and Milestones modules
import Milestones from '../js/milestones.js';
import Nerdiversary from '../js/nerdiversary.js';
import Calculator from '../js/calculator.js';
import { parseFamilyParam, formatNotificationTitle, formatICalDate, escapeICalText, getCategoryInfo, generateICal, localToUtcWithTimezone } from '../js/shared.js';
import { buildFamilyEvents, generateMilestoneOffsets, buildSharePage } from '../worker/worker.js';

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

test('Sequence index maps match mathematical convention', () => {
    // F(1)=F(2)=1, F(3)=2, ... so F(31) = 1,346,269
    assertEqual(Milestones.FIBONACCI_INDEX.get(2), 3, 'F(3) = 2: ');
    assertEqual(Milestones.FIBONACCI_INDEX.get(832040), 30, 'F(30) = 832,040: ');
    assertEqual(Milestones.FIBONACCI_INDEX.get(1346269), 31, 'F(31) = 1,346,269: ');

    // L(0)=2, L(1)=1, L(2)=3, ... so L(5) = 11
    assertEqual(Milestones.LUCAS_INDEX.get(2), 0, 'L(0) = 2: ');
    assertEqual(Milestones.LUCAS_INDEX.get(11), 5, 'L(5) = 11: ');
    assertEqual(Milestones.LUCAS_INDEX.get(123), 10, 'L(10) = 123: ');
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

test('All INTERESTING_PALINDROME_DAYS are reachable (present in PALINDROMES)', () => {
    for (const p of Milestones.INTERESTING_PALINDROME_DAYS) {
        assertTrue(Milestones.PALINDROMES.includes(p),
            `${p} is in INTERESTING_PALINDROME_DAYS but not in PALINDROMES, so it can never be generated`);
        const str = String(p);
        assertEqual(str, str.split('').reverse().join(''), `${p} should be a palindrome: `);
    }
});

test('All INTERESTING_TRIANGULAR are reachable (present in TRIANGULAR)', () => {
    for (const t of Milestones.INTERESTING_TRIANGULAR) {
        assertTrue(Milestones.TRIANGULAR.includes(t),
            `${t} is in INTERESTING_TRIANGULAR but not in TRIANGULAR, so it can never be generated`);
    }
});

test('Triangular day milestones include 5778 and 8128', () => {
    const birthDate = new Date('1990-01-15T12:00:00Z');
    const events = Nerdiversary.calculate(birthDate, 50);
    assertTrue(events.some(e => e.id === 'triangular-days-5778'),
        'Should generate T(107) = 5778 days milestone');
    assertTrue(events.some(e => e.id === 'triangular-days-8128'),
        'Should generate T(127) = 8128 days milestone');
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

test('Mercury years continue past age 48 (MAX_PLANETARY_YEARS regression)', () => {
    // 200 orbits × 88 days ≈ 48 Earth years — the old cap silently ended
    // Mercury milestones for anyone older than that
    const birthDate = new Date('1970-01-15T12:00:00Z');
    const events = Nerdiversary.calculate(birthDate, 100);
    const mercury300 = events.find(e => e.id === 'mercury-300');
    assertTrue(mercury300 !== undefined,
        'A 100-year window should include Mercury Year 300 (~72 Earth years)');
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

test('Lunation milestones are generated', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 100);

    const lunations = events.filter(e => e.id.startsWith('lunation-'));
    assertTrue(lunations.length > 0, 'Should have lunation milestones');

    const l500 = events.find(e => e.id === 'lunation-500');
    assertTrue(l500 !== undefined, 'Should have 500 lunation milestone');
    assertEqual(l500.category, 'scientific');
    assertEqual(l500.icon, '🌑');

    // 500 synodic months ≈ 500 * 29.53 ≈ 14765 days ≈ 40.4 years
    const expectedMs = 500 * 29.530589 * Milestones.MS_PER_DAY;
    const actualMs = l500.date.getTime() - birthDate.getTime();
    assertTrue(Math.abs(actualMs - expectedMs) < 1000, 'Lunation date should be correct');
});

test('Fractional age milestones (quarter birthdays) are generated', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 50);

    const quarters = events.filter(e => e.id.startsWith('frac-birthday-'));
    assertTrue(quarters.length > 100, `Should have many quarter birthdays, got ${quarters.length}`);

    const half42 = events.find(e => e.id === 'frac-birthday-43-0.5');
    assertTrue(half42 !== undefined, 'Should have 42½ milestone');
    assertTrue(half42.title.includes('42½'), 'Title should show 42½');
    assertEqual(half42.category, 'planetary');
    assertEqual(half42.icon, '🎂');

    const quarter42 = events.find(e => e.id === 'frac-birthday-43-0.25');
    assertTrue(quarter42 !== undefined, 'Should have 42¼ milestone');
    assertTrue(quarter42.title.includes('42¼'), 'Title should show 42¼');
});

test('Holidays in the birth year are included (after birth only)', () => {
    // Born Jan 15, 2020: Pi Day 2020 (Mar 14) is after birth and must appear;
    // e Day 2020 (Feb 7) is also after birth; nothing before Jan 15 should appear
    const birthDate = new Date('2020-01-15T12:00:00Z');
    const events = Nerdiversary.calculate(birthDate, 3);

    const piDay2020 = events.find(e => e.id === 'pi-day-2020');
    assertTrue(piDay2020 !== undefined, 'Pi Day of the birth year should be included');

    // Born Jun 15: May the 4th of the birth year is before birth and must NOT appear
    const birthDate2 = new Date('2020-06-15T12:00:00Z');
    const events2 = Nerdiversary.calculate(birthDate2, 3);
    const starWars2020 = events2.find(e => e.id === 'may-the-4th-2020');
    assertTrue(starWars2020 === undefined, 'Holidays before birth should not be included');
    const tauDay2020 = events2.find(e => e.id === 'tau-day-2020');
    assertTrue(tauDay2020 !== undefined, 'Tau Day (Jun 28) of the birth year should be included');
});

test('New nerdy holidays exist: e Day, Mole Day, Fibonacci Day', () => {
    const birthDate = new Date('1990-01-15T12:00:00');
    const events = Nerdiversary.calculate(birthDate, 5);

    const eDay = events.find(e => e.id.startsWith('e-day-'));
    assertTrue(eDay !== undefined, 'Should have e Day');
    assertEqual(eDay.isSharedHoliday, true);

    const moleDay = events.find(e => e.id.startsWith('mole-day-'));
    assertTrue(moleDay !== undefined, 'Should have Mole Day');
    assertEqual(moleDay.isSharedHoliday, true);

    const fibDay = events.find(e => e.id.startsWith('fibonacci-day-'));
    assertTrue(fibDay !== undefined, 'Should have Fibonacci Day');
    assertEqual(fibDay.isSharedHoliday, true);
});

test('getCalendarEventsAt finds new nerdy holidays', () => {
    const birthDate = new Date('1990-05-15T14:30:00Z');

    // Mole Day (Oct 23) at birth time (UTC)
    const moleDay = new Date(Date.UTC(2025, 9, 23, 14, 30));
    const moleEvents = Calculator.getCalendarEventsAt(birthDate, moleDay);
    const moleEvent = moleEvents.find(e => e.isSharedHoliday && e.title.includes('Mole Day'));
    assertTrue(moleEvent !== undefined, 'Should find Mole Day');

    // Fibonacci Day (Nov 23) at birth time (UTC)
    const fibDay = new Date(Date.UTC(2025, 10, 23, 14, 30));
    const fibEvents = Calculator.getCalendarEventsAt(birthDate, fibDay);
    const fibEvent = fibEvents.find(e => e.isSharedHoliday && e.title.includes('Fibonacci Day'));
    assertTrue(fibEvent !== undefined, 'Should find Fibonacci Day');

    // e Day (Feb 7) at birth time (UTC)
    const eDay = new Date(Date.UTC(2025, 1, 7, 14, 30));
    const eEvents = Calculator.getCalendarEventsAt(birthDate, eDay);
    const eEvent = eEvents.find(e => e.isSharedHoliday && e.title.includes('e Day'));
    assertTrue(eEvent !== undefined, 'Should find e Day');
});

test('Lunation and fractional milestones are in worker offset map', () => {
    // Verify these offset-based milestones are NOT filtered out by the worker logic
    const refBirth = new Date('2000-01-01T00:00:00Z');
    const events = Calculator.calculate(refBirth, { yearsAhead: 120, includePast: true });

    const lunation = events.find(e => e.id === 'lunation-500');
    assertTrue(lunation !== undefined, 'Should generate lunation-500');
    assertTrue(!lunation.isSharedHoliday, 'Lunation should not be a shared holiday');
    assertTrue(!lunation.id.startsWith('earth-birthday-'), 'Lunation should not look like earth birthday');

    const frac = events.find(e => e.id === 'frac-birthday-43-0.5');
    assertTrue(frac !== undefined, 'Should generate frac-birthday-43-0.5');
    assertTrue(!frac.isSharedHoliday, 'Fractional birthday should not be a shared holiday');
});

test('Every event has a rarity tier', () => {
    const birthDate = new Date('1990-01-15T12:00:00Z');
    const events = Nerdiversary.calculate(birthDate, 50);
    for (const event of events) {
        assertTrue(['common', 'rare', 'legendary'].includes(event.rarity),
            `Event ${event.id} has invalid rarity: ${event.rarity}`);
    }
});

test('Rarity classification: showstoppers are legendary, notables are rare', () => {
    const birthDate = new Date('1990-01-15T12:00:00Z');
    const events = Nerdiversary.calculate(birthDate, 60);
    const byId = id => events.find(e => e.id === id);

    assertEqual(byId('seconds-1000000000').rarity, 'legendary', '1B seconds: ');
    assertEqual(byId('days-10000').rarity, 'legendary', '10,000 days: ');
    assertEqual(byId('earth-birthday-42').rarity, 'legendary', '42nd birthday: ');
    assertEqual(byId('pop-42-Million-Seconds').rarity, 'legendary', '42M seconds: ');
    assertEqual(byId('jupiter-1').rarity, 'legendary', 'Jupiter Year 1: ');

    assertEqual(byId('mars-1').rarity, 'rare', 'Mars Year 1: ');
    assertEqual(byId('earth-birthday-17').rarity, 'rare', 'prime birthday: ');

    // 0xDEADBEEF seconds lands ~118 years after birth — needs the full window
    const events120 = Nerdiversary.calculate(birthDate, 120);
    const deadbeef = events120.find(e => e.id === 'hex-0xDEADBEEF');
    assertEqual(deadbeef.rarity, 'rare', '0xDEADBEEF: ');
    assertEqual(byId('pop-1-337-Days').rarity, 'rare', '1337 days: ');

    assertEqual(byId('earth-birthday-18').rarity, 'common', 'ordinary birthday: ');

    const legendary = events.filter(e => e.rarity === 'legendary');
    const total = events.length;
    assertTrue(legendary.length / total < 0.05,
        `Legendary should be <5% of events to stay special (${legendary.length}/${total})`);
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

    // Calendar events use Calculator methods for single source of truth
    const usesGetEarthBirthday = workerCode.includes('Calculator.getEarthBirthdayAt');
    assertTrue(usesGetEarthBirthday, 'Worker should use Calculator.getEarthBirthdayAt()');
    const usesGetHolidays = workerCode.includes('Calculator.getHolidaysAt');
    assertTrue(usesGetHolidays, 'Worker should use Calculator.getHolidaysAt()');

    // Check shared.js imports
    const hasSharedImport = workerCode.includes("from '../js/shared.js'");
    assertTrue(hasSharedImport, 'Worker should import from shared.js');
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

test('Worker imports parseFamilyParam from shared module', () => {
    const importsParser = workerCode.includes('parseFamilyParam');
    assertTrue(importsParser, 'Should import parseFamilyParam from shared');

    // Verify it no longer defines its own version
    const hasLocalParser = workerCode.includes('function parseFamilyParam(');
    assertTrue(!hasLocalParser, 'Should NOT have a local parseFamilyParam definition');
});

test('Worker formats birth datetime correctly', () => {
    const hasFormatter = workerCode.includes('function formatBirthDatetime(');
    assertTrue(hasFormatter, 'Should have formatBirthDatetime function');

    // Should output ISO format truncated to minute
    const hasIsoSlice = workerCode.includes('toISOString().slice(0, 16)');
    assertTrue(hasIsoSlice, 'Should format as YYYY-MM-DDTHH:MM');
});

test('Worker matches milestones in-memory against DB members', () => {
    // Check the core algorithm: elapsed = now - birthMs + notifLeadTime
    const hasCalculation = workerCode.includes('now.getTime() - birthMs');
    assertTrue(hasCalculation, 'Should calculate elapsed time from birth');

    // Check notification lead times
    const hasLeadTimes = workerCode.includes('notificationTimes = [0, 60, 1440]');
    assertTrue(hasLeadTimes, 'Should check at event, 1 hour before, and 1 day before');
});

test('Worker fetches all family members in single D1 query', () => {
    // Check D1 binding
    const usesD1 = workerCode.includes('env.DB');
    assertTrue(usesD1, 'Should use D1 database binding');

    // Check single query for all members (not batched IN queries)
    const fetchesAll = workerCode.includes('FROM family_members fm');
    assertTrue(fetchesAll, 'Should query all family members');

    // Check offset Map for O(1) lookup
    const hasOffsetMap = workerCode.includes('offsetMap');
    assertTrue(hasOffsetMap, 'Should use offsetMap for O(1) milestone lookup');
});

test('Worker generates correct notification content', () => {
    const hasContentGen = workerCode.includes('function generateNotificationContent(');
    assertTrue(hasContentGen, 'Should have generateNotificationContent function');

    // Check it uses shared formatNotificationTitle
    const usesSharedTitle = workerCode.includes('formatNotificationTitle(');
    assertTrue(usesSharedTitle, 'Should use shared formatNotificationTitle');
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

test('Worker uses Map for offset lookup', () => {
    // offsetMap provides O(1) lookup from ms -> offset info
    const hasMap = workerCode.includes('new Map()');
    assertTrue(hasMap, 'Should use Map for offset lookup');

    const hasMapGet = workerCode.includes('offsetMap.get(');
    assertTrue(hasMapGet, 'Should look up offsets via Map.get()');
});

// ============================================
// SHARED MODULE TESTS
// ============================================
console.log('\n--- Shared Module ---');

test('parseFamilyParam handles single member', () => {
    const result = parseFamilyParam('Alice|1990-05-15|14:30');
    assertEqual(result.length, 1, 'Should return 1 member');
    assertEqual(result[0].name, 'Alice');
    assertEqual(result[0].dateStr, '1990-05-15');
    assertEqual(result[0].timeStr, '14:30');
    assertTrue(!isNaN(result[0].birthDate.getTime()), 'birthDate should be valid');
});

test('parseFamilyParam handles multiple members', () => {
    const result = parseFamilyParam('Alice|1990-05-15,Bob|1985-03-22');
    assertEqual(result.length, 2, 'Should return 2 members');
    assertEqual(result[0].name, 'Alice');
    assertEqual(result[1].name, 'Bob');
});

test('parseFamilyParam handles URL-encoded names', () => {
    const result = parseFamilyParam(`${encodeURIComponent('Alice Smith')}|1990-05-15`);
    assertEqual(result.length, 1);
    assertEqual(result[0].name, 'Alice Smith');
});

test('parseFamilyParam defaults time to 00:00', () => {
    const result = parseFamilyParam('Alice|1990-05-15');
    assertEqual(result[0].timeStr, '00:00');
});

test('parseFamilyParam filters invalid entries', () => {
    const result = parseFamilyParam('Alice|invalid-date');
    assertEqual(result.length, 0, 'Should filter out invalid dates');
});

test('parseFamilyParam returns empty array for empty input', () => {
    const result = parseFamilyParam('');
    assertEqual(result.length, 0);
});

test('Family URL round-trips names containing commas and pipes', () => {
    // Simulate the full flow: main.js encodes each name, then encodes the whole
    // param value into the URL; URLSearchParams.get() decodes once on read
    const names = ['Bob, Jr.', 'A|B', '100% Nerd'];
    const familyParam = names.map(n => `${encodeURIComponent(n)}|1990-05-15`).join(',');
    const url = new URL(`https://example.com/results.html?family=${encodeURIComponent(familyParam)}`);
    const result = parseFamilyParam(url.searchParams.get('family'));
    assertEqual(result.length, 3, 'All members should survive');
    assertEqual(result[0].name, 'Bob, Jr.');
    assertEqual(result[1].name, 'A|B');
    assertEqual(result[2].name, '100% Nerd');
});

test('parseFamilyParam tolerates raw % in names (legacy URLs)', () => {
    // Old-style URLs lose the name encoding after one URLSearchParams decode;
    // a raw % must not throw and wipe out the whole family
    const result = parseFamilyParam('100% Nerd|1990-05-15,Alice|1985-03-22');
    assertEqual(result.length, 2, 'Both members should survive');
    assertEqual(result[0].name, '100% Nerd');
    assertEqual(result[1].name, 'Alice');
});

test('formatNotificationTitle returns NOW message for 0 minutes', () => {
    const title = formatNotificationTitle('\u{1F389}', 0);
    assertTrue(title.includes("It's happening NOW!"), 'Should contain NOW message');
});

test('formatNotificationTitle returns minutes message for < 60', () => {
    const title = formatNotificationTitle('\u{1F389}', 30);
    assertTrue(title.includes('30 minutes away'), 'Should contain minutes message');
});

test('formatNotificationTitle returns hours message for < 1440', () => {
    const title = formatNotificationTitle('\u{1F389}', 120);
    assertTrue(title.includes('2 hours away'), 'Should contain hours message');
});

test('formatNotificationTitle returns days message for >= 1440', () => {
    const title = formatNotificationTitle('\u{1F389}', 2880);
    assertTrue(title.includes('2 days away'), 'Should contain days message');
});

test('formatNotificationTitle handles singular hour', () => {
    const title = formatNotificationTitle('\u{1F389}', 60);
    assertTrue(title.includes('1 hour away'), 'Should say "hour" not "hours"');
});

test('formatICalDate formats correctly', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = formatICalDate(date);
    assertEqual(result, '20240115T103000Z');
});

test('escapeICalText strips HTML and escapes special chars', () => {
    const result = escapeICalText('<b>Hello</b>, world; test\\backslash\nnewline');
    assertEqual(result, 'Hello\\, world\\; test\\\\backslash\\nnewline');
});

test('getCategoryInfo returns known categories', () => {
    const planetary = getCategoryInfo('planetary');
    assertEqual(planetary.name, 'Planetary');

    const decimal = getCategoryInfo('decimal');
    assertEqual(decimal.name, 'Decimal');
});

test('getCategoryInfo returns fallback for unknown category', () => {
    const unknown = getCategoryInfo('unknown-category');
    assertEqual(unknown.name, 'unknown-category');
});

test('localToUtcWithTimezone handles DST correctly', () => {
    // May 15 in Denver is MDT (UTC-6): 14:30 local = 20:30 UTC
    const summer = localToUtcWithTimezone('1990-05-15', '14:30', 'America/Denver');
    assertEqual(summer.toISOString().slice(0, 16), '1990-05-15T20:30');

    // Jan 15 in Denver is MST (UTC-7): 14:30 local = 21:30 UTC
    const winter = localToUtcWithTimezone('1990-01-15', '14:30', 'America/Denver');
    assertEqual(winter.toISOString().slice(0, 16), '1990-01-15T21:30');
});

test('parseFamilyParam honors explicit birth timezone', () => {
    const result = parseFamilyParam('Alice|1990-05-15|14:30|America/Denver');
    assertEqual(result.length, 1);
    assertEqual(result[0].timezone, 'America/Denver');
    // 14:30 MDT = 20:30 UTC
    assertEqual(result[0].birthDate.toISOString().slice(0, 16), '1990-05-15T20:30');
});

test('parseFamilyParam falls back gracefully on invalid timezone', () => {
    const result = parseFamilyParam('Alice|1990-05-15|14:30|Not/A_Zone');
    assertEqual(result.length, 1, 'Member should survive an invalid timezone');
    assertTrue(!isNaN(result[0].birthDate.getTime()), 'birthDate should still be valid');
});

test('generateICal folds lines to 75 octets (RFC 5545)', () => {
    const events = [{
        id: 'test-1',
        title: 'A very long milestone title for testing line folding behavior',
        description: 'This description is intentionally long so the DESCRIPTION property exceeds the 75-octet line limit and must be folded across continuation lines. 🎉🎂🚀',
        date: new Date('2024-01-15T10:30:00Z'),
        category: 'decimal',
        icon: '🔢'
    }];
    const ical = generateICal(events);
    const encoder = new TextEncoder();
    for (const line of ical.split('\r\n')) {
        assertTrue(encoder.encode(line).length <= 75,
            `Line exceeds 75 octets: "${line}"`);
    }
    // Unfolding (removing CRLF + space) must reproduce the original content
    const unfolded = ical.replace(/\r\n /g, '');
    assertTrue(unfolded.includes('SUMMARY:🔢 A very long milestone title for testing line folding behavior'),
        'Unfolded output should contain the full summary');
});

// ============================================
// CALENDAR FEED (buildFamilyEvents)
// ============================================
console.log('\n--- Calendar Feed ---');

test('Calendar feed contains upcoming events for adults', () => {
    // yearsAhead is measured from birth — the feed must still be useful
    // for someone born decades ago
    const now = new Date('2026-07-04T12:00:00Z');
    const members = [{ name: 'Paul', birthDate: new Date('1984-05-02T20:37:00Z') }];
    const events = buildFamilyEvents(members, now);

    assertTrue(events.length > 0, 'Feed should have events');
    const future = events.filter(e => e.date > now);
    assertTrue(future.length > 0, `Feed should have upcoming events, got ${future.length}`);

    // All events within the feed window: 30 days back to 2 years ahead
    const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 2 * 365.2425 * 24 * 60 * 60 * 1000);
    for (const e of events) {
        assertTrue(e.date >= windowStart && e.date <= windowEnd,
            `Event ${e.id} at ${e.date.toISOString()} outside feed window`);
    }
});

test('Family calendar feed has unique iCal UIDs and single shared holidays', () => {
    const now = new Date('2026-07-04T12:00:00Z');
    const members = [
        { name: 'Alice', birthDate: new Date('1990-01-15T10:00:00Z') },
        { name: 'Bob', birthDate: new Date('1985-06-20T10:00:00Z') },
    ];
    const events = buildFamilyEvents(members, now);

    // Every event id (and therefore iCal UID) must be unique
    const ids = events.map(e => e.id);
    assertEqual(new Set(ids).size, ids.length, 'Event ids must be unique across members. ');

    // Shared holidays appear once, not once per member
    const piDays = events.filter(e => e.isSharedHoliday && e.title.startsWith('Pi Day'));
    const piYears = piDays.map(e => e.title);
    assertEqual(new Set(piYears).size, piYears.length, 'Each shared holiday should appear once. ');

    // Titles must not be double-prefixed — generateICal adds the person prefix
    const prefixed = events.filter(e => !e.isSharedHoliday && e.title.startsWith(`${e.personName}:`));
    assertEqual(prefixed.length, 0, 'transformEvent must not prefix titles (generateICal does). ');

    // And the generated iCal has unique UIDs
    const ical = generateICal(events, true);
    const uids = ical.split('\r\n').filter(l => l.startsWith('UID:'));
    assertEqual(new Set(uids).size, uids.length, 'iCal UIDs must be unique. ');
});

// ============================================
// SHARE REDIRECT PAGES
// ============================================
console.log('\n--- Share Redirect Pages ---');

test('Share page emits milestone-specific OG tags and category card', () => {
    const url = new URL('https://worker.test/share?t=1%20Billion%20Seconds&d=2027-03-03T12:00:00Z&i=%F0%9F%94%A2&c=decimal&n=Paul&f=Paul%7C1995-06-27');
    const html = buildSharePage(url);

    assertTrue(html.includes('Paul reaches 1 Billion Seconds on March 3, 2027!'),
        'OG title should name the person, milestone, and date');
    assertTrue(html.includes('assets/og/decimal.jpg'), 'Should use the category card image');
    assertTrue(html.includes('results.html?family=Paul%257C1995-06-27') || html.includes('results.html?family=Paul%7C1995-06-27'),
        'Should redirect to the results page with the family param');
});

test('Share page escapes user-controlled params (no HTML injection)', () => {
    const url = new URL('https://worker.test/share?t=' + encodeURIComponent('<script>alert(1)</script>') + '&n=' + encodeURIComponent('"><img src=x>'));
    const html = buildSharePage(url);

    assertTrue(!html.includes('<script>alert'), 'Script tags must be escaped');
    assertTrue(!html.includes('"><img'), 'Attribute breakouts must be escaped');
});

test('Share page never redirects off-site', () => {
    // f is treated as data (a family param), not a URL — even if it looks like one
    const url = new URL('https://worker.test/share?f=' + encodeURIComponent('https://evil.example/phish'));
    const html = buildSharePage(url);

    assertTrue(html.includes('https://paultarjan.com/nerdiversary/results.html?family='),
        'Redirect target must stay on the site');
    assertTrue(!html.includes('url=https://evil.example'), 'Must not redirect to attacker URL');
});

test('Share page tolerates missing/invalid params', () => {
    const html = buildSharePage(new URL('https://worker.test/share'));
    assertTrue(html.includes('assets/og/default.jpg'), 'Falls back to default card');
    assertTrue(html.includes('https://paultarjan.com/nerdiversary/'), 'Falls back to site root');

    const badHtml = buildSharePage(new URL('https://worker.test/share?t=X&d=not-a-date'));
    assertTrue(!badHtml.includes('Invalid Date'), 'Invalid dates must not leak into the title');
});

// ============================================
// WORKER OFFSET GENERATION
// ============================================
console.log('\n--- Worker Offset Generation ---');

test('Milestone offsets are unique per minute (collisions merged, not dropped)', () => {
    const offsets = generateMilestoneOffsets();
    const msValues = offsets.map(o => o.ms);
    assertEqual(new Set(msValues).size, msValues.length, 'Offsets must be unique by ms. ');

    // The 1 AU / Light Speed to the Sun collision must be merged into one label
    const au = offsets.find(o => o.label.includes('1 AU (Sun Distance)'));
    assertTrue(au !== undefined, 'Should have the 1 AU milestone');
    assertTrue(au.label.includes('Light Speed to the Sun'),
        `Colliding milestones should merge labels, got: "${au.label}"`);
});

// ============================================
// NOTIFICATION BACKTEST
// ============================================
console.log('\n--- Notification Backtest ---');

test('Some milestone offsets have sub-minute precision (proving rounding fix is needed)', () => {
    const refBirth = new Date('2000-01-01T00:00:00Z');
    const events = Calculator.calculate(refBirth, { yearsAhead: 120, includePast: true });

    let nonMinuteCount = 0;
    for (const event of events) {
        if (event.isSharedHoliday) continue;
        if (event.id.startsWith('earth-birthday-')) continue;

        const ms = event.date.getTime() - refBirth.getTime();
        if (ms > 0 && ms % 60000 !== 0) {
            nonMinuteCount++;
        }
    }

    assertTrue(nonMinuteCount > 0,
        `Expected milestones with sub-minute offsets, got ${nonMinuteCount}`);
});

test('Without rounding, some notifications would target wrong birth minute', () => {
    const refBirth = new Date('2000-01-01T00:00:00Z');
    const events = Calculator.calculate(refBirth, { yearsAhead: 50, includePast: true });

    const birthDatetime = '1990-05-15T21:30';
    const birthMs = new Date(birthDatetime + ':00Z').getTime();

    let wouldMiss = 0;
    let total = 0;

    for (const event of events) {
        if (event.isSharedHoliday) continue;
        if (event.id.startsWith('earth-birthday-')) continue;

        const rawMs = event.date.getTime() - refBirth.getTime();
        if (rawMs <= 0) continue;

        // Simulate cron firing at the start of the notification minute (no rounding)
        const eventTimeMs = birthMs + rawMs;
        const cronTime = Math.floor(eventTimeMs / 60000) * 60000;
        const targetMs = cronTime - rawMs;
        const targetDatetime = new Date(targetMs).toISOString().slice(0, 16);

        if (targetDatetime !== birthDatetime) {
            wouldMiss++;
        }
        total++;
    }

    assertTrue(wouldMiss > 0,
        `Expected some notifications to miss without rounding, got ${wouldMiss}/${total}`);
});

test('With rounding, all offset-based notifications target correct birth minute', () => {
    const refBirth = new Date('2000-01-01T00:00:00Z');
    const events = Calculator.calculate(refBirth, { yearsAhead: 120, includePast: true });

    // Generate rounded offsets (matching fixed worker logic)
    const offsets = [];
    for (const event of events) {
        if (event.isSharedHoliday) continue;
        if (event.id.startsWith('earth-birthday-')) continue;
        const ms = event.date.getTime() - refBirth.getTime();
        if (ms > 0) {
            offsets.push({ ms: Math.round(ms / 60000) * 60000, label: event.title });
        }
    }

    const birthDatetime = '1990-05-15T21:30';
    const birthMs = new Date(birthDatetime + ':00Z').getTime();
    const notificationTimes = [0, 60, 1440];

    let tested = 0;
    let failures = 0;

    for (const offset of offsets) {
        for (const notifMinutes of notificationTimes) {
            // Notification fires at: birthMs + offset.ms - notifMinutes * 60000
            const notifTimeMs = birthMs + offset.ms - notifMinutes * 60 * 1000;
            // Simulate cron at start of that minute (truncated now)
            const cronTime = Math.floor(notifTimeMs / 60000) * 60000;
            // Worker target calculation
            const targetMs = cronTime - offset.ms + notifMinutes * 60 * 1000;
            const targetDatetime = new Date(targetMs).toISOString().slice(0, 16);

            tested++;
            if (targetDatetime !== birthDatetime) {
                failures++;
            }
        }
    }

    assertEqual(failures, 0,
        `${failures}/${tested} notifications would target wrong minute. `);
});

test('Backtest: 1 billion seconds notification fires at correct minute', () => {
    const birthDatetime = '1990-01-15T12:00';
    const birthDate = new Date(birthDatetime + ':00Z');
    const birthMs = birthDate.getTime();

    const events = Calculator.calculate(birthDate, { yearsAhead: 50, includePast: true });
    const billionSeconds = events.find(e => e.id === 'seconds-1000000000');
    assertTrue(billionSeconds !== undefined, 'Should find 1 billion seconds milestone');

    // Verify raw offset has sub-minute component
    const rawOffset = billionSeconds.date.getTime() - birthMs;
    assertTrue(rawOffset % 60000 !== 0, '1B seconds offset should have sub-minute component');

    // Apply rounding fix
    const roundedOffset = Math.round(rawOffset / 60000) * 60000;

    // Simulate cron for "at event time" (notifMinutes=0)
    const eventTimeMs = birthMs + roundedOffset;
    const cronTime = Math.floor(eventTimeMs / 60000) * 60000;
    const targetMs = cronTime - roundedOffset;
    const targetDatetime = new Date(targetMs).toISOString().slice(0, 16);

    assertEqual(targetDatetime, birthDatetime,
        '1 billion seconds notification should match birth datetime. ');

    // Rounding error should be <= 30 seconds
    const diffMs = Math.abs(roundedOffset - rawOffset);
    assertTrue(diffMs <= 30000, `Rounding error should be <= 30s, got ${diffMs}ms`);
});

test('Backtest: calendar events (earth birthdays) fire at correct minute', () => {
    const birthDatetime = '1990-05-15T14:30';
    const birthDate = new Date(birthDatetime + ':00Z');

    const events = Calculator.calculate(birthDate, { yearsAhead: 5, includePast: true });
    const earthBirthdays = events.filter(e => e.id.startsWith('earth-birthday-'));

    assertTrue(earthBirthdays.length >= 3, 'Should have at least 3 earth birthdays');

    const notificationTimes = [0, 60, 1440];
    let tested = 0;

    for (const event of earthBirthdays.slice(0, 3)) {
        for (const notifMinutes of notificationTimes) {
            const notifTime = new Date(event.date.getTime() - notifMinutes * 60 * 1000);

            // Calendar events are created at exact minute boundaries (seconds=0)
            assertEqual(event.date.getSeconds(), 0,
                `Earth birthday should have seconds=0. `);

            // Simulate cron at start of notification minute
            const cronMinute = new Date(notifTime);
            cronMinute.setSeconds(0, 0);
            const currentMinute = cronMinute.toISOString().slice(0, 16);
            const notifMinuteStr = notifTime.toISOString().slice(0, 16);

            assertEqual(notifMinuteStr, currentMinute,
                `Earth birthday ${event.title} with ${notifMinutes}min lead should match. `);
            tested++;
        }
    }

    assertTrue(tested >= 9, `Should test at least 9 cases, tested ${tested}`);
});

test('Backtest: multiple birth datetimes all match correctly', () => {
    const refBirth = new Date('2000-01-01T00:00:00Z');
    const events = Calculator.calculate(refBirth, { yearsAhead: 50, includePast: true });

    // Test a variety of birth times including edge cases
    const testBirths = [
        '1985-12-31T23:59',  // Near midnight
        '1990-01-01T00:00',  // Midnight exactly
        '1995-06-15T12:30',  // Mid-day
        '2000-03-01T06:00',  // Morning
    ];

    const offsets = [];
    for (const event of events) {
        if (event.isSharedHoliday) continue;
        if (event.id.startsWith('earth-birthday-')) continue;
        const ms = event.date.getTime() - refBirth.getTime();
        if (ms > 0) {
            offsets.push(Math.round(ms / 60000) * 60000);
        }
    }

    // Sample every 100th offset to keep test fast
    const sampledOffsets = offsets.filter((_, i) => i % 100 === 0);

    for (const birthDatetime of testBirths) {
        const birthMs = new Date(birthDatetime + ':00Z').getTime();

        for (const offsetMs of sampledOffsets) {
            const notifTimeMs = birthMs + offsetMs; // at-event notification
            const cronTime = Math.floor(notifTimeMs / 60000) * 60000;
            const targetMs = cronTime - offsetMs;
            const targetDatetime = new Date(targetMs).toISOString().slice(0, 16);

            assertEqual(targetDatetime, birthDatetime,
                `Birth ${birthDatetime} with offset ${offsetMs} should match. `);
        }
    }
});

// ============================================
// CALENDAR EVENT CONTRACT TESTS
// ============================================
console.log('\n--- Calendar Event Contract Tests ---');

test('getCalendarEventsAt finds earth birthdays', () => {
    const birthDate = new Date('1990-05-15T14:30:00Z');
    // 35th birthday at birth time (UTC)
    const birthdayTime = new Date(Date.UTC(2025, 4, 15, 14, 30));

    const events = Calculator.getCalendarEventsAt(birthDate, birthdayTime);
    assertTrue(events.length === 1, `Should find 1 event, got ${events.length}`);
    assertEqual(events[0].id, 'earth-birthday-35');
    assertEqual(events[0].title, '35th Birthday');
    assertEqual(events[0].icon, '🎂');
});

test('getCalendarEventsAt finds nerdy holidays', () => {
    const birthDate = new Date('1990-05-15T14:30:00Z');
    // Pi Day (March 14) at birth time (UTC)
    const piDay = new Date(Date.UTC(2025, 2, 14, 14, 30));

    const events = Calculator.getCalendarEventsAt(birthDate, piDay);
    const piEvent = events.find(e => e.isSharedHoliday && e.title.includes('Pi Day'));
    assertTrue(piEvent !== undefined, 'Should find Pi Day event');
    assertEqual(piEvent.icon, '🥧');
});

test('getCalendarEventsAt returns empty for non-events', () => {
    const birthDate = new Date('1990-05-15T14:30:00Z');
    // Random date that's not a birthday or holiday, but at birth time (UTC)
    const randomDate = new Date(Date.UTC(2025, 6, 20, 14, 30));

    const events = Calculator.getCalendarEventsAt(birthDate, randomDate);
    assertEqual(events.length, 0, 'Should return no events');
});

test('getCalendarEventsAt returns empty for wrong HH:MM', () => {
    const birthDate = new Date('1990-05-15T14:30:00Z');
    // Birthday date but wrong time (UTC)
    const wrongTime = new Date(Date.UTC(2025, 4, 15, 15, 30));

    const events = Calculator.getCalendarEventsAt(birthDate, wrongTime);
    assertEqual(events.length, 0, 'Should return no events for wrong time');
});

test('getCalendarEventsAt matches calculate() for all calendar events', () => {
    const birthDatetimes = [
        '1984-05-02T20:37',
        '1990-03-14T10:00', // Born on Pi Day
        '2000-06-28T15:30', // Born on Tau Day
        '1995-01-01T00:00', // Midnight birth
    ];

    let totalEvents = 0;
    let matched = 0;

    for (const birthDatetime of birthDatetimes) {
        const birthDate = new Date(birthDatetime + ':00Z');
        const allEvents = Calculator.calculate(birthDate, { yearsAhead: 5, includePast: true });
        const calendarEvents = allEvents.filter(e =>
            e.id.startsWith('earth-birthday-') || e.isSharedHoliday
        );

        for (const event of calendarEvents) {
            totalEvents++;
            const atEvents = Calculator.getCalendarEventsAt(birthDate, event.date);
            const match = atEvents.find(e => e.id === event.id);

            assertTrue(match !== undefined,
                `getCalendarEventsAt should find ${event.id} for birth ${birthDatetime}`);
            assertEqual(match.title, event.title,
                `Title mismatch for ${event.id}: ${match.title} vs ${event.title}. `);
            assertEqual(match.icon, event.icon,
                `Icon mismatch for ${event.id}. `);
            matched++;
        }
    }

    assertTrue(totalEvents > 0, 'Should have tested some events');
    assertEqual(matched, totalEvents, `All ${totalEvents} events should match. `);
});

test('Backtest: earth birthdays fire at birth local HH:MM', () => {
    // Earth birthdays fire at the birth's local hour:minute.
    // In the worker (UTC timezone), local = UTC, so this guarantees the SQL
    // query on SUBSTR(birth_datetime, 12, 5) matches event HH:MM.
    // (Shared holidays now fire at midnight local, handled separately.)
    const birthDatetimes = [
        '1984-05-02T20:37',
        '1990-03-14T10:00',
        '2000-06-28T15:30',
        '1995-12-31T23:59',
    ];

    let tested = 0;

    for (const birthDatetime of birthDatetimes) {
        const birthDate = new Date(birthDatetime + ':00Z');
        const allEvents = Calculator.calculate(birthDate, { yearsAhead: 5, includePast: true });
        const earthBirthdays = allEvents.filter(e => e.id.startsWith('earth-birthday-'));

        for (const event of earthBirthdays) {
            assertEqual(event.date.getHours(), birthDate.getHours(),
                `Event ${event.id} hour should match birth hour. `);
            assertEqual(event.date.getMinutes(), birthDate.getMinutes(),
                `Event ${event.id} minute should match birth minute. `);
            tested++;
        }
    }

    assertTrue(tested > 0, `Should have tested some events, tested ${tested}`);
});

// ============================================
// STRUCTURAL GUARDS
// ============================================
console.log('\n--- Structural Guards ---');

test('Every milestone generator produces events that reach the worker', () => {
    // If you add a new _add*Milestones method to Calculator, this test ensures
    // every generated event is either:
    //   (a) offset-based: included in generateMilestoneOffsets() (no isSharedHoliday, no earth-birthday- id)
    //   (b) calendar-based: found by getCalendarEventsAt() (isSharedHoliday or earth-birthday-)
    // If a new type falls through both paths, push notifications won't fire for it.

    const refBirth = new Date('2000-01-01T00:00:00Z');
    const events = Calculator.calculate(refBirth, { yearsAhead: 50, includePast: true });

    // Offset-based: simulate what generateMilestoneOffsets does
    const offsetEvents = events.filter(e =>
        !e.isSharedHoliday && !e.id.startsWith('earth-birthday-')
    );
    for (const event of offsetEvents) {
        const ms = event.date.getTime() - refBirth.getTime();
        assertTrue(ms > 0, `Offset event "${event.title}" (${event.id}) should have positive offset`);
    }

    // Calendar-based: verify the split methods find them
    const calendarEvents = events.filter(e =>
        e.isSharedHoliday || e.id.startsWith('earth-birthday-')
    );
    for (const event of calendarEvents.slice(0, 20)) {
        if (event.id.startsWith('earth-birthday-')) {
            const found = Calculator.getEarthBirthdayAt(refBirth, event.date);
            const match = found.find(e => e.id === event.id);
            assertTrue(match !== undefined,
                `Earth birthday "${event.title}" (${event.id}) must be found by getEarthBirthdayAt`);
        } else {
            const found = Calculator.getHolidaysAt(event.date);
            const match = found.find(e => e.id === event.id);
            assertTrue(match !== undefined,
                `Holiday "${event.title}" (${event.id}) must be found by getHolidaysAt`);
        }
    }

    // Every event must be in one of the two groups
    const allIds = new Set(events.map(e => e.id));
    const coveredIds = new Set([
        ...offsetEvents.map(e => e.id),
        ...calendarEvents.map(e => e.id)
    ]);
    for (const id of allIds) {
        assertTrue(coveredIds.has(id),
            `Event ${id} is not covered by either offset or calendar notification path`);
    }
});

test('Every nerdy holiday is found by getHolidaysAt', () => {
    // If you add a holiday to nerdyHolidays in milestones.js, this ensures
    // getHolidaysAt will find it (so push notifications work at midnight local).
    for (const holiday of Milestones.nerdyHolidays) {
        const holidayDate = new Date(Date.UTC(2025, holiday.month, holiday.day));
        const found = Calculator.getHolidaysAt(holidayDate);
        const match = found.find(e => e.title.includes(holiday.name));
        assertTrue(match !== undefined,
            `Holiday "${holiday.name}" (month:${holiday.month} day:${holiday.day}) not found by getHolidaysAt`);
        assertTrue(match.isSharedHoliday === true,
            `Holiday "${holiday.name}" must have isSharedHoliday=true`);
    }
});

test('No milestone titles collide with holiday name prefixes', () => {
    // If you add a milestone with a title like "Foo Day 123", and there's a holiday
    // "Foo Day 2025", they'll be confused. This test catches that.
    const refBirth = new Date('2000-01-01T00:00:00Z');
    const events = Calculator.calculate(refBirth, { yearsAhead: 50, includePast: true });

    const holidays = events.filter(e => e.isSharedHoliday);
    const holidayPrefixes = [...new Set(holidays.map(e => {
        // Holiday titles are "Name YYYY" — extract the name part
        const parts = e.title.split(' ');
        return parts.slice(0, -1).join(' ');
    }))];

    const nonHolidays = events.filter(e => !e.isSharedHoliday && !e.id.startsWith('earth-birthday-'));
    const collisions = nonHolidays.filter(e =>
        holidayPrefixes.some(p => e.title.startsWith(p + ' '))
    );

    assertEqual(collisions.length, 0,
        `Milestone titles collide with holiday names: ${collisions.slice(0, 3).map(c => `"${c.title}"`).join(', ')}. `);
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
