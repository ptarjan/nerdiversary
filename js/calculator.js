/**
 * Shared Nerdiversary Calculator
 * Core logic for calculating milestone events, used by both website and worker
 *
 * In browser: Requires js/milestones.js to be loaded first
 * In ESM: Milestones is imported below
 */

// ESM import
import MilestonesModule from './milestones.js';

// Use global version if available (browser), otherwise use imported module
const Milestones = typeof window !== 'undefined' && window.Milestones ? window.Milestones : MilestonesModule;

// Wikipedia URLs for educational terms
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
    mercury: 'https://en.wikipedia.org/wiki/Mercury_(planet)#Orbit,_rotation,_and_longitude',
    venus: 'https://en.wikipedia.org/wiki/Venus#Orbit_and_rotation',
    mars: 'https://en.wikipedia.org/wiki/Mars#Orbit_and_rotation',
    jupiter: 'https://en.wikipedia.org/wiki/Jupiter#Orbit_and_rotation',
    saturn: 'https://en.wikipedia.org/wiki/Saturn#Orbit_and_rotation',
    uranus: 'https://en.wikipedia.org/wiki/Uranus#Orbit_and_rotation',
    neptune: 'https://en.wikipedia.org/wiki/Neptune#Orbit_and_rotation',
};

// Helper to create Wikipedia link HTML
function wikiLink(key, text) {
    const url = WIKI_URLS[key];
    return url ? `<a href="${url}" target="_blank">${text}</a>` : text;
}

