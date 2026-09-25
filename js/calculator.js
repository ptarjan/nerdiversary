/**
 * Turns a birth date into milestone events, using the tables in
 * js/milestones.js. The website (via js/nerdiversary.js) and the notification
 * worker both call it, so the page and the push schedule always agree.
 *
 * Event descriptions are HTML: they may contain Wikipedia <a> links, and the
 * results page inserts them as markup. The calendar export strips the tags
 * (escapeICalText in js/shared.js).
 */

import Milestones from './milestones.js';

// An <a> to the WIKI_URLS entry for `key`, or plain `text` if there is none
function wikiLink(key, text) {
    const url = Milestones.WIKI_URLS[key];
    return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
}

// The "you've been alive for" phrase: "1,000,000,000 seconds, about 31.7 years".
// Day counts under a year omit the approximation, which would repeat the count.
function alive(value, ms, unit) {
    const count = `${value.toLocaleString()} ${unit}`;
    if (unit === 'days' && value * ms < Milestones.MS_PER_YEAR) { return count; }
    return `${count}, ${Milestones.approxDuration(value * ms)}`;
}

// How long light takes to cover a distance, to a tenth of a second under a
// minute, to the second under an hour and to the minute under a day: "1.3 seconds", "8 minutes 19 seconds",
// "22 hours 14 minutes". Longer spans fall back to approxDuration.
function lightTravelTime(seconds) {
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    if (seconds < 60) { return plural(Math.round(seconds * 10) / 10, 'second'); }
    const whole = Math.round(seconds);
    if (whole < 3600) {
        const [m, s] = [Math.floor(whole / 60), whole % 60];
        return s ? `${plural(m, 'minute')} ${plural(s, 'second')}` : plural(m, 'minute');
    }
    if (whole < 86400) {
        const minutes = Math.round(whole / 60);
        const [h, m] = [Math.floor(minutes / 60), minutes % 60];
        return m ? `${plural(h, 'hour')} ${plural(m, 'minute')}` : plural(h, 'hour');
    }
    return Milestones.approxDuration(seconds * Milestones.MS_PER_SECOND);
}

// =============================================================================
// RARITY TIERS
// legendary: once-or-twice-a-lifetime milestones worth sharing; rare: notable;
// common: everything else. Only the results page reads it (badges, the "Next
// legendary" line, share text), so the sets can be tuned freely. Entries are event
// ids; an id that no generator produces is silently ignored.
// =============================================================================

const LEGENDARY_IDS = new Set([
    'seconds-1000000000', 'seconds-2000000000', 'seconds-3000000000',
    'days-10000', 'days-20000', 'days-30000',
    'weeks-1000', 'weeks-2000', 'weeks-3000',
    'hours-1000000',
    'binary-seconds-30', 'binary-seconds-31', 'binary-seconds-32',
    'pop-42-Million-Seconds',
    'lightspeed-proximaCentauri',
    'jupiter-1', 'saturn-1', 'uranus-1', 'neptune-1',
    'earth-birthday-42', 'earth-birthday-64', 'earth-birthday-100',
    'pi-1000000000', 'e-1000000000', 'phi-1000000000',
]);

const RARE_IDS = new Set([
    'seconds-100000000', 'seconds-500000000', 'seconds-1234567890',
    'days-1000', 'days-5000', 'days-15000', 'days-25000',
    'hours-10000', 'hours-100000',
    'minutes-1000000',
    'weeks-500', 'weeks-1500', 'weeks-2500',
    'months-1000',
    'hex-0xDEADBEEF',
    'pop-1-337-Days',
    'mercury-1', 'venus-1', 'mars-1',
    'lunation-1000',
]);

function classifyRarity(event) {
    if (LEGENDARY_IDS.has(event.id)) { return 'legendary'; }
    if (RARE_IDS.has(event.id)) { return 'rare'; }

    // Earth birthdays with a special mathematical property are rare
    const bday = event.id.match(/^earth-birthday-(\d+)$/);
    if (bday) {
        const year = parseInt(bday[1], 10);
        if (Milestones.primeAges.has(year) || Milestones.squareAges[year] ||
            Milestones.powerOf2Ages[year] || Milestones.cubeAges[year] ||
            Milestones.hexRoundAges[year]) {
            return 'rare';
        }
    }
    return 'common';
}

