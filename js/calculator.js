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

// Helper to create Wikipedia link HTML
function wikiLink(key, text) {
    const url = Milestones.WIKI_URLS[key];
    return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
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
        this._addSpeedOfLightMilestones(birthDate, addEvent);
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
            for (let yearNum = 1; yearNum <= Milestones.MAX_PLANETARY_YEARS; yearNum++) {
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
                    description: `You've lived for exactly 2${Milestones.toSuperscript(power)} = ${value.toLocaleString()} seconds!`,
                    date: eventDate,
                    category: 'binary',
                    icon: '💻',
                    milestone: `2^${power} seconds`
                });
            }
        }

        // Powers of 2 in minutes
        for (const power of Milestones.MINUTE_POWERS) {
            const value = Math.pow(2, power);
            addEvent({
                id: `binary-minutes-${power}`,
                title: `2^${power} Minutes`,
                description: `You've lived for exactly 2${Milestones.toSuperscript(power)} = ${value.toLocaleString()} minutes!`,
                date: new Date(birthDate.getTime() + value * Milestones.MS_PER_MINUTE),
                category: 'binary',
                icon: '🔟',
                milestone: `2^${power} minutes`
            });
        }

        // Hexadecimal milestones
        for (const m of Milestones.HEX_MILESTONES) {
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
                            description: `You've lived for ${base}${Milestones.toSuperscript(power)} = ${value.toLocaleString()} ${unit} (${wikiLink(name, name)})!`,
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

    _addSequenceMilestones(birthDate, addEvent, config) {
        const { sequence, indexMap, idPrefix, name, wikiKey, icon, indexLabel } = config;
        const units = [
            { filter: n => n >= 1e6 && n <= 3e9, ms: Milestones.MS_PER_SECOND, unit: 'seconds', label: 'Second' },
            { filter: n => n >= 1e5 && n <= 5e7, ms: Milestones.MS_PER_MINUTE, unit: 'minutes', label: 'Minute' },
            { filter: n => n >= 10000 && n <= 1000000, ms: Milestones.MS_PER_HOUR, unit: 'hours', label: 'Hour' },
            { filter: n => n >= 100 && n <= 40000, ms: Milestones.MS_PER_DAY, unit: 'days', label: 'Day' }
        ];

        for (const { filter, ms, unit, label } of units) {
            for (const num of sequence.filter(filter)) {
                const idx = indexMap.get(num);
                addEvent({
                    id: `${idPrefix}-${unit}-${num}`,
                    title: `${name} ${label} ${num.toLocaleString()}`,
                    description: `${label} ${num.toLocaleString()} is a ${wikiLink(wikiKey, `${name} number`)}!`,
                    date: new Date(birthDate.getTime() + num * ms),
                    category: 'fibonacci',
                    icon,
                    milestone: `${indexLabel}(${idx}) = ${num.toLocaleString()} ${unit}`
                });
            }
        }
    },

    _addFibonacciMilestones(birthDate, addEvent) {
        this._addSequenceMilestones(birthDate, addEvent, {
            sequence: Milestones.FIBONACCI,
            indexMap: Milestones.FIBONACCI_INDEX,
            idPrefix: 'fib',
            name: 'Fibonacci',
            wikiKey: 'fibonacci',
            icon: '🌀',
            indexLabel: 'F'
        });
    },

    _addLucasMilestones(birthDate, addEvent) {
        this._addSequenceMilestones(birthDate, addEvent, {
            sequence: Milestones.LUCAS,
            indexMap: Milestones.LUCAS_INDEX,
            idPrefix: 'lucas',
            name: 'Lucas',
            wikiKey: 'lucas',
            icon: '🔷',
            indexLabel: 'L'
        });
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
        for (const perfect of Milestones.PERFECT_HOUR_NUMBERS) {
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
        const interestingSet = new Set(Milestones.INTERESTING_TRIANGULAR);
        const interesting = Milestones.TRIANGULAR.filter((t, i) =>
            (i + 1) % 10 === 0 || interestingSet.has(t)
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
        const interestingSet = new Set(Milestones.INTERESTING_PALINDROME_DAYS);
        const interestingPals = Milestones.PALINDROMES.filter(p =>
            p >= 1000 && p <= 15000 && (
                p % 1111 === 0 ||
                String(p).split('').every((c, i, a) => c === a[0]) ||
                interestingSet.has(p)
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
        for (const pal of Milestones.PALINDROME_HOURS) {
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
        // Speed of light multiples (c = 299,792,458 m/s)
        for (let mult = 1; mult <= Milestones.SPEED_OF_LIGHT_MAX_MULTIPLE; mult++) {
            const seconds = Milestones.SPEED_OF_LIGHT * mult;
            const label = mult === 1 ? 'c' : `${mult}c`;
            addEvent({
                id: `speed-of-light-${mult}x`,
                title: `${label} Seconds`,
                description: mult === 1
                    ? `You've lived for ${seconds.toLocaleString()} seconds - the ${wikiLink('speedOfLight', 'speed of light')} in m/s!`
                    : `You've lived for ${mult} × the speed of light = ${seconds.toLocaleString()} seconds!`,
                date: new Date(birthDate.getTime() + seconds * Milestones.MS_PER_SECOND),
                category: 'scientific',
                icon: '💡',
                milestone: `${label} seconds`
            });
        }

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

    _addSpeedOfLightMilestones(birthDate, addEvent) {
        // Calculate when you've "traveled" to cosmic destinations at light speed
        // Distance = age in seconds × speed of light
        // So: seconds needed = distance / speed of light

        for (const [key, dest] of Object.entries(Milestones.COSMIC_DISTANCES)) {
            const secondsNeeded = dest.meters / Milestones.SPEED_OF_LIGHT;
            const eventDate = new Date(birthDate.getTime() + secondsNeeded * Milestones.MS_PER_SECOND);

            // Format the distance nicely
            let distanceStr;
            if (dest.meters >= Milestones.DISTANCE_THRESHOLD_LIGHT_YEAR) {
                distanceStr = `${(dest.meters / Milestones.METERS_PER_LIGHT_YEAR).toFixed(2)} light-years`;
            } else if (dest.meters >= Milestones.DISTANCE_THRESHOLD_TRILLION_KM) {
                distanceStr = `${(dest.meters / Milestones.DISTANCE_THRESHOLD_TRILLION_KM).toFixed(1)} trillion km`;
            } else if (dest.meters >= Milestones.DISTANCE_THRESHOLD_BILLION_KM) {
                distanceStr = `${(dest.meters / Milestones.DISTANCE_THRESHOLD_BILLION_KM).toFixed(1)} billion km`;
            } else {
                distanceStr = `${(dest.meters / Milestones.DISTANCE_THRESHOLD_MILLION_KM).toFixed(0)} million km`;
            }

            // Use key directly - WIKI_URLS keys match COSMIC_DISTANCES keys
            const destLink = wikiLink(key, dest.name);

            addEvent({
                id: `lightspeed-${key}`,
                title: `Light Speed to ${dest.name}`,
                description: `If you traveled at the ${wikiLink('speedOfLight', 'speed of light')} since birth, you'd have reached ${destLink} (${distanceStr} away)!`,
                date: eventDate,
                category: 'scientific',
                icon: dest.icon,
                milestone: `c × age = ${dest.name}`
            });
        }

        // Also add some clean multiples of light-time units
        for (const unit of Milestones.LIGHT_TIME_UNITS) {
            const unitLink = wikiLink(unit.wikiKey, unit.name.toLowerCase());
            addEvent({
                id: `lightspeed-${unit.seconds}s`,
                title: unit.name,
                description: `At age ${unit.seconds.toLocaleString()} seconds, you've lived long enough for light to travel ${unitLink} - ${unit.desc}!`,
                date: new Date(birthDate.getTime() + unit.seconds * Milestones.MS_PER_SECOND),
                category: 'scientific',
                icon: '💡',
                milestone: unit.name
            });
        }
    },

    _buildEarthBirthdayEvent(year, birthdayDate) {
        const ordinal = Milestones.getOrdinal(year);
        const labels = [];

        if (year === 42) { labels.push(`${wikiLink('answer42', 'The Answer')}! 🌌`); }
        if (Milestones.primeAges.has(year)) { labels.push('Prime'); }
        if (Milestones.squareAges[year]) { labels.push(`Perfect Square (${Milestones.squareAges[year]})`); }
        if (Milestones.powerOf2Ages[year]) { labels.push(`Power of 2 (${Milestones.powerOf2Ages[year]})`); }
        if (Milestones.cubeAges[year]) { labels.push(`Perfect Cube (${Milestones.cubeAges[year]})`); }
        if (Milestones.hexRoundAges[year]) { labels.push(`Hex Round (${Milestones.hexRoundAges[year]})`); }

        const specialLabel = labels.length > 0 ? ` — ${labels.join(', ')}` : '';

        return {
            id: `earth-birthday-${year}`,
            title: `${ordinal} Birthday`,
            description: `Happy ${ordinal} birthday on Earth!${specialLabel}`,
            date: birthdayDate,
            category: 'planetary',
            icon: '🎂',
            milestone: `${year} Earth years`
        };
    },

    _buildNerdyHolidayEvent(holiday, holidayDate) {
        const linkText = holiday.wikiKey ? wikiLink(holiday.wikiKey, holiday.name) : holiday.name;
        return {
            id: `${holiday.name.toLowerCase().replace(/\s/g, '-')}-${holidayDate.getFullYear()}`,
            title: `${holiday.name} ${holidayDate.getFullYear()}`,
            description: `${linkText}! (${holiday.desc})`,
            date: holidayDate,
            category: 'pop-culture',
            icon: holiday.icon,
            milestone: holiday.name,
            isSharedHoliday: true
        };
    },

    /**
     * Get calendar-based events at a specific time for a given birth date.
     * Used by the worker to build events from the same source of truth as the website.
     * @param {Date} birthDate - The person's birth date/time
     * @param {Date} eventTime - The time to check for events
     * @returns {Array} Matching calendar events (earth birthdays + nerdy holidays)
     */
    getCalendarEventsAt(birthDate, eventTime) {
        const events = [];

        // Calendar events always fire at the birth hour:minute
        if (eventTime.getHours() !== birthDate.getHours() ||
            eventTime.getMinutes() !== birthDate.getMinutes()) {
            return events;
        }

        // Earth birthday: same month+day as birth, future year
        if (eventTime.getMonth() === birthDate.getMonth() &&
            eventTime.getDate() === birthDate.getDate()) {
            const year = eventTime.getFullYear() - birthDate.getFullYear();
            if (year > 0 && year <= Milestones.MAX_YEARS) {
                events.push(this._buildEarthBirthdayEvent(year, eventTime));
            }
        }

        // Nerdy holidays
        for (const holiday of Milestones.nerdyHolidays) {
            if (holiday.month === eventTime.getMonth() &&
                holiday.day === eventTime.getDate()) {
                events.push(this._buildNerdyHolidayEvent(holiday, eventTime));
            }
        }

        return events;
    },

    _addNerdyHolidays(birthDate, maxDate, addEvent) {
        for (const holiday of Milestones.nerdyHolidays) {
            for (let year = 1; year <= Milestones.MAX_YEARS; year++) {
                const holidayDate = new Date(
                    birthDate.getFullYear() + year,
                    holiday.month,
                    holiday.day,
                    birthDate.getHours(),
                    birthDate.getMinutes()
                );

                if (holidayDate > birthDate && holidayDate <= maxDate) {
                    addEvent(this._buildNerdyHolidayEvent(holiday, holidayDate));
                }
            }
        }
    },

    _addEarthBirthdays(birthDate, maxDate, addEvent) {
        for (let year = 1; year <= Milestones.MAX_YEARS; year++) {
            const birthdayDate = new Date(
                birthDate.getFullYear() + year,
                birthDate.getMonth(),
                birthDate.getDate(),
                birthDate.getHours(),
                birthDate.getMinutes()
            );

            if (birthdayDate > birthDate && birthdayDate <= maxDate) {
                addEvent(this._buildEarthBirthdayEvent(year, birthdayDate));
            }
        }
    }
};

// ESM export
export default Calculator;
