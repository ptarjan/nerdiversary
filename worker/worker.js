/**
 * Nerdiversary Cloudflare Worker
 * Generates .ics calendar files for nerdiversary events
 *
 * Deployed via GitHub Actions
 */

// ============================================================================
// SHARED CONSTANTS - Keep in sync with js/nerdiversary.js
// ============================================================================

// Time constants
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000; // Gregorian calendar average
const MS_PER_MONTH = MS_PER_DAY * 30.4375;

// Planetary orbital periods in Earth days
const PLANETS = {
  mercury: { name: 'Mercury', days: 87.969, icon: '☿️' },
  venus: { name: 'Venus', days: 224.701, icon: '♀️' },
  mars: { name: 'Mars', days: 686.980, icon: '♂️' },
  jupiter: { name: 'Jupiter', days: 4332.59, icon: '♃' },
  saturn: { name: 'Saturn', days: 10759.22, icon: '♄' },
  uranus: { name: 'Uranus', days: 30688.5, icon: '⛢' },
  neptune: { name: 'Neptune', days: 60182, icon: '♆' }
};

// Mathematical constants
const PI = Math.PI;
const E = Math.E;
const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = 2 * Math.PI;

// Fibonacci sequence (extended for seconds milestones)
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986, 102334155, 165580141, 267914296, 433494437, 701408733, 1134903170, 1836311903, 2971215073];

// Lucas numbers (like Fibonacci but starts 2, 1)
const LUCAS = [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322, 521, 843, 1364, 2207, 3571, 5778, 9349, 15127, 24476, 39603, 64079, 103682, 167761, 271443, 439204, 710647, 1149851, 1860498, 3010349, 4870847, 7881196, 12752043, 20633239, 33385282, 54018521, 87403803];

// Triangular numbers T(n) = n*(n+1)/2
const TRIANGULAR = [];
for (let n = 1; n <= 100; n++) {
  TRIANGULAR.push(n * (n + 1) / 2);
}

// Palindrome numbers (interesting ones for days)
const PALINDROMES = [101, 111, 121, 131, 141, 151, 161, 171, 181, 191, 202, 212, 303, 313, 404, 414, 505, 515, 606, 616, 707, 717, 808, 818, 909, 919, 1001, 1111, 1221, 1331, 1441, 1551, 1661, 1771, 1881, 1991, 2002, 2112, 2222, 2332, 2442, 2552, 2662, 2772, 2882, 2992, 3003, 3113, 3223, 3333, 4004, 4114, 4224, 4334, 4444, 5005, 5115, 5225, 5335, 5445, 5555, 6006, 6116, 6226, 6336, 6446, 6556, 6666, 7007, 7117, 7227, 7337, 7447, 7557, 7667, 7777, 8008, 8118, 8228, 8338, 8448, 8558, 8668, 8778, 8888, 9009, 9119, 9229, 9339, 9449, 9559, 9669, 9779, 9889, 9999, 10001, 10101, 10201, 11011, 11111, 11211, 11311, 11411, 11511, 11611, 11711, 11811, 11911, 12021, 12121, 12221, 12321];

// Repunit numbers (all 1s)
const REPUNITS = [11, 111, 1111, 11111, 111111, 1111111, 11111111];

// Powers of 2 for binary milestones
const POWERS_OF_2 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// ============================================================================
// SHARED MILESTONES - Keep in sync with js/nerdiversary.js
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
  { value: 1.5e9, label: '1.5 Billion Seconds', short: '1.5×10⁹ seconds' },
  { value: 2e9, label: '2 Billion Seconds', short: '2×10⁹ seconds' },
  { value: 2.5e9, label: '2.5 Billion Seconds', short: '2.5×10⁹ seconds' },
  { value: 3e9, label: '3 Billion Seconds', short: '3×10⁹ seconds' }
];

const minuteMilestones = [
  { value: 1e5, label: '100,000 Minutes', short: '10⁵ minutes' },
  { value: 1e6, label: '1 Million Minutes', short: '10⁶ minutes' },
  { value: 1e7, label: '10 Million Minutes', short: '10⁷ minutes' }
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
  { value: 17500, label: '17,500 Days', short: '1.75×10⁴ days' },
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
  { value: 2500, label: '2,500 Weeks', short: '2,500 weeks' },
  { value: 3000, label: '3,000 Weeks', short: '3×10³ weeks' }
];