const Calculator = {
    /**
     * Every milestone event from birth up to birthDate + yearsAhead, sorted by date.
     * Each event is {id, title, description, date, category, icon, milestone,
     * rarity}, plus `planet` on planet birthdays and `isSharedHoliday` on
     * nerdy holidays. `id` does not depend on the wording, so copy edits leave
     * rarity lookups and the results page's per-event buttons intact.
     * @param {Date} birthDate - Birth instant (UTC-based: calendar events use its UTC date and time)
     * @param {Object} [options]
     * @param {number} [options.yearsAhead] - Window length in years, measured from birth (default 100)
     * @param {boolean} [options.includePast] - Keep events before now (default true)
     * @param {?Function} [options.transformEvent] - Called on each event after rarity is set; return the event to keep (possibly changed) or a falsy value to drop it
     * @returns {Array} Milestone events
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

        // Every generator goes through this, so the window and includePast filters apply to all
        const addEvent = event => {
            if (event.date > maxDate) { return; }
            if (!includePast && event.date < now) { return; }

            event.rarity = classifyRarity(event);
            const finalEvent = transformEvent ? transformEvent(event) : event;
            if (finalEvent) { events.push(finalEvent); }
        };

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
        this._addLunationMilestones(birthDate, addEvent);
        this._addFractionalAgeMilestones(birthDate, maxDate, addEvent);
        this._addNerdyHolidays(birthDate, maxDate, addEvent);
        this._addEarthBirthdays(birthDate, maxDate, addEvent);

        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        return events;
    },

    // =========================================================================
    // MILESTONE GENERATORS
    // Each pushes events through addEvent. Generators without a maxDate
    // argument emit their whole table and rely on addEvent to drop anything
    // past the window.
    // =========================================================================

    _addPlanetaryYears(birthDate, maxDate, addEvent) {
        for (const [key, planet] of Object.entries(Milestones.PLANETS)) {
            const periodMs = planet.days * Milestones.MS_PER_DAY;
            for (let yearNum = 1; yearNum <= Milestones.MAX_PLANETARY_YEARS; yearNum++) {
                const eventDate = new Date(birthDate.getTime() + yearNum * periodMs);
                if (eventDate > maxDate) { break; }

                addEvent({
                    id: `${key}-${yearNum}`,
                    title: `${Milestones.getOrdinal(yearNum)} ${planet.name} birthday`,
                    description: `You turn ${yearNum} in ${planet.name} years. ${wikiLink(key, planet.name)} takes ${planet.days.toLocaleString()} Earth days to go around the Sun, so ${yearNum} ${planet.name} year${yearNum > 1 ? 's is' : ' is'} ${Milestones.approxDuration(yearNum * periodMs)} on Earth.`,
                    date: eventDate,
                    category: 'planetary',
                    icon: planet.icon,
                    planet: planet.name
                });
            }
        }
    },

    _addDecimalMilestones(birthDate, addEvent) {
        const groups = [
            { list: Milestones.secondMilestones, ms: Milestones.MS_PER_SECOND, unit: 'seconds', icon: '🔢' },
            { list: Milestones.minuteMilestones, ms: Milestones.MS_PER_MINUTE, unit: 'minutes', icon: '⏱️' },
            { list: Milestones.hourMilestones, ms: Milestones.MS_PER_HOUR, unit: 'hours', icon: '⏰' },
            { list: Milestones.dayMilestones, ms: Milestones.MS_PER_DAY, unit: 'days', icon: '📆' },
            { list: Milestones.weekMilestones, ms: Milestones.MS_PER_WEEK, unit: 'weeks', icon: '📅' },
            {
                list: Milestones.monthMilestones, ms: Milestones.MS_PER_MONTH, unit: 'months', icon: '🗓️',
                note: 'A month here is the average calendar month, 30.44 days.'
            }
        ];
        const tenKHours = `Malcolm Gladwell's book Outliers popularized the ${wikiLink('tenKHours', '10,000-hour rule')}: that much practice makes someone world-class at a skill.`;

        for (const { list, ms, unit, icon, note: groupNote } of groups) {
            for (const m of list) {
                const notes = [m.note, groupNote];
                if (unit === 'hours' && m.value === 10000) { notes.push(tenKHours); }
                addEvent({
                    id: `${unit}-${m.value}`,
                    title: m.label,
                    description: `You've been alive for ${alive(m.value, ms, unit)}.${notes.filter(Boolean).map(n => ` ${n}`).join('')}`,
                    date: new Date(birthDate.getTime() + m.value * ms),
                    category: 'decimal',
                    icon,
                    milestone: m.label
                });
            }
        }
    },

    _addBinaryMilestones(birthDate, addEvent) {
        const binary = `In ${wikiLink('binary', 'binary')} (base 2, the digits computers use)`;

        // Powers of 2 in seconds and minutes
        const powerGroups = [
            { powers: Milestones.POWERS_OF_2, ms: Milestones.MS_PER_SECOND, unit: 'seconds', idUnit: 'seconds', icon: '💻' },
            { powers: Milestones.MINUTE_POWERS, ms: Milestones.MS_PER_MINUTE, unit: 'minutes', idUnit: 'minutes', icon: '🔟' }
        ];
        for (const { powers, ms, unit, idUnit, icon } of powerGroups) {
            for (const power of powers) {
                const value = Math.pow(2, power);
                const sup = Milestones.toSuperscript(power);
                addEvent({
                    id: `binary-${idUnit}-${power}`,
                    title: `2${sup} ${unit} (${value.toLocaleString()})`,
                    description: `You've been alive for 2${sup} = ${alive(value, ms, unit)}. ${binary}, your age in ${unit} is now a 1 followed by ${power} zeros.`,
                    date: new Date(birthDate.getTime() + value * ms),
                    category: 'binary',
                    icon,
                    milestone: `2^${power} ${unit}`
                });
            }
        }

        // Hexadecimal milestones
        for (const m of Milestones.HEX_MILESTONES) {
            addEvent({
                id: `hex-${m.hex}`,
                title: `${m.hex} seconds (${m.value.toLocaleString()})`,
                description: `You've been alive for ${m.hex} seconds, written in ${wikiLink('hexadecimal', 'hexadecimal')} (base 16, digits 0 to 9 then A to F). In everyday numbers that is ${alive(m.value, Milestones.MS_PER_SECOND, 'seconds')}.${m.note ? ` ${m.note}` : ''}`,
                date: new Date(birthDate.getTime() + m.value * Milestones.MS_PER_SECOND),
                category: 'binary',
                icon: '🔢',
                milestone: `${m.hex} seconds`
            });
        }

        // All number base milestones
        for (const { base, name, label, about, icon, units } of Milestones.baseMilestones) {
            for (const { powers, unit, ms } of units) {
                for (const power of powers) {
                    const value = Math.pow(base, power);
                    const sup = Milestones.toSuperscript(power);
                    addEvent({
                        id: `base${base}-${power}-${unit}`,
                        title: `${base}${sup} ${unit} (${value.toLocaleString()})`,
                        description: `You've been alive for ${base}${sup} = ${alive(value, ms, unit)}. Written in ${wikiLink(name, label)} (${about}), that number is a 1 followed by ${power} zeros.`,
                        date: new Date(birthDate.getTime() + value * ms),
                        category: 'binary',
                        icon,
                        milestone: `${base}^${power} ${unit}`
                    });
                }
            }
        }
    },

    _addMathMilestones(birthDate, addEvent) {
        const constants = [
            { symbol: 'π', value: Milestones.PI, name: 'pi', title: 'pi', explain: `${wikiLink('pi', 'π')} ≈ 3.14159 is a circle's circumference divided by its diameter.` },
            { symbol: 'e', value: Milestones.E, name: 'e', title: 'Euler\'s number', explain: `${wikiLink('e', 'e')} ≈ 2.71828 is the base of natural logarithms.` },
            { symbol: 'φ', value: Milestones.PHI, name: 'phi', title: 'golden ratio', explain: `φ ≈ 1.61803 is the ${wikiLink('phi', 'golden ratio')}, the number whose square equals itself plus 1.` },
            { symbol: 'τ', value: Milestones.TAU, name: 'tau', title: 'tau', explain: `${wikiLink('tau', 'τ')} = 2π ≈ 6.28318 is the number of radians in a full circle.` }
        ];

        const multipliers = [1e7, 1e8, 1e9];

        for (const c of constants) {
            for (const mult of multipliers) {
                if (c.name === 'tau' && mult === 1e9) { continue; } // about 199 years, past MAX_YEARS
                const product = `${c.symbol} × 10${Milestones.toSuperscript(Math.log10(mult))}`;
                const label = `${product} seconds (${c.title})`;
                const seconds = c.value * mult;

                addEvent({
                    id: `${c.name}-${mult}`,
                    title: label,
                    description: `You've been alive for ${product} ≈ ${Math.round(seconds).toLocaleString()} seconds, ${Milestones.approxDuration(seconds * Milestones.MS_PER_SECOND)}. ${c.explain}`,
                    date: new Date(birthDate.getTime() + seconds * Milestones.MS_PER_SECOND),
                    category: 'mathematical',
                    icon: c.symbol,
                    milestone: label
                });
            }
        }
    },

    /**
     * Shared body of the Fibonacci and Lucas generators. Each term becomes an
     * event in every unit whose range it falls in (seconds 1e6-3e9, minutes
     * 1e5-5e7, hours 1e4-1e6, days 100-40,000), so one number can appear in
     * several units.
     * @param {Date} birthDate
     * @param {Function} addEvent
     * @param {Object} config - sequence values, value->index map, id prefix,
     *   display name, WIKI_URLS key, icon, index letter (F/L), ordinalOffset
     *   (added to the index to get "the Nth number"), and `rule`, the sentence
     *   that explains the sequence
     */
    _addSequenceMilestones(birthDate, addEvent, config) {
        const { sequence, indexMap, idPrefix, name, wikiKey, icon, indexLabel, ordinalOffset, rule } = config;
        const units = [
            { filter: n => n >= 1e6 && n <= 3e9, ms: Milestones.MS_PER_SECOND, unit: 'seconds' },
            { filter: n => n >= 1e5 && n <= 5e7, ms: Milestones.MS_PER_MINUTE, unit: 'minutes' },
            { filter: n => n >= 10000 && n <= 1000000, ms: Milestones.MS_PER_HOUR, unit: 'hours' },
            { filter: n => n >= 100 && n <= 40000, ms: Milestones.MS_PER_DAY, unit: 'days' }
        ];

        for (const { filter, ms, unit } of units) {
            for (const num of sequence.filter(filter)) {
                const idx = indexMap.get(num);
                const term = `${indexLabel}${Milestones.toSubscript(idx)}`;
                const ordinal = Milestones.getOrdinal(idx + ordinalOffset);
                addEvent({
                    id: `${idPrefix}-${unit}-${num}`,
                    title: `${num.toLocaleString()} ${unit} (${name} ${term})`,
                    description: `You've been alive for ${alive(num, ms, unit)}. ${num.toLocaleString()} is ${term}, the ${ordinal} ${wikiLink(wikiKey, `${name} number`)}. ${rule}`,
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
            indexLabel: 'F',
            // F(1) = 1 is the 1st Fibonacci number, so the index is the count.
            ordinalOffset: 0,
            rule: 'Each Fibonacci number is the sum of the two before it: 1, 1, 2, 3, 5, 8, 13…'
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
            indexLabel: 'L',
            // L(0) = 2 is the 1st Lucas number, so the count is one past the index.
            ordinalOffset: 1,
            rule: 'Like Fibonacci numbers, each Lucas number is the sum of the two before it, but the sequence starts with 2 and 1: 2, 1, 3, 4, 7, 11, 18…'
        });
    },

    _addPerfectNumberMilestones(birthDate, addEvent) {
        const groups = [
            { numbers: Milestones.PERFECT_NUMBERS, ms: Milestones.MS_PER_DAY, unit: 'days' },
            { numbers: Milestones.PERFECT_HOUR_NUMBERS, ms: Milestones.MS_PER_HOUR, unit: 'hours' }
        ];
        const known = Milestones.PERFECT_NUMBERS.map(n => n.toLocaleString());
        const knownList = `${known.slice(0, -1).join(', ')} and ${known[known.length - 1]}`;

        for (const { numbers, ms, unit } of groups) {
            for (const perfect of numbers) {
                const divisors = [];
                for (let d = 1; d < perfect; d++) {
                    if (perfect % d === 0) { divisors.push(d.toLocaleString()); }
                }
                addEvent({
                    id: `perfect-${unit}-${perfect}`,
                    title: `${perfect.toLocaleString()} ${unit}, a perfect number`,
                    description: `You've been alive for ${alive(perfect, ms, unit)}. ${perfect.toLocaleString()} is a ${wikiLink('perfect', 'perfect number')}: it equals the sum of the smaller numbers that divide it evenly, ${divisors.join(' + ')} = ${perfect.toLocaleString()}. The only perfect numbers below 33 million are ${knownList}.`,
                    date: new Date(birthDate.getTime() + perfect * ms),
                    category: 'mathematical',
                    icon: '💎',
                    milestone: `${perfect.toLocaleString()} ${unit} (perfect number)`
                });
            }
        }
    },

    _addTriangularMilestones(birthDate, addEvent) {
        const addTriangular = (tri, ms, unit) => {
            const n = Math.round((-1 + Math.sqrt(1 + 8 * tri)) / 2);
            addEvent({
                id: `triangular-${unit}-${tri}`,
                title: `${tri.toLocaleString()} ${unit}, a triangular number`,
                description: `You've been alive for ${alive(tri, ms, unit)}. ${tri.toLocaleString()} is a ${wikiLink('triangular', 'triangular number')}: 1 + 2 + 3 + … + ${n} = ${tri.toLocaleString()}, so that many dots stack into a triangle with ${n} in the bottom row.`,
                date: new Date(birthDate.getTime() + tri * ms),
                category: 'mathematical',
                icon: '🔺',
                milestone: `T(${n}) = ${tri.toLocaleString()} ${unit}`
            });
        };

        // Interesting triangular numbers
        const interestingSet = new Set(Milestones.INTERESTING_TRIANGULAR);
        const interesting = Milestones.TRIANGULAR.filter((t, i) =>
            (i + 1) % 10 === 0 || interestingSet.has(t)
        );
        for (const tri of interesting) {
            if (tri >= 100 && tri <= 15000) {
                addTriangular(tri, Milestones.MS_PER_DAY, 'days');
            }
        }

        // Triangular hours
        const triangularHours = Milestones.TRIANGULAR.filter(t =>
            t >= 10000 && t <= 100000 && Milestones.TRIANGULAR_INDEX.get(t) % 5 === 0
        );
        for (const tri of triangularHours) {
            addTriangular(tri, Milestones.MS_PER_HOUR, 'hours');
        }
    },

    _addPalindromeMilestones(birthDate, addEvent) {
        const addPalindrome = (pal, ms, unit) => {
            addEvent({
                id: `palindrome-${unit}-${pal}`,
                title: `${pal.toLocaleString()} ${unit}, a palindrome`,
                description: `You've been alive for ${alive(pal, ms, unit)}. ${pal} reads the same forwards and backwards, which makes it a ${wikiLink('palindrome', 'palindrome')}.`,
                date: new Date(birthDate.getTime() + pal * ms),
                category: 'mathematical',
                icon: '🪞',
                milestone: `${pal.toLocaleString()} ${unit} (palindrome)`
            });
        };

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
            addPalindrome(pal, Milestones.MS_PER_DAY, 'days');
        }

        // Palindrome hours
        for (const pal of Milestones.PALINDROME_HOURS) {
            addPalindrome(pal, Milestones.MS_PER_HOUR, 'hours');
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
                    title: `${rep.toLocaleString()} ${unit}, all 1s`,
                    description: `You've been alive for ${alive(rep, ms, unit)}. A number written only with 1s is called a ${wikiLink('repunit', 'repunit')}, short for "repeated unit".`,
                    date: new Date(birthDate.getTime() + rep * ms),
                    category: 'binary',
                    icon: '1️⃣',
                    milestone: `${rep.toLocaleString()} ${unit} (repunit)`
                });
            }
        }
    },

    _addScientificMilestones(birthDate, addEvent) {
        // Ages of c, 2c, ... 10c seconds, reading c as the number 299,792,458
        const c = Milestones.SPEED_OF_LIGHT.toLocaleString();
        for (let mult = 1; mult <= Milestones.SPEED_OF_LIGHT_MAX_MULTIPLE; mult++) {
            const seconds = Milestones.SPEED_OF_LIGHT * mult;
            const label = mult === 1 ? 'c' : `${mult}c`;
            const light = wikiLink('speedOfLight', 'the speed of light');
            addEvent({
                id: `speed-of-light-${mult}x`,
                title: `${seconds.toLocaleString()} seconds (${label})`,
                description: `You've been alive for ${alive(seconds, Milestones.MS_PER_SECOND, 'seconds')}. ${mult === 1
                    ? `That is ${light} in meters per second, written c.`
                    : `That is ${mult} × c, where c = ${c} meters per second is ${light}.`}`,
                date: new Date(birthDate.getTime() + seconds * Milestones.MS_PER_SECOND),
                category: 'scientific',
                icon: '💡',
                milestone: `${label} seconds`
            });
        }

        // e^π milestones
        const ePi = Math.pow(Math.E, Math.PI);
        const multipliers = [
            { mult: 1e6, label: '1 million' },
            { mult: 1e7, label: '10 million' },
            { mult: 1e8, label: '100 million' }
        ];
        for (const { mult, label } of multipliers) {
            const seconds = ePi * mult;
            addEvent({
                id: `e-pi-${mult}`,
                title: `e^π × ${label} seconds (Gelfond's constant)`,
                description: `You've been alive for e^π × ${mult.toLocaleString()} ≈ ${Math.round(seconds).toLocaleString()} seconds, ${Milestones.approxDuration(seconds * Milestones.MS_PER_SECOND)}. e^π ≈ 23.1407 is Gelfond's constant. It is proven transcendental, meaning it is not a root of any polynomial with whole-number coefficients.`,
                date: new Date(birthDate.getTime() + seconds * Milestones.MS_PER_SECOND),
                category: 'mathematical',
                icon: '🧮',
                milestone: `e^π × ${mult.toLocaleString()} seconds`
            });
        }
    },

    _addPopCultureMilestones(birthDate, addEvent) {
        for (const m of Milestones.popCultureMilestones) {
            addEvent({
                id: m.id,
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
        // Light leaving Earth at birth reaches each destination at age distance / c

        for (const [key, dest] of Object.entries(Milestones.COSMIC_DISTANCES)) {
            const secondsNeeded = dest.meters / Milestones.SPEED_OF_LIGHT;
            const eventDate = new Date(birthDate.getTime() + secondsNeeded * Milestones.MS_PER_SECOND);

            // Thresholds are in meters (see DISTANCE_THRESHOLD_* in milestones.js)
            let distanceStr;
            if (dest.meters >= Milestones.DISTANCE_THRESHOLD_LIGHT_YEAR) {
                distanceStr = `${(dest.meters / Milestones.METERS_PER_LIGHT_YEAR).toFixed(2)} light-years`;
            } else if (dest.meters >= Milestones.DISTANCE_THRESHOLD_TRILLION_KM) {
                distanceStr = `${(dest.meters / Milestones.DISTANCE_THRESHOLD_TRILLION_KM).toFixed(1)} billion km`;
            } else if (dest.meters >= Milestones.DISTANCE_THRESHOLD_BILLION_KM) {
                distanceStr = `${(dest.meters / Milestones.DISTANCE_THRESHOLD_BILLION_KM).toFixed(1)} million km`;
            } else {
                distanceStr = `${(dest.meters / Milestones.DISTANCE_THRESHOLD_MILLION_KM).toFixed(0)},000 km`;
            }

            // A distance in light-years already says how long light takes
            const travel = dest.meters >= Milestones.DISTANCE_THRESHOLD_LIGHT_YEAR
                ? ''
                : ` At the ${wikiLink('speedOfLight', 'speed of light')}, that trip takes ${lightTravelTime(secondsNeeded)}.`;

            const destLink = wikiLink(key, dest.name);

            addEvent({
                id: `lightspeed-${key}`,
                title: `Light from your birth reaches ${dest.name}`,
                description: `Light that left Earth when you were born has now traveled about ${distanceStr}, the distance to ${destLink}${dest.where || ''}.${travel}`,
                date: eventDate,
                category: 'scientific',
                icon: dest.icon,
                milestone: `c × age = ${dest.name}`
            });
        }

        // Round light-time units: light-second, light-minute, 1 AU, light-hour, light-day
        for (const unit of Milestones.LIGHT_TIME_UNITS) {
            addEvent({
                id: `lightspeed-${unit.seconds}s`,
                title: `Light from your birth travels ${unit.name}`,
                description: `You are ${unit.seconds.toLocaleString()} second${unit.seconds === 1 ? '' : 's'} old, so light that left Earth when you were born has traveled ${wikiLink(unit.wikiKey, unit.name)}: ${unit.desc}.`,
                date: new Date(birthDate.getTime() + unit.seconds * Milestones.MS_PER_SECOND),
                category: 'scientific',
                icon: '💡',
                milestone: unit.name
            });
        }
    },

    _addLunationMilestones(birthDate, addEvent) {
        const periodMs = Milestones.SYNODIC_MONTH_DAYS * Milestones.MS_PER_DAY;
        for (const n of Milestones.lunationMilestones) {
            const eventDate = new Date(birthDate.getTime() + n * periodMs);
            addEvent({
                id: `lunation-${n}`,
                title: `${n.toLocaleString()} new moons`,
                description: `The Moon has gone from new moon to new moon ${n.toLocaleString()} times since you were born, ${Milestones.approxDuration(n * periodMs)}. Each of these ${wikiLink('lunation', 'lunar months')} averages 29.53 days.`,
                date: eventDate,
                category: 'scientific',
                icon: '🌑',
                milestone: `${n.toLocaleString()} lunations`
            });
        }
    },

    _addFractionalAgeMilestones(birthDate, maxDate, addEvent) {
        const fractions = [
            { frac: 0.25, label: '¼', decimal: '.25' },
            { frac: 0.5, label: '½', decimal: '.5' },
            { frac: 0.75, label: '¾', decimal: '.75' }
        ];
        for (let age = 1; age <= Milestones.MAX_YEARS; age++) {
            for (const { frac, label, decimal } of fractions) {
                const whole = age - 1;
                const exactAge = whole + frac;
                const eventDate = new Date(birthDate.getTime() + exactAge * Milestones.MS_PER_YEAR);
                if (eventDate > maxDate) { return; }
                const ageText = whole > 0 ? `${whole}${label} years` : `${label} year`;
                addEvent({
                    id: `frac-birthday-${age}-${frac}`,
                    title: `${ageText} old`,
                    description: `You are ${ageText} old, counted in average calendar years of 365.2425 days.`,
                    date: eventDate,
                    category: 'planetary',
                    icon: '🎂',
                    milestone: `${whole}${decimal} Earth years`
                });
            }
        }
    },

    _buildEarthBirthdayEvent(year, birthdayDate) {
        const ordinal = Milestones.getOrdinal(year);
        const labels = [];

        if (year === 42) { labels.push(`${wikiLink('answer42', 'the Answer to Life, the Universe, and Everything')} in The Hitchhiker's Guide to the Galaxy`); }
        if (Milestones.primeAges.has(year)) { labels.push('a prime number (divisible only by 1 and itself)'); }
        if (Milestones.squareAges[year]) { labels.push(`a perfect square (${Milestones.squareAges[year]})`); }
        if (Milestones.powerOf2Ages[year]) { labels.push(`a power of 2 (${Milestones.powerOf2Ages[year]})`); }
        if (Milestones.cubeAges[year]) { labels.push(`a perfect cube (${Milestones.cubeAges[year]})`); }
        if (Milestones.hexRoundAges[year]) { labels.push(`a round number in base 16 (${Milestones.hexRoundAges[year]})`); }

        const joined = labels.length > 2
            ? `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
            : labels.join(' and ');
        const specialLabel = joined ? ` ${year} is ${joined}.` : '';

        return {
            id: `earth-birthday-${year}`,
            title: `${ordinal} birthday`,
            description: `You turn ${year}.${specialLabel}`,
            date: birthdayDate,
            category: 'planetary',
            icon: '🎂',
            milestone: `${year} Earth years`
        };
    },

    _buildNerdyHolidayEvent(holiday, holidayDate) {
        const linkText = holiday.wikiKey ? wikiLink(holiday.wikiKey, holiday.name) : holiday.name;
        const year = holidayDate.getUTCFullYear();
        return {
            id: `${holiday.name.toLowerCase().replace(/\s/g, '-')}-${year}`,
            title: `${holiday.name} ${year}`,
            description: `${linkText}: ${holiday.desc}.`,
            date: holidayDate,
            category: 'pop-culture',
            icon: holiday.icon,
            milestone: holiday.name,
            isSharedHoliday: true
        };
    },

    /**
     * Earth birthdays and nerdy holidays that fall exactly at `eventTime`,
     * which must match the birth time's UTC hour and minute. The worker does
     * not call this; it uses getEarthBirthdayAt and getHolidaysAt, because it
     * sends holidays at local midnight rather than at birth time. Only the tests
     * call it.
     * @param {Date} birthDate
     * @param {Date} eventTime
     * @returns {Array} Matching events
     */
    getCalendarEventsAt(birthDate, eventTime) {
        const events = this.getEarthBirthdayAt(birthDate, eventTime);

        if (eventTime.getUTCHours() === birthDate.getUTCHours() &&
            eventTime.getUTCMinutes() === birthDate.getUTCMinutes()) {
            for (const holiday of Milestones.nerdyHolidays) {
                if (holiday.month === eventTime.getUTCMonth() &&
                    holiday.day === eventTime.getUTCDate()) {
                    events.push(this._buildNerdyHolidayEvent(holiday, eventTime));
                }
            }
        }

        return events;
    },

    /**
     * Nerdy holidays whose month and day match `date`, read in UTC. The worker
     * calls this at each user's local midnight, passing a Date at UTC midnight
     * of that local calendar date, so the UTC fields are the local date.
     * @param {Date} date
     * @returns {Array} Holiday events (usually zero or one)
     */
    getHolidaysAt(date) {
        const events = [];
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        for (const holiday of Milestones.nerdyHolidays) {
            if (holiday.month === month && holiday.day === day) {
                events.push(this._buildNerdyHolidayEvent(holiday, date));
            }
        }
        return events;
    },

    /**
     * The Earth birthday at `eventTime` (to the minute), placed exactly as
     * calculate() places it, so a Feb 29 birth fires on Mar 1 in non-leap
     * years. The worker calls this every minute to send birthday
     * notifications at birth time.
     * @param {Date} birthDate
     * @param {Date} eventTime
     * @returns {Array} Zero or one birthday event
     */
    getEarthBirthdayAt(birthDate, eventTime) {
        const year = eventTime.getUTCFullYear() - birthDate.getUTCFullYear();
        if (year < 1 || year > Milestones.MAX_YEARS) { return []; }
        const birthday = this._earthBirthdayDate(birthDate, year);
        return birthday.getTime() === Math.floor(eventTime.getTime() / 60000) * 60000
            ? [this._buildEarthBirthdayEvent(year, birthday)]
            : [];
    },

    /**
     * When the `year`th Earth birthday falls: the birth's UTC month, day, hour
     * and minute, `year` years later. Date.UTC rolls a Feb 29 birth to Mar 1
     * in non-leap years; every birthday path goes through here so the results
     * page and the push schedule agree on that.
     * @param {Date} birthDate
     * @param {number} year
     * @returns {Date}
     */
    _earthBirthdayDate(birthDate, year) {
        return new Date(Date.UTC(
            birthDate.getUTCFullYear() + year,
            birthDate.getUTCMonth(),
            birthDate.getUTCDate(),
            birthDate.getUTCHours(),
            birthDate.getUTCMinutes()
        ));
    },

    _addNerdyHolidays(birthDate, maxDate, addEvent) {
        for (const holiday of Milestones.nerdyHolidays) {
            // Year 0 covers holidays later in the birth year; the
            // holidayDate > birthDate check drops ones before birth.
            // Holidays are placed at the birth time of day, in UTC.
            for (let year = 0; year <= Milestones.MAX_YEARS; year++) {
                const holidayDate = new Date(Date.UTC(
                    birthDate.getUTCFullYear() + year,
                    holiday.month,
                    holiday.day,
                    birthDate.getUTCHours(),
                    birthDate.getUTCMinutes()
                ));

                if (holidayDate > birthDate && holidayDate <= maxDate) {
                    addEvent(this._buildNerdyHolidayEvent(holiday, holidayDate));
                }
            }
        }
    },

    _addEarthBirthdays(birthDate, maxDate, addEvent) {
        for (let year = 1; year <= Milestones.MAX_YEARS; year++) {
            const birthdayDate = this._earthBirthdayDate(birthDate, year);

            if (birthdayDate > birthDate && birthdayDate <= maxDate) {
                addEvent(this._buildEarthBirthdayEvent(year, birthdayDate));
            }
        }
    }
};

export default Calculator;