const Calculator = {
    /**
     * Calculate all nerdiversary milestones
     * @param {Date} birthDate - The birth date/time
     * @param {Object} options - Configuration options
     * @param {number} options.yearsAhead - How many years ahead (default 100)
     * @param {boolean} options.includePast - Include past events (default true)
     * @param {function} options.transformEvent - Optional hook to transform events
     * @returns {Array} Array of milestone events
     */
    calculate(birthDate, options = {}) {
        const {
            yearsAhead = 100,
            includePast = true,
            transformEvent = null
        } = options;

        const now = new Date();
        const maxDate = new Date(birthDate.getTime() + yearsAhead * Milestones.MS_PER_YEAR);
        const events = [];

        // Helper to add events with optional filtering and transformation
        const addEvent = event => {
            if (event.date > maxDate) { return; }
            if (!includePast && event.date < now) { return; }

            const finalEvent = transformEvent ? transformEvent(event) : event;
            if (finalEvent) { events.push(finalEvent); }
        };

        // Generate all milestone types
        this._addPlanetaryYears(birthDate, maxDate, addEvent);
        this._addDecimalMilestones(birthDate, addEvent);
        this._addBinaryMilestones(birthDate, addEvent);
        this._addMathMilestones(birthDate, addEvent);
        this._addFibonacciMilestones(birthDate, addEvent);
        this._addLucasMilestones(birthDate, addEvent);
        this._addPerfectNumberMilestones(birthDate, addEvent);
        this._addTriangularMilestones(birthDate, addEvent);
        this._addPalindromeMilestones(birthDate, addEvent);
        this._addRepunitMilestones(birthDate, addEvent);
        this._addScientificMilestones(birthDate, addEvent);
        this._addPopCultureMilestones(birthDate, addEvent);
        this._addNerdyHolidays(birthDate, maxDate, addEvent);
        this._addEarthBirthdays(birthDate, maxDate, addEvent);

        // Sort by date
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        return events;
    },

    // =========================================================================
    // MILESTONE GENERATORS
    // =========================================================================

    _addPlanetaryYears(birthDate, maxDate, addEvent) {
        for (const [key, planet] of Object.entries(Milestones.PLANETS)) {
            const periodMs = planet.days * Milestones.MS_PER_DAY;
            for (let yearNum = 1; yearNum <= 200; yearNum++) {
                const eventDate = new Date(birthDate.getTime() + yearNum * periodMs);
                if (eventDate > maxDate) { break; }

                addEvent({
                    id: `${key}-${yearNum}`,
                    title: `${planet.name} Year ${yearNum}`,
                    description: `You've completed ${yearNum} orbit${yearNum > 1 ? 's' : ''} around the Sun as measured from ${wikiLink(key, planet.name)}!`,
                    date: eventDate,
                    category: 'planetary',
                    icon: planet.icon,
                    planet: planet.name
                });
            }
        }
    },

    _addDecimalMilestones(birthDate, addEvent) {
        // Seconds
        for (const m of Milestones.secondMilestones) {
            addEvent({
                id: `seconds-${m.value}`,
                title: m.label,
                description: `You've been alive for exactly ${m.short}!`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_SECOND),
                category: 'decimal',
                icon: '🔢',
                milestone: m.short
            });
        }

        // Minutes
        for (const m of Milestones.minuteMilestones) {
            addEvent({
                id: `minutes-${m.value}`,
                title: m.label,
                description: `You've experienced exactly ${m.short}!`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_MINUTE),
                category: 'decimal',
                icon: '⏱️',
                milestone: m.short
            });
        }

        // Hours
        for (const m of Milestones.hourMilestones) {
            const extra = m.value === 10000 ? ` You've mastered life according to the ${wikiLink('tenKHours', '10,000-hour rule')}!` : '';
            addEvent({
                id: `hours-${m.value}`,
                title: m.label,
                description: `You've lived for exactly ${m.short}!${extra}`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_HOUR),
                category: 'decimal',
                icon: '⏰',
                milestone: m.short
            });
        }

        // Days
        for (const m of Milestones.dayMilestones) {
            addEvent({
                id: `days-${m.value}`,
                title: m.label,
                description: `You've experienced ${m.short} on Earth!`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_DAY),
                category: 'decimal',
                icon: '📆',
                milestone: m.short
            });
        }

        // Weeks
        for (const m of Milestones.weekMilestones) {
            addEvent({
                id: `weeks-${m.value}`,
                title: m.label,
                description: `You've lived for ${m.short}!`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_WEEK),
                category: 'decimal',
                icon: '📅',
                milestone: m.short
            });
        }

        // Months
        for (const m of Milestones.monthMilestones) {
            addEvent({
                id: `months-${m.value}`,
                title: m.label,
                description: `You've experienced ${m.short} of life!`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_MONTH),
                category: 'decimal',
                icon: '🗓️',
                milestone: m.short
            });
        }
    },

    _addBinaryMilestones(birthDate, addEvent) {
        // Powers of 2 in seconds
        for (const power of Milestones.POWERS_OF_2) {
            const value = Math.pow(2, power);
            const eventDate = new Date(birthDate.getTime() + value * Milestones.MS_PER_SECOND);
            if (eventDate > birthDate) {
                addEvent({
                    id: `binary-seconds-${power}`,
                    title: `2^${power} Seconds`,
                    description: `You've lived for exactly 2${this._toSuperscript(power)} = ${value.toLocaleString()} seconds!`,
                    date: eventDate,
                    category: 'binary',
                    icon: '💻',
                    milestone: `2^${power} seconds`
                });
            }
        }

        // Powers of 2 in minutes
        const minutePowers = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
        for (const power of minutePowers) {
            const value = Math.pow(2, power);
            addEvent({
                id: `binary-minutes-${power}`,
                title: `2^${power} Minutes`,
                description: `You've lived for exactly 2${this._toSuperscript(power)} = ${value.toLocaleString()} minutes!`,
                date: new Date(birthDate.getTime() + value * Milestones.MS_PER_MINUTE),
                category: 'binary',
                icon: '🔟',
                milestone: `2^${power} minutes`
            });
        }

        // Hexadecimal milestones
        const hexMilestones = [
            { value: 0x100000, hex: '0x100000' },
            { value: 0x1000000, hex: '0x1000000' },
            { value: 0xFFFFFF, hex: '0xFFFFFF' },
            { value: 0x10000000, hex: '0x10000000' },
            { value: 0xDEADBEEF, hex: '0xDEADBEEF' }
        ];
        for (const m of hexMilestones) {
            addEvent({
                id: `hex-${m.hex}`,
                title: `${m.hex} Seconds`,
                description: `You've lived for ${m.hex} (${m.value.toLocaleString()}) seconds!`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_SECOND),
                category: 'binary',
                icon: '🔢',
                milestone: `${m.hex} seconds`
            });
        }

        // All number base milestones
        for (const { base, name, icon, units } of Milestones.baseMilestones) {
            for (const { powers, unit, ms } of units) {
                for (const power of powers) {
                    const value = Math.pow(base, power);
                    const eventDate = new Date(birthDate.getTime() + value * ms);
                    if (eventDate > birthDate) {
                        addEvent({
                            id: `base${base}-${power}-${unit}`,
                            title: `${base}^${power} ${unit.charAt(0).toUpperCase() + unit.slice(1)}`,
                            description: `You've lived for ${base}${this._toSuperscript(power)} = ${value.toLocaleString()} ${unit} (${wikiLink(name, name)})!`,
                            date: eventDate,
                            category: 'binary',
                            icon,
                            milestone: `${base}^${power} ${unit}`
                        });
                    }
                }
            }
        }
    },

    _addMathMilestones(birthDate, addEvent) {
        const constants = [
            { symbol: 'π', value: Milestones.PI, name: 'pi', text: 'π' },
            { symbol: 'e', value: Milestones.E, name: 'e', text: 'e' },
            { symbol: 'φ', value: Milestones.PHI, name: 'phi', text: 'golden ratio' },
            { symbol: 'τ', value: Milestones.TAU, name: 'tau', text: 'τ (2π)' }
        ];

        const multipliers = [1e7, 1e8, 1e9];

        for (const c of constants) {
            for (const mult of multipliers) {
                if (c.name === 'tau' && mult === 1e9) { continue; } // Too far in future
                const superscriptMap = { 1e7: '⁷', 1e8: '⁸', 1e9: '⁹' };
                const superMult = superscriptMap[mult];
                const label = `${c.symbol} × 10${superMult} Seconds`;

                addEvent({
                    id: `${c.name}-${mult}`,
                    title: label,
                    description: `You've lived for ${wikiLink(c.name, c.text)} × ${mult.toExponential(0)} ≈ ${Math.floor(c.value * mult).toLocaleString()} seconds!`,
                    date: new Date(birthDate.getTime() + c.value * mult * Milestones.MS_PER_SECOND),
                    category: 'mathematical',
                    icon: c.symbol,
                    milestone: label
                });
            }
        }
    },

    _addFibonacciMilestones(birthDate, addEvent) {
        const units = [
            { filter: n => n >= 1e6 && n <= 3e9, ms: Milestones.MS_PER_SECOND, unit: 'seconds', label: 'Second' },
            { filter: n => n >= 1e5 && n <= 5e7, ms: Milestones.MS_PER_MINUTE, unit: 'minutes', label: 'Minute' },
            { filter: n => n >= 10000 && n <= 1000000, ms: Milestones.MS_PER_HOUR, unit: 'hours', label: 'Hour' },
            { filter: n => n >= 100 && n <= 40000, ms: Milestones.MS_PER_DAY, unit: 'days', label: 'Day' }
        ];

        for (const { filter, ms, unit, label } of units) {
            for (const fib of Milestones.FIBONACCI.filter(filter)) {
                const idx = Milestones.FIBONACCI_INDEX.get(fib);
                addEvent({
                    id: `fib-${unit}-${fib}`,
                    title: `Fibonacci ${label} ${fib.toLocaleString()}`,
                    description: `${label} ${fib.toLocaleString()} is a ${wikiLink('fibonacci', 'Fibonacci number')}!`,
                    date: new Date(birthDate.getTime() + fib * ms),
                    category: 'fibonacci',
                    icon: '🌀',
                    milestone: `F(${idx}) = ${fib.toLocaleString()} ${unit}`
                });
            }
        }
    },

    _addLucasMilestones(birthDate, addEvent) {
        const units = [
            { filter: n => n >= 1e6 && n <= 3e9, ms: Milestones.MS_PER_SECOND, unit: 'seconds', label: 'Second' },
            { filter: n => n >= 1e5 && n <= 5e7, ms: Milestones.MS_PER_MINUTE, unit: 'minutes', label: 'Minute' },
            { filter: n => n >= 10000 && n <= 1000000, ms: Milestones.MS_PER_HOUR, unit: 'hours', label: 'Hour' },
            { filter: n => n >= 100 && n <= 40000, ms: Milestones.MS_PER_DAY, unit: 'days', label: 'Day' }
        ];

        for (const { filter, ms, unit, label } of units) {
            for (const luc of Milestones.LUCAS.filter(filter)) {
                const idx = Milestones.LUCAS_INDEX.get(luc);
                addEvent({
                    id: `lucas-${unit}-${luc}`,
                    title: `Lucas ${label} ${luc.toLocaleString()}`,
                    description: `${label} ${luc.toLocaleString()} is a ${wikiLink('lucas', 'Lucas number')}!`,
                    date: new Date(birthDate.getTime() + luc * ms),
                    category: 'fibonacci',
                    icon: '🔷',
                    milestone: `L(${idx}) = ${luc.toLocaleString()} ${unit}`
                });
            }
        }
    },

    _addPerfectNumberMilestones(birthDate, addEvent) {
        // Perfect number days
        for (const perfect of Milestones.PERFECT_NUMBERS) {
            addEvent({
                id: `perfect-days-${perfect}`,
                title: `Perfect Day ${perfect}`,
                description: `Day ${perfect} is a ${wikiLink('perfect', 'perfect number')}! (${perfect} = sum of its divisors)`,
                date: new Date(birthDate.getTime() + perfect * Milestones.MS_PER_DAY),
                category: 'mathematical',
                icon: '💎',
                milestone: `${perfect} days (perfect number)`
            });
        }

        // Perfect number hours for larger ones
        for (const perfect of [496, 8128]) {
            addEvent({
                id: `perfect-hours-${perfect}`,
                title: `Perfect Hour ${perfect.toLocaleString()}`,
                description: `Hour ${perfect.toLocaleString()} is a ${wikiLink('perfect', 'perfect number')}!`,
                date: new Date(birthDate.getTime() + perfect * Milestones.MS_PER_HOUR),
                category: 'mathematical',
                icon: '💎',
                milestone: `${perfect.toLocaleString()} hours (perfect number)`
            });
        }
    },

    _addTriangularMilestones(birthDate, addEvent) {
        // Interesting triangular numbers
        const interesting = Milestones.TRIANGULAR.filter((t, i) =>
            (i + 1) % 10 === 0 ||
            t === 666 || t === 5050 || t === 1225 || t === 2016 ||
            t === 3003 || t === 5778 || t === 8128
        );

        for (const tri of interesting) {
            if (tri >= 100 && tri <= 15000) {
                const n = Math.round((-1 + Math.sqrt(1 + 8 * tri)) / 2);
                addEvent({
                    id: `triangular-days-${tri}`,
                    title: `Triangular Day ${tri.toLocaleString()}`,
                    description: `Day ${tri.toLocaleString()} is ${wikiLink('triangular', 'triangular')}! (1+2+3+...+${n} = ${tri})`,
                    date: new Date(birthDate.getTime() + tri * Milestones.MS_PER_DAY),
                    category: 'mathematical',
                    icon: '🔺',
                    milestone: `T(${n}) = ${tri.toLocaleString()} days`
                });
            }
        }

        // Triangular hours
        const triangularHours = Milestones.TRIANGULAR.filter(t =>
            t >= 10000 && t <= 100000 && Milestones.TRIANGULAR_INDEX.get(t) % 5 === 0
        );
        for (const tri of triangularHours) {
            const n = Math.round((-1 + Math.sqrt(1 + 8 * tri)) / 2);
            addEvent({
                id: `triangular-hours-${tri}`,
                title: `Triangular Hour ${tri.toLocaleString()}`,
                description: `Hour ${tri.toLocaleString()} is ${wikiLink('triangular', 'triangular')}! (1+2+...+${n})`,
                date: new Date(birthDate.getTime() + tri * Milestones.MS_PER_HOUR),
                category: 'mathematical',
                icon: '🔺',
                milestone: `T(${n}) = ${tri.toLocaleString()} hours`
            });
        }
    },

    _addPalindromeMilestones(birthDate, addEvent) {
        // Palindrome days
        const interestingPals = Milestones.PALINDROMES.filter(p =>
            p >= 1000 && p <= 15000 && (
                p % 1111 === 0 ||
                String(p).split('').every((c, i, a) => c === a[0]) ||
                [1001, 1221, 1331, 1441, 2112, 2552, 3003, 5005, 5775, 7007, 7337, 9009,
                 10001, 10101, 11011, 11111, 12321, 12921].includes(p)
            )
        );

        for (const pal of interestingPals) {
            addEvent({
                id: `palindrome-days-${pal}`,
                title: `Palindrome Day ${pal.toLocaleString()}`,
                description: `Day ${pal} is a ${wikiLink('palindrome', 'palindrome')} - reads the same forwards and backwards!`,
                date: new Date(birthDate.getTime() + pal * Milestones.MS_PER_DAY),
                category: 'mathematical',
                icon: '🪞',
                milestone: `${pal} days (palindrome)`
            });
        }

        // Palindrome hours
        const palindromeHours = [10001, 10101, 10201, 11011, 11111, 11211, 12021, 12121, 12221, 12321];
        for (const pal of palindromeHours) {
            addEvent({
                id: `palindrome-hours-${pal}`,
                title: `Palindrome Hour ${pal.toLocaleString()}`,
                description: `Hour ${pal.toLocaleString()} is a ${wikiLink('palindrome', 'palindrome')}!`,
                date: new Date(birthDate.getTime() + pal * Milestones.MS_PER_HOUR),
                category: 'mathematical',
                icon: '🪞',
                milestone: `${pal.toLocaleString()} hours (palindrome)`
            });
        }
    },

    _addRepunitMilestones(birthDate, addEvent) {
        const units = [
            { filter: r => r >= 111 && r <= 11111, ms: Milestones.MS_PER_DAY, unit: 'days' },
            { filter: r => r >= 1111 && r <= 111111, ms: Milestones.MS_PER_HOUR, unit: 'hours' },
            { filter: r => r >= 111111 && r <= 11111111, ms: Milestones.MS_PER_MINUTE, unit: 'minutes' },
            { filter: r => r >= 11111111 && r <= 1111111111, ms: Milestones.MS_PER_SECOND, unit: 'seconds' }
        ];

        for (const { filter, ms, unit } of units) {
            for (const rep of Milestones.REPUNITS.filter(filter)) {
                addEvent({
                    id: `repunit-${unit}-${rep}`,
                    title: `Repunit ${unit.charAt(0).toUpperCase() + unit.slice(1, -1)} ${rep.toLocaleString()}`,
                    description: `${unit.charAt(0).toUpperCase() + unit.slice(1, -1)} ${rep.toLocaleString()} is a ${wikiLink('repunit', 'repunit')} (all 1s)!`,
                    date: new Date(birthDate.getTime() + rep * ms),
                    category: 'binary',
                    icon: '1️⃣',
                    milestone: `${rep.toLocaleString()} ${unit} (repunit)`
                });
            }
        }
    },

    _addScientificMilestones(birthDate, addEvent) {
        // Speed of light
        const speedOfLight = 299792458;
        addEvent({
            id: 'speed-of-light-seconds',
            title: 'Speed of Light Seconds',
            description: `You've lived for ${speedOfLight.toLocaleString()} seconds - the ${wikiLink('speedOfLight', 'speed of light')} in m/s!`,
            date: new Date(birthDate.getTime() + speedOfLight * Milestones.MS_PER_SECOND),
            category: 'mathematical',
            icon: '💡',
            milestone: `c = ${speedOfLight.toLocaleString()} seconds`
        });

        // e^π milestones
        const ePi = Math.pow(Math.E, Math.PI);
        const multipliers = [[1e6, 'Million'], [1e7, '10 Million'], [1e8, '100 Million']];
        for (const [mult, label] of multipliers) {
            addEvent({
                id: `e-pi-${mult}`,
                title: `e^π × ${label} Seconds`,
                description: `You've lived for e^π × ${mult.toLocaleString()} ≈ ${Math.floor(ePi * mult).toLocaleString()} seconds!`,
                date: new Date(birthDate.getTime() + ePi * mult * Milestones.MS_PER_SECOND),
                category: 'mathematical',
                icon: '🧮',
                milestone: `e^π × ${mult.toLocaleString()} seconds`
            });
        }
    },

    _addPopCultureMilestones(birthDate, addEvent) {
        for (const m of Milestones.popCultureMilestones) {
            addEvent({
                id: `pop-${m.label.replace(/[\s,]/g, '-')}`,
                title: m.label,
                description: m.desc,
                date: new Date(birthDate.getTime() + m.value * m.unit),
                category: 'pop-culture',
                icon: m.icon,
                milestone: m.label
            });
        }
    },

    _addNerdyHolidays(birthDate, maxDate, addEvent) {
        const maxYears = 120;

        // Map holiday names to wiki link keys and text
        const holidayLinks = {
            'Pi Day': { key: 'piDay', text: 'Pi Day' },
            'May the 4th': { key: 'starWarsDay', text: 'Star Wars Day' },
            'Tau Day': { key: 'tauDay', text: 'Tau Day' }
        };

        for (const holiday of Milestones.nerdyHolidays) {
            for (let year = 1; year <= maxYears; year++) {
                const holidayDate = new Date(
                    birthDate.getFullYear() + year,
                    holiday.month,
                    holiday.day,
                    birthDate.getHours(),
                    birthDate.getMinutes()
                );

                if (holidayDate > birthDate && holidayDate <= maxDate) {
                    const link = holidayLinks[holiday.name];
                    const linkText = link ? wikiLink(link.key, link.text) : holiday.name;
                    addEvent({
                        id: `${holiday.name.toLowerCase().replace(/\s/g, '-')}-${holidayDate.getFullYear()}`,
                        title: `${holiday.name} ${holidayDate.getFullYear()}`,
                        description: `${linkText}! (${holiday.desc})`,
                        date: holidayDate,
                        category: 'pop-culture',
                        icon: holiday.icon,
                        milestone: holiday.name,
                        isSharedHoliday: true
                    });
                }
            }
        }
    },

    _addEarthBirthdays(birthDate, maxDate, addEvent) {
        const maxYears = 120;

        for (let year = 1; year <= maxYears; year++) {
            const birthdayDate = new Date(
                birthDate.getFullYear() + year,
                birthDate.getMonth(),
                birthDate.getDate(),
                birthDate.getHours(),
                birthDate.getMinutes()
            );

            if (birthdayDate > birthDate && birthdayDate <= maxDate) {
                const ordinal = Milestones.getOrdinal(year);
                const labels = [];

                if (year === 42) { labels.push(`${wikiLink('answer42', 'The Answer')}! 🌌`); }
                if (Milestones.primeAges.has(year)) { labels.push('Prime'); }
                if (Milestones.squareAges[year]) { labels.push(`Perfect Square (${Milestones.squareAges[year]})`); }
                if (Milestones.powerOf2Ages[year]) { labels.push(`Power of 2 (${Milestones.powerOf2Ages[year]})`); }
                if (Milestones.cubeAges[year]) { labels.push(`Perfect Cube (${Milestones.cubeAges[year]})`); }
                if (Milestones.hexRoundAges[year]) { labels.push(`Hex Round (${Milestones.hexRoundAges[year]})`); }

                const specialLabel = labels.length > 0 ? ` — ${labels.join(', ')}` : '';

                addEvent({
                    id: `earth-birthday-${year}`,
                    title: `${ordinal} Birthday`,
                    description: `Happy ${ordinal} birthday on Earth!${specialLabel}`,
                    date: birthdayDate,
                    category: 'planetary',
                    icon: '🎂',
                    milestone: `${year} Earth years`
                });
            }
        }
    },

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    _toSuperscript(num) {
        const superscripts = {
            0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴',
            5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'
        };
        return String(num).split('').map(d => superscripts[d] || d).join('');
    }
};

// ESM export
export default Calculator;