const monthMilestones = [
  { value: 100, label: '100 Months', short: '100 months' },
  { value: 200, label: '200 Months', short: '200 months' },
  { value: 250, label: '250 Months', short: '250 months' },
  { value: 300, label: '300 Months', short: '300 months' },
  { value: 400, label: '400 Months', short: '400 months' },
  { value: 500, label: '500 Months', short: '500 months' },
  { value: 600, label: '600 Months', short: '600 months' },
  { value: 750, label: '750 Months', short: '750 months' },
  { value: 1000, label: '1,000 Months', short: '10³ months' }
];

// ============================================================================
// WORKER HANDLER
// ============================================================================

// Cloudflare Workers export
const workerHandler = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Get birthday from query params
    const birthday = url.searchParams.get('d') || url.searchParams.get('birthday');
    const birthtime = url.searchParams.get('t') || url.searchParams.get('time') || '00:00';

    if (!birthday) {
      return new Response(JSON.stringify({
        error: 'Missing birthday parameter',
        usage: 'Add ?d=YYYY-MM-DD or ?birthday=YYYY-MM-DD to the URL',
        example: url.origin + '/?d=1990-05-15'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Parse birth date
    const birthDate = new Date(`${birthday}T${birthtime}:00`);

    if (isNaN(birthDate.getTime())) {
      return new Response(JSON.stringify({
        error: 'Invalid date format',
        expected: 'YYYY-MM-DD',
        received: birthday
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Generate events
    const events = calculateNerdiversaries(birthDate, 120); // 120 years of events

    // Generate iCal content
    const icalContent = generateICal(events);

    // Return .ics file
    return new Response(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="nerdiversaries.ics"',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  },
};

// ES module export for Cloudflare Workers
export default workerHandler;

// ============================================================================
// HELPERS
// ============================================================================

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================================================
// EVENT CALCULATION
// ============================================================================

function calculateNerdiversaries(birthDate, yearsAhead) {
  const events = [];
  const now = new Date();
  const maxDate = new Date(birthDate.getTime() + yearsAhead * MS_PER_YEAR);

  // Planetary years
  for (const [key, planet] of Object.entries(PLANETS)) {
    const periodMs = planet.days * MS_PER_DAY;
    for (let yearNum = 1; yearNum <= 200; yearNum++) {
      const eventDate = new Date(birthDate.getTime() + yearNum * periodMs);
      if (eventDate > maxDate) break;
      if (eventDate < now) continue;

      events.push({
        id: `${key}-${yearNum}`,
        title: `${planet.icon} ${planet.name} Year ${yearNum}`,
        description: `You've completed ${yearNum} orbit${yearNum > 1 ? 's' : ''} around the Sun as measured from ${planet.name}!`,
        date: eventDate,
        category: 'planetary'
      });
    }
  }

  // Seconds milestones
  for (const m of secondMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `seconds-${m.value}`,
        title: `🔢 ${m.label}`,
        description: `You've been alive for exactly ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Minutes milestones
  for (const m of minuteMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_MINUTE);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `minutes-${m.value}`,
        title: `⏱️ ${m.label}`,
        description: `You've experienced exactly ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Hours milestones
  for (const m of hourMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_HOUR);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `hours-${m.value}`,
        title: `⏰ ${m.label}`,
        description: `You've lived for exactly ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Days milestones
  for (const m of dayMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `days-${m.value}`,
        title: `📆 ${m.label}`,
        description: `You've experienced ${m.short} on Earth!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Weeks milestones
  for (const m of weekMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_WEEK);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `weeks-${m.value}`,
        title: `📅 ${m.label}`,
        description: `You've lived for ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Months milestones
  for (const m of monthMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_MONTH);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `months-${m.value}`,
        title: `🗓️ ${m.label}`,
        description: `You've experienced ${m.short} of life!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Binary milestones (powers of 2 in seconds)
  for (const power of POWERS_OF_2) {
    const value = Math.pow(2, power);
    const eventDate = new Date(birthDate.getTime() + value * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `binary-${power}`,
        title: `💻 2^${power} Seconds`,
        description: `You've lived for exactly 2^${power} = ${value.toLocaleString()} seconds!`,
        date: eventDate,
        category: 'binary'
      });
    }
  }

  // All number base milestones
  const baseMilestones = [
    { base: 3, name: 'ternary', icon: '🔺', units: [
      { powers: [15, 16, 17, 18, 19, 20], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
      { powers: [11, 12, 13, 14, 15], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
      { powers: [8, 9, 10, 11, 12], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
      { powers: [6, 7, 8, 9], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ]},
    { base: 5, name: 'quinary', icon: '🖐️', units: [
      { powers: [10, 11, 12, 13, 14], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
      { powers: [8, 9, 10, 11], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
      { powers: [6, 7, 8, 9], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
      { powers: [5, 6, 7], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ]},
    { base: 6, name: 'senary', icon: '🎲', units: [
      { powers: [9, 10, 11, 12, 13], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
      { powers: [7, 8, 9, 10], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
      { powers: [5, 6, 7, 8], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
      { powers: [4, 5, 6], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ]},
    { base: 7, name: 'septenary', icon: '🌈', units: [
      { powers: [8, 9, 10, 11, 12], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
      { powers: [6, 7, 8, 9], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
      { powers: [5, 6, 7, 8], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
      { powers: [4, 5, 6], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ]},
    { base: 8, name: 'octal', icon: '🐙', units: [
      { powers: [7, 8, 9, 10, 11], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
      { powers: [5, 6, 7, 8], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
      { powers: [4, 5, 6, 7], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
      { powers: [3, 4, 5, 6], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ]},
    { base: 12, name: 'dozenal', icon: '🕛', units: [
      { powers: [6, 7, 8, 9], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
      { powers: [5, 6, 7], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
      { powers: [4, 5, 6], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
      { powers: [3, 4, 5], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ]},
    { base: 60, name: 'Babylonian', icon: '🏛️', units: [
      { powers: [4, 5], unit: 'seconds', label: 'Seconds', ms: MS_PER_SECOND },
      { powers: [3, 4], unit: 'minutes', label: 'Minutes', ms: MS_PER_MINUTE },
      { powers: [2, 3], unit: 'hours', label: 'Hours', ms: MS_PER_HOUR },
      { powers: [2], unit: 'days', label: 'Days', ms: MS_PER_DAY }
    ]}
  ];

  for (const { base, name, icon, units } of baseMilestones) {
    for (const { powers, unit, label, ms } of units) {
      for (const power of powers) {
        const value = Math.pow(base, power);
        const eventDate = new Date(birthDate.getTime() + value * ms);
        if (eventDate <= maxDate && eventDate > now && eventDate > birthDate) {
          events.push({
            id: `base${base}-${power}-${unit}`,
            title: `${icon} ${base}^${power} ${label}`,
            description: `You've lived for ${base}^${power} = ${value.toLocaleString()} ${unit} (${name})!`,
            date: eventDate,
            category: 'binary'
          });
        }
      }
    }
  }

  // Mathematical constants
  const mathMilestones = [
    { value: PI * 1e8, label: 'π × 10⁸ Seconds', icon: 'π' },
    { value: PI * 1e9, label: 'π × 10⁹ Seconds', icon: 'π' },
    { value: E * 1e8, label: 'e × 10⁸ Seconds', icon: 'e' },
    { value: E * 1e9, label: 'e × 10⁹ Seconds', icon: 'e' },
    { value: PHI * 1e8, label: 'φ × 10⁸ Seconds', icon: 'φ' },
    { value: PHI * 1e9, label: 'φ × 10⁹ Seconds', icon: 'φ' },
  ];

  for (const m of mathMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `math-${m.label.replace(/\s/g, '-')}`,
        title: `${m.icon} ${m.label}`,
        description: `You've lived for ${m.label}!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Fibonacci milestones (seconds - larger ones spanning lifetime)
  for (const fib of FIBONACCI.filter(n => n >= 1e6 && n <= 3e9)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-seconds-${fib}`,
        title: `🌀 Fibonacci Second ${fib.toLocaleString()}`,
        description: `Second ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Fibonacci milestones (minutes)
  for (const fib of FIBONACCI.filter(n => n >= 1e5 && n <= 5e7)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_MINUTE);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-minutes-${fib}`,
        title: `🌀 Fibonacci Minute ${fib.toLocaleString()}`,
        description: `Minute ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Fibonacci milestones (hours)
  for (const fib of FIBONACCI.filter(n => n >= 10000 && n <= 1000000)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_HOUR);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-hours-${fib}`,
        title: `🌀 Fibonacci Hour ${fib.toLocaleString()}`,
        description: `Hour ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Fibonacci milestones (days)
  for (const fib of FIBONACCI.filter(n => n >= 100 && n <= 40000)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-days-${fib}`,
        title: `🌀 Fibonacci Day ${fib.toLocaleString()}`,
        description: `Day ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Lucas number milestones (days)
  for (const luc of LUCAS.filter(n => n >= 100 && n <= 40000)) {
    const eventDate = new Date(birthDate.getTime() + luc * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `lucas-days-${luc}`,
        title: `🔢 Lucas Day ${luc.toLocaleString()}`,
        description: `Day ${luc.toLocaleString()} is a Lucas number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Triangular number milestones (days)
  const interestingTriangular = TRIANGULAR.filter(n => n >= 1000 && n <= 35000);
  for (const tri of interestingTriangular) {
    const eventDate = new Date(birthDate.getTime() + tri * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      const n = Math.round((-1 + Math.sqrt(1 + 8 * tri)) / 2);
      events.push({
        id: `triangular-days-${tri}`,
        title: `🔺 Triangular Day ${tri.toLocaleString()}`,
        description: `Day ${tri.toLocaleString()} is the ${n}th triangular number (1+2+...+${n})!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Palindrome milestones (days)
  const interestingPalindromes = PALINDROMES.filter(n => n >= 1000 && n <= 30000);
  for (const pal of interestingPalindromes) {
    const eventDate = new Date(birthDate.getTime() + pal * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `palindrome-days-${pal}`,
        title: `🪞 Palindrome Day ${pal.toLocaleString()}`,
        description: `Day ${pal} reads the same forwards and backwards!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Palindrome hours
  const palindromeHours = [10001, 10101, 10201, 11011, 11111, 11211, 12021, 12121, 12221, 12321];
  for (const pal of palindromeHours) {
    const eventDate = new Date(birthDate.getTime() + pal * MS_PER_HOUR);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `palindrome-hours-${pal}`,
        title: `🪞 Palindrome Hour ${pal.toLocaleString()}`,
        description: `Hour ${pal.toLocaleString()} is a palindrome!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Repunit milestones (days)
  for (const rep of REPUNITS.filter(n => n >= 111 && n <= 30000)) {
    const eventDate = new Date(birthDate.getTime() + rep * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `repunit-days-${rep}`,
        title: `1️⃣ Repunit Day ${rep.toLocaleString()}`,
        description: `Day ${rep} is all 1s - a repunit number!`,
        date: eventDate,
        category: 'binary'
      });
    }
  }

  // Scientific milestones
  // Speed of light: 299,792,458 m/s
  const speedOfLight = 299792458;
  const solEvent = new Date(birthDate.getTime() + speedOfLight * MS_PER_SECOND);
  if (solEvent <= maxDate && solEvent > now) {
    events.push({
      id: 'speed-of-light-seconds',
      title: `💡 Speed of Light Seconds`,
      description: `You've lived for ${speedOfLight.toLocaleString()} seconds - the speed of light in m/s!`,
      date: solEvent,
      category: 'mathematical'
    });
  }

  // Euler's identity related: e^π ≈ 23.14
  const ePi = Math.pow(Math.E, Math.PI);
  for (const [mult, label] of [[1e6, 'Million'], [1e7, '10 Million'], [1e8, '100 Million']]) {
    const eventDate = new Date(birthDate.getTime() + ePi * mult * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `e-pi-${mult}`,
        title: `🧮 e^π × ${label} Seconds`,
        description: `You've lived for e^π × ${mult.toLocaleString()} ≈ ${Math.floor(ePi * mult).toLocaleString()} seconds!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Pop culture milestones
  const popCultureMilestones = [
    { value: 42e6, unit: MS_PER_SECOND, label: '42 Million Seconds', icon: '🌌', desc: 'The Answer to Life, the Universe, and Everything!' },
    { value: 1337, unit: MS_PER_DAY, label: '1,337 Days', icon: '🎮', desc: 'You are now officially 1337 (elite)!' },
  ];

  for (const m of popCultureMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * m.unit);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `pop-${m.label.replace(/\s/g, '-')}`,
        title: `${m.icon} ${m.label}`,
        description: m.desc,
        date: eventDate,
        category: 'popculture'
      });
    }
  }

  // Nerdy holidays (Pi Day, May 4th, Tau Day)
  const nerdyHolidays = [
    { month: 2, day: 14, name: 'Pi Day', icon: '🥧', desc: 'March 14 (3.14)' },
    { month: 4, day: 4, name: 'May the 4th', icon: '⚔️', desc: 'Star Wars Day' },
    { month: 5, day: 28, name: 'Tau Day', icon: '🌀', desc: 'June 28 (τ ≈ 6.28)' }
  ];
  const maxYears = 120;

  for (const holiday of nerdyHolidays) {
    for (let year = 1; year <= maxYears; year++) {
      const holidayDate = new Date(
        birthDate.getFullYear() + year,
        holiday.month,
        holiday.day,
        birthDate.getHours(),
        birthDate.getMinutes()
      );
      if (holidayDate > birthDate && holidayDate <= maxDate && holidayDate > now) {
        const ordinal = getOrdinal(year);
        events.push({
          id: `${holiday.name.toLowerCase().replace(/\s/g, '-')}-${year}`,
          title: `${holiday.icon} ${ordinal} ${holiday.name}`,
          description: `Your ${ordinal} ${holiday.name}! (${holiday.desc})`,
          date: holidayDate,
          category: 'popculture'
        });
      }
    }
  }

  // Earth birthdays with special labels
  const maxBirthdayYears = 120;
  const primes = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113]);
  const squares = { 4: '2²', 9: '3²', 16: '4²', 25: '5²', 36: '6²', 49: '7²', 64: '8²', 81: '9²', 100: '10²' };
  const powersOf2 = { 2: '2¹', 4: '2²', 8: '2³', 16: '2⁴', 32: '2⁵', 64: '2⁶' };
  const cubes = { 8: '2³', 27: '3³', 64: '4³' };
  const hexRound = { 16: '0x10', 32: '0x20', 48: '0x30', 64: '0x40', 80: '0x50', 96: '0x60', 112: '0x70' };

  for (let year = 1; year <= maxBirthdayYears; year++) {
    const birthdayDate = new Date(
      birthDate.getFullYear() + year,
      birthDate.getMonth(),
      birthDate.getDate(),
      birthDate.getHours(),
      birthDate.getMinutes()
    );
    if (birthdayDate > birthDate && birthdayDate <= maxDate && birthdayDate > now) {
      const ordinal = getOrdinal(year);

      // Build special labels
      const labels = [];
      if (year === 42) labels.push('The Answer!');
      if (primes.has(year)) labels.push('Prime');
      if (squares[year]) labels.push(`Perfect Square (${squares[year]})`);
      if (powersOf2[year]) labels.push(`Power of 2 (${powersOf2[year]})`);
      if (cubes[year]) labels.push(`Perfect Cube (${cubes[year]})`);
      if (hexRound[year]) labels.push(`Hex Round (${hexRound[year]})`);

      const specialLabel = labels.length > 0 ? ` — ${labels.join(', ')}` : '';

      events.push({
        id: `earth-birthday-${year}`,
        title: `🎂 ${ordinal} Birthday`,
        description: `Happy ${ordinal} birthday on Earth!${specialLabel}`,
        date: birthdayDate,
        category: 'planetary'
      });
    }
  }

  // Sort by date
  events.sort((a, b) => a.date - b.date);

  return events;
}

// ============================================================================
// ICAL GENERATION
// ============================================================================

function generateICal(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nerdiversary//Nerdy Anniversaries//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nerdiversaries',
    'X-WR-CALDESC:Your nerdy anniversary milestones',
  ];

  for (const event of events) {
    const dateStr = formatICalDate(event.date);
    const uid = `${event.id}@nerdiversary.com`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${dateStr}`);
    lines.push(`DTEND:${dateStr}`);
    lines.push(`SUMMARY:${escapeICalText(event.title)}`);
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    lines.push(`CATEGORIES:${event.category}`);
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Tomorrow: ${escapeICalText(event.title)}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function formatICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICalText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Export for Node.js testing (ignored by Cloudflare Workers)
if (typeof module !== 'undefined' && module.exports) {
  module.exports.calculateNerdiversaries = calculateNerdiversaries;
  module.exports.MS_PER_SECOND = MS_PER_SECOND;
  module.exports.MS_PER_MINUTE = MS_PER_MINUTE;
  module.exports.MS_PER_HOUR = MS_PER_HOUR;
  module.exports.MS_PER_DAY = MS_PER_DAY;
  module.exports.MS_PER_WEEK = MS_PER_WEEK;
  module.exports.MS_PER_YEAR = MS_PER_YEAR;
  module.exports.PLANETS = PLANETS;
  module.exports.FIBONACCI = FIBONACCI;
  module.exports.LUCAS = LUCAS;
  module.exports.TRIANGULAR = TRIANGULAR;
  module.exports.PALINDROMES = PALINDROMES;
  module.exports.REPUNITS = REPUNITS;
  module.exports.PI = PI;
  module.exports.E = E;
  module.exports.PHI = PHI;
  module.exports.TAU = TAU;
}
