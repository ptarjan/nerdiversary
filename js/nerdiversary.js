/**
 * Nerdiversary Calculator
 * Calculates various nerdy anniversary milestones
 *
 * Requires: js/milestones.js to be loaded first (provides shared constants)
 */

// Load Milestones in Node.js if not already global
if (typeof Milestones === 'undefined' && typeof require !== 'undefined') {
    globalThis.Milestones = require('./milestones.js');
}

const Nerdiversary = {
    // Re-export shared constants for backward compatibility
    get MS_PER_SECOND() { return Milestones.MS_PER_SECOND; },
    get MS_PER_MINUTE() { return Milestones.MS_PER_MINUTE; },
    get MS_PER_HOUR() { return Milestones.MS_PER_HOUR; },
    get MS_PER_DAY() { return Milestones.MS_PER_DAY; },
    get MS_PER_WEEK() { return Milestones.MS_PER_WEEK; },
    get MS_PER_YEAR() { return Milestones.MS_PER_YEAR; },
    get PI() { return Milestones.PI; },
    get E() { return Milestones.E; },
    get PHI() { return Milestones.PHI; },
    get TAU() { return Milestones.TAU; },
    get FIBONACCI() { return Milestones.FIBONACCI; },
    get LUCAS() { return Milestones.LUCAS; },
    get PERFECT_NUMBERS() { return Milestones.PERFECT_NUMBERS; },
    get TRIANGULAR() { return Milestones.TRIANGULAR; },
    get PALINDROMES() { return Milestones.PALINDROMES; },
    get REPUNITS() { return Milestones.REPUNITS; },
    get POWERS_OF_2() { return Milestones.POWERS_OF_2; },

    // Planetary data with colors for website
    get PLANETS() {
        return {
            mercury: { ...Milestones.PLANETS.mercury, color: '#8c8c8c' },
            venus: { ...Milestones.PLANETS.venus, color: '#e6c229' },
            mars: { ...Milestones.PLANETS.mars, color: '#e04f39' },
            jupiter: { ...Milestones.PLANETS.jupiter, color: '#d8a066' },
            saturn: { ...Milestones.PLANETS.saturn, color: '#f4d58d' },
            uranus: { ...Milestones.PLANETS.uranus, color: '#4fd0e7' },
            neptune: { ...Milestones.PLANETS.neptune, color: '#4b70dd' }
        };
    },

    /**
     * Calculate all nerdiversaries for a given birthdate
     * @param {Date} birthDate - The birth date/time
     * @param {number} yearsAhead - How many years ahead to calculate (default 100)
     * @returns {Array} Array of nerdiversary objects
     */
    calculate(birthDate, yearsAhead = 100) {
        const events = [];
        const now = new Date();
        const maxDate = new Date(birthDate.getTime() + yearsAhead * this.MS_PER_YEAR);

        // Add planetary years
        events.push(...this.calculatePlanetaryYears(birthDate, maxDate));

        // Add decimal milestones
        events.push(...this.calculateDecimalMilestones(birthDate, maxDate));

        // Add binary/hex milestones
        events.push(...this.calculateBinaryMilestones(birthDate, maxDate));

        // Add mathematical constant milestones
        events.push(...this.calculateMathMilestones(birthDate, maxDate));

        // Add Fibonacci milestones
        events.push(...this.calculateFibonacciMilestones(birthDate, maxDate));

        // Add Lucas number milestones
        events.push(...this.calculateLucasMilestones(birthDate, maxDate));

        // Add perfect number milestones
        events.push(...this.calculatePerfectNumberMilestones(birthDate, maxDate));

        // Add triangular number milestones
        events.push(...this.calculateTriangularMilestones(birthDate, maxDate));

        // Add palindrome milestones
        events.push(...this.calculatePalindromeMilestones(birthDate, maxDate));

        // Add repunit milestones
        events.push(...this.calculateRepunitMilestones(birthDate, maxDate));

        // Add scientific constant milestones
        events.push(...this.calculateScientificMilestones(birthDate, maxDate));

        // Add pop culture milestones
        events.push(...this.calculatePopCultureMilestones(birthDate, maxDate));

        // Add nerdy holidays (Pi Day, May 4th, Tau Day)
        events.push(...this.calculateNerdyHolidays(birthDate, maxDate));

        // Add Earth birthdays
        events.push(...this.calculateEarthBirthdays(birthDate, maxDate));

        // Sort by date
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Add relative time info
        return events.map(event => ({
            ...event,
            isPast: event.date < now,
            daysFromNow: Math.floor((event.date - now) / this.MS_PER_DAY)
        }));
    },

    /**
     * Calculate planetary year anniversaries
     */
    calculatePlanetaryYears(birthDate, maxDate) {
        const events = [];

        for (const [key, planet] of Object.entries(this.PLANETS)) {
            const periodMs = planet.days * this.MS_PER_DAY;
            let yearNum = 1;
            let eventDate = new Date(birthDate.getTime() + periodMs);

            while (eventDate <= maxDate && yearNum <= 200) {
                events.push({
                    id: `${key}-${yearNum}`,
                    title: `${planet.name} Year ${yearNum}`,
                    description: `You've completed ${yearNum} orbit${yearNum > 1 ? 's' : ''} around the Sun as measured from ${planet.name}!`,
                    date: eventDate,
                    category: 'planetary',
                    icon: planet.icon,
                    milestone: `${yearNum} ${planet.name} year${yearNum > 1 ? 's' : ''}`,
                    planet: planet.name
                });

                yearNum++;
                eventDate = new Date(birthDate.getTime() + yearNum * periodMs);
            }
        }

        return events;
    },

    /**
     * Calculate decimal time milestones
     */
    calculateDecimalMilestones(birthDate, maxDate) {
        const events = [];

        // Seconds milestones
        const secondMilestones = [
            { value: 1e6, label: '1 Million Seconds', short: '10⁶ seconds' },
            { value: 2e6, label: '2 Million Seconds', short: '2×10⁶ seconds' },
            { value: 5e6, label: '5 Million Seconds', short: '5×10⁶ seconds' },
            { value: 1e7, label: '10 Million Seconds', short: '10⁷ seconds' },
            { value: 2e7, label: '20 Million Seconds', short: '2×10⁷ seconds' },
            { value: 2.5e7, label: '25 Million Seconds', short: '2.5×10⁷ seconds' },
            { value: 5e7, label: '50 Million Seconds', short: '5×10⁷ seconds' },
            { value: 7.5e7, label: '75 Million Seconds', short: '7.5×10⁷ seconds' },
            { value: 1e8, label: '100 Million Seconds', short: '10⁸ seconds' },
            { value: 1.5e8, label: '150 Million Seconds', short: '1.5×10⁸ seconds' },
            { value: 2e8, label: '200 Million Seconds', short: '2×10⁸ seconds' },
            { value: 2.5e8, label: '250 Million Seconds', short: '2.5×10⁸ seconds' },
            { value: 3e8, label: '300 Million Seconds', short: '3×10⁸ seconds' },
            { value: 4e8, label: '400 Million Seconds', short: '4×10⁸ seconds' },
            { value: 5e8, label: '500 Million Seconds', short: '5×10⁸ seconds' },
            { value: 6e8, label: '600 Million Seconds', short: '6×10⁸ seconds' },
            { value: 7.5e8, label: '750 Million Seconds', short: '7.5×10⁸ seconds' },
            { value: 1e9, label: '1 Billion Seconds', short: '10⁹ seconds' },
            { value: 1.25e9, label: '1.25 Billion Seconds', short: '1.25×10⁹ seconds' },
            { value: 1.5e9, label: '1.5 Billion Seconds', short: '1.5×10⁹ seconds' },
            { value: 1.75e9, label: '1.75 Billion Seconds', short: '1.75×10⁹ seconds' },
            { value: 2e9, label: '2 Billion Seconds', short: '2×10⁹ seconds' },
            { value: 2.5e9, label: '2.5 Billion Seconds', short: '2.5×10⁹ seconds' },
            { value: 3e9, label: '3 Billion Seconds', short: '3×10⁹ seconds' }
        ];

        for (const milestone of secondMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `seconds-${milestone.value}`,
                    title: milestone.label,
                    description: `You've been alive for exactly ${milestone.short}!`,
                    date: eventDate,
                    category: 'decimal',
                    icon: '🔢',
                    milestone: milestone.short
                });
            }
        }

        // Minutes milestones
        const minuteMilestones = [
            { value: 1e4, label: '10,000 Minutes', short: '10⁴ minutes' },
            { value: 2.5e4, label: '25,000 Minutes', short: '2.5×10⁴ minutes' },
            { value: 5e4, label: '50,000 Minutes', short: '5×10⁴ minutes' },
            { value: 7.5e4, label: '75,000 Minutes', short: '7.5×10⁴ minutes' },
            { value: 1e5, label: '100,000 Minutes', short: '10⁵ minutes' },
            { value: 2.5e5, label: '250,000 Minutes', short: '2.5×10⁵ minutes' },
            { value: 5e5, label: '500,000 Minutes', short: '5×10⁵ minutes' },
            { value: 7.5e5, label: '750,000 Minutes', short: '7.5×10⁵ minutes' },
            { value: 1e6, label: '1 Million Minutes', short: '10⁶ minutes' },
            { value: 2e6, label: '2 Million Minutes', short: '2×10⁶ minutes' },
            { value: 5e6, label: '5 Million Minutes', short: '5×10⁶ minutes' },
            { value: 1e7, label: '10 Million Minutes', short: '10⁷ minutes' }
        ];

        for (const milestone of minuteMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_MINUTE);
            if (eventDate <= maxDate) {
                events.push({
                    id: `minutes-${milestone.value}`,
                    title: milestone.label,
                    description: `You've experienced exactly ${milestone.short}!`,
                    date: eventDate,
                    category: 'decimal',
                    icon: '⏱️',
                    milestone: milestone.short
                });
            }
        }

        // Hours milestones
        const hourMilestones = [
            { value: 1e4, label: '10,000 Hours', short: '10⁴ hours' },
            { value: 2e4, label: '20,000 Hours', short: '2×10⁴ hours' },
            { value: 2.5e4, label: '25,000 Hours', short: '2.5×10⁴ hours' },
            { value: 3e4, label: '30,000 Hours', short: '3×10⁴ hours' },
            { value: 4e4, label: '40,000 Hours', short: '4×10⁴ hours' },
            { value: 5e4, label: '50,000 Hours', short: '5×10⁴ hours' },
            { value: 6e4, label: '60,000 Hours', short: '6×10⁴ hours' },
            { value: 7e4, label: '70,000 Hours', short: '7×10⁴ hours' },
            { value: 7.5e4, label: '75,000 Hours', short: '7.5×10⁴ hours' },
            { value: 8e4, label: '80,000 Hours', short: '8×10⁴ hours' },
            { value: 9e4, label: '90,000 Hours', short: '9×10⁴ hours' },
            { value: 1e5, label: '100,000 Hours', short: '10⁵ hours' },
            { value: 1.1e5, label: '110,000 Hours', short: '1.1×10⁵ hours' },
            { value: 1.2e5, label: '120,000 Hours', short: '1.2×10⁵ hours' },
            { value: 1.25e5, label: '125,000 Hours', short: '1.25×10⁵ hours' },
            { value: 1.3e5, label: '130,000 Hours', short: '1.3×10⁵ hours' },
            { value: 1.4e5, label: '140,000 Hours', short: '1.4×10⁵ hours' },
            { value: 1.5e5, label: '150,000 Hours', short: '1.5×10⁵ hours' },
            { value: 1.6e5, label: '160,000 Hours', short: '1.6×10⁵ hours' },
            { value: 1.7e5, label: '170,000 Hours', short: '1.7×10⁵ hours' },
            { value: 1.75e5, label: '175,000 Hours', short: '1.75×10⁵ hours' },
            { value: 1.8e5, label: '180,000 Hours', short: '1.8×10⁵ hours' },
            { value: 1.9e5, label: '190,000 Hours', short: '1.9×10⁵ hours' },
            { value: 2e5, label: '200,000 Hours', short: '2×10⁵ hours' },
            { value: 2.1e5, label: '210,000 Hours', short: '2.1×10⁵ hours' },
            { value: 2.2e5, label: '220,000 Hours', short: '2.2×10⁵ hours' },
            { value: 2.25e5, label: '225,000 Hours', short: '2.25×10⁵ hours' },
            { value: 2.3e5, label: '230,000 Hours', short: '2.3×10⁵ hours' },
            { value: 2.4e5, label: '240,000 Hours', short: '2.4×10⁵ hours' },
            { value: 2.5e5, label: '250,000 Hours', short: '2.5×10⁵ hours' },
            { value: 2.6e5, label: '260,000 Hours', short: '2.6×10⁵ hours' },
            { value: 2.7e5, label: '270,000 Hours', short: '2.7×10⁵ hours' },
            { value: 2.75e5, label: '275,000 Hours', short: '2.75×10⁵ hours' },
            { value: 2.8e5, label: '280,000 Hours', short: '2.8×10⁵ hours' },
            { value: 2.9e5, label: '290,000 Hours', short: '2.9×10⁵ hours' },
            { value: 3e5, label: '300,000 Hours', short: '3×10⁵ hours' },
            { value: 3.1e5, label: '310,000 Hours', short: '3.1×10⁵ hours' },
            { value: 3.2e5, label: '320,000 Hours', short: '3.2×10⁵ hours' },
            { value: 3.25e5, label: '325,000 Hours', short: '3.25×10⁵ hours' },
            { value: 3.3e5, label: '330,000 Hours', short: '3.3×10⁵ hours' },
            { value: 3.4e5, label: '340,000 Hours', short: '3.4×10⁵ hours' },
            { value: 3.5e5, label: '350,000 Hours', short: '3.5×10⁵ hours' },
            { value: 3.6e5, label: '360,000 Hours', short: '3.6×10⁵ hours' },
            { value: 3.7e5, label: '370,000 Hours', short: '3.7×10⁵ hours' },
            { value: 3.75e5, label: '375,000 Hours', short: '3.75×10⁵ hours' },
            { value: 3.8e5, label: '380,000 Hours', short: '3.8×10⁵ hours' },
            { value: 3.9e5, label: '390,000 Hours', short: '3.9×10⁵ hours' },
            { value: 4e5, label: '400,000 Hours', short: '4×10⁵ hours' },
            { value: 4.1e5, label: '410,000 Hours', short: '4.1×10⁵ hours' },
            { value: 4.2e5, label: '420,000 Hours', short: '4.2×10⁵ hours' },
            { value: 4.25e5, label: '425,000 Hours', short: '4.25×10⁵ hours' },
            { value: 4.3e5, label: '430,000 Hours', short: '4.3×10⁵ hours' },
            { value: 4.4e5, label: '440,000 Hours', short: '4.4×10⁵ hours' },
            { value: 4.5e5, label: '450,000 Hours', short: '4.5×10⁵ hours' },
            { value: 4.6e5, label: '460,000 Hours', short: '4.6×10⁵ hours' },
            { value: 4.7e5, label: '470,000 Hours', short: '4.7×10⁵ hours' },
            { value: 4.75e5, label: '475,000 Hours', short: '4.75×10⁵ hours' },
            { value: 4.8e5, label: '480,000 Hours', short: '4.8×10⁵ hours' },
            { value: 4.9e5, label: '490,000 Hours', short: '4.9×10⁵ hours' },
            { value: 5e5, label: '500,000 Hours', short: '5×10⁵ hours' },
            { value: 5.25e5, label: '525,000 Hours', short: '5.25×10⁵ hours' },
            { value: 5.5e5, label: '550,000 Hours', short: '5.5×10⁵ hours' },
            { value: 5.75e5, label: '575,000 Hours', short: '5.75×10⁵ hours' },
            { value: 6e5, label: '600,000 Hours', short: '6×10⁵ hours' },
            { value: 6.25e5, label: '625,000 Hours', short: '6.25×10⁵ hours' },
            { value: 6.5e5, label: '650,000 Hours', short: '6.5×10⁵ hours' },
            { value: 6.75e5, label: '675,000 Hours', short: '6.75×10⁵ hours' },
            { value: 7e5, label: '700,000 Hours', short: '7×10⁵ hours' },
            { value: 7.5e5, label: '750,000 Hours', short: '7.5×10⁵ hours' },
            { value: 8e5, label: '800,000 Hours', short: '8×10⁵ hours' },
            { value: 8.5e5, label: '850,000 Hours', short: '8.5×10⁵ hours' },
            { value: 9e5, label: '900,000 Hours', short: '9×10⁵ hours' },
            { value: 1e6, label: '1 Million Hours', short: '10⁶ hours' }
        ];

        for (const milestone of hourMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_HOUR);
            if (eventDate <= maxDate) {
                events.push({
                    id: `hours-${milestone.value}`,
                    title: milestone.label,
                    description: `You've lived for exactly ${milestone.short}! ${milestone.value === 10000 ? 'You\'ve mastered life according to the 10,000-hour rule!' : ''}`,
                    date: eventDate,
                    category: 'decimal',
                    icon: '⏰',
                    milestone: milestone.short
                });
            }
        }

        // Days milestones (keeping only the interesting ones)
        const dayMilestones = [
            { value: 1000, label: '1,000 Days', short: '10³ days' },
            { value: 2000, label: '2,000 Days', short: '2×10³ days' },
            { value: 5000, label: '5,000 Days', short: '5×10³ days' },
            { value: 10000, label: '10,000 Days', short: '10⁴ days' },
            { value: 11111, label: '11,111 Days', short: '11,111 days' },
            { value: 12345, label: '12,345 Days', short: '12,345 days' },
            { value: 15000, label: '15,000 Days', short: '1.5×10⁴ days' },
            { value: 20000, label: '20,000 Days', short: '2×10⁴ days' },
            { value: 22222, label: '22,222 Days', short: '22,222 days' },
            { value: 25000, label: '25,000 Days', short: '2.5×10⁴ days' },
            { value: 30000, label: '30,000 Days', short: '3×10⁴ days' },
            { value: 33333, label: '33,333 Days', short: '33,333 days' }
        ];

        for (const milestone of dayMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_DAY);
            if (eventDate <= maxDate) {
                events.push({
                    id: `days-${milestone.value}`,
                    title: milestone.label,
                    description: `You've experienced ${milestone.short} on Earth!`,
                    date: eventDate,
                    category: 'decimal',
                    icon: '📆',
                    milestone: milestone.short
                });
            }
        }

        // Weeks milestones
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

        for (const milestone of weekMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_WEEK);
            if (eventDate <= maxDate) {
                events.push({
                    id: `weeks-${milestone.value}`,
                    title: milestone.label,
                    description: `You've lived for ${milestone.short}!`,
                    date: eventDate,
                    category: 'decimal',
                    icon: '📅',
                    milestone: milestone.short
                });
            }
        }

        // Months milestones (using average month length)
        const MS_PER_MONTH = this.MS_PER_DAY * 30.4375;
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

        for (const milestone of monthMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * MS_PER_MONTH);
            if (eventDate <= maxDate) {
                events.push({
                    id: `months-${milestone.value}`,
                    title: milestone.label,
                    description: `You've experienced ${milestone.short} of life!`,
                    date: eventDate,
                    category: 'decimal',
                    icon: '🗓️',
                    milestone: milestone.short
                });
            }
        }

        return events;
    },

    /**
     * Calculate binary and hexadecimal milestones
     */
    calculateBinaryMilestones(birthDate, maxDate) {
        const events = [];

        // Powers of 2 in seconds
        for (const power of this.POWERS_OF_2) {
            const value = Math.pow(2, power);
            const eventDate = new Date(birthDate.getTime() + value * this.MS_PER_SECOND);
            if (eventDate <= maxDate && eventDate > birthDate) {
                events.push({
                    id: `binary-seconds-${power}`,
                    title: `2^${power} Seconds`,
                    description: `You've lived for exactly 2²${this.toSuperscript(power)} = ${value.toLocaleString()} seconds!`,
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
            const eventDate = new Date(birthDate.getTime() + value * this.MS_PER_MINUTE);
            if (eventDate <= maxDate) {
                events.push({
                    id: `binary-minutes-${power}`,
                    title: `2^${power} Minutes`,
                    description: `You've lived for exactly 2²${this.toSuperscript(power)} = ${value.toLocaleString()} minutes!`,
                    date: eventDate,
                    category: 'binary',
                    icon: '🔟',
                    milestone: `2^${power} minutes`
                });
            }
        }

        // Hexadecimal milestones (in seconds)
        const hexMilestones = [
            { value: 0x100000, hex: '0x100000' },
            { value: 0x1000000, hex: '0x1000000' },
            { value: 0xFFFFFF, hex: '0xFFFFFF' },
            { value: 0x10000000, hex: '0x10000000' },
            { value: 0xDEADBEEF, hex: '0xDEADBEEF' }
        ];

        for (const milestone of hexMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `hex-${milestone.hex}`,
                    title: `${milestone.hex} Seconds`,
                    description: `You've lived for ${milestone.hex} (${milestone.value.toLocaleString()}) seconds!`,
                    date: eventDate,
                    category: 'binary',
                    icon: '🔢',
                    milestone: `${milestone.hex} seconds`
                });
            }
        }

        // All number base milestones
        const baseMilestones = [
            // Ternary (base 3)
            { base: 3, name: 'ternary', icon: '🔺', units: [
                { powers: [15, 16, 17, 18, 19, 20], unit: 'seconds', ms: this.MS_PER_SECOND },
                { powers: [11, 12, 13, 14, 15], unit: 'minutes', ms: this.MS_PER_MINUTE },
                { powers: [8, 9, 10, 11, 12], unit: 'hours', ms: this.MS_PER_HOUR },
                { powers: [6, 7, 8, 9], unit: 'days', ms: this.MS_PER_DAY }
            ]},
            // Quinary (base 5)
            { base: 5, name: 'quinary', icon: '🖐️', units: [
                { powers: [10, 11, 12, 13, 14], unit: 'seconds', ms: this.MS_PER_SECOND },
                { powers: [8, 9, 10, 11], unit: 'minutes', ms: this.MS_PER_MINUTE },
                { powers: [6, 7, 8, 9], unit: 'hours', ms: this.MS_PER_HOUR },
                { powers: [5, 6, 7], unit: 'days', ms: this.MS_PER_DAY }
            ]},
            // Senary (base 6)
            { base: 6, name: 'senary', icon: '🎲', units: [
                { powers: [9, 10, 11, 12, 13], unit: 'seconds', ms: this.MS_PER_SECOND },
                { powers: [7, 8, 9, 10], unit: 'minutes', ms: this.MS_PER_MINUTE },
                { powers: [5, 6, 7, 8], unit: 'hours', ms: this.MS_PER_HOUR },
                { powers: [4, 5, 6], unit: 'days', ms: this.MS_PER_DAY }
            ]},
            // Septenary (base 7)
            { base: 7, name: 'septenary', icon: '🌈', units: [
                { powers: [8, 9, 10, 11, 12], unit: 'seconds', ms: this.MS_PER_SECOND },
                { powers: [6, 7, 8, 9], unit: 'minutes', ms: this.MS_PER_MINUTE },
                { powers: [5, 6, 7, 8], unit: 'hours', ms: this.MS_PER_HOUR },
                { powers: [4, 5, 6], unit: 'days', ms: this.MS_PER_DAY }
            ]},
            // Octal (base 8)
            { base: 8, name: 'octal', icon: '🐙', units: [
                { powers: [7, 8, 9, 10, 11], unit: 'seconds', ms: this.MS_PER_SECOND },
                { powers: [5, 6, 7, 8], unit: 'minutes', ms: this.MS_PER_MINUTE },
                { powers: [4, 5, 6, 7], unit: 'hours', ms: this.MS_PER_HOUR },
                { powers: [3, 4, 5, 6], unit: 'days', ms: this.MS_PER_DAY }
            ]},
            // Duodecimal (base 12)
            { base: 12, name: 'dozenal', icon: '🕛', units: [
                { powers: [6, 7, 8, 9], unit: 'seconds', ms: this.MS_PER_SECOND },
                { powers: [5, 6, 7], unit: 'minutes', ms: this.MS_PER_MINUTE },
                { powers: [4, 5, 6], unit: 'hours', ms: this.MS_PER_HOUR },
                { powers: [3, 4, 5], unit: 'days', ms: this.MS_PER_DAY }
            ]},
            // Sexagesimal (base 60) - Babylonian!
            { base: 60, name: 'Babylonian', icon: '🏛️', units: [
                { powers: [4, 5], unit: 'seconds', ms: this.MS_PER_SECOND },
                { powers: [3, 4], unit: 'minutes', ms: this.MS_PER_MINUTE },
                { powers: [2, 3], unit: 'hours', ms: this.MS_PER_HOUR },
                { powers: [2], unit: 'days', ms: this.MS_PER_DAY }
            ]}
        ];

        for (const { base, name, icon, units } of baseMilestones) {
            for (const { powers, unit, ms } of units) {
                for (const power of powers) {
                    const value = Math.pow(base, power);
                    const eventDate = new Date(birthDate.getTime() + value * ms);
                    if (eventDate <= maxDate && eventDate > birthDate) {
                        events.push({
                            id: `base${base}-${power}-${unit}`,
                            title: `${base}^${power} ${unit.charAt(0).toUpperCase() + unit.slice(1)}`,
                            description: `You've lived for ${base}${this.toSuperscript(power)} = ${value.toLocaleString()} ${unit} (${name})!`,
                            date: eventDate,
                            category: 'binary',
                            icon: icon,
                            milestone: `${base}^${power} ${unit}`
                        });
                    }
                }
            }
        }

        return events;
    },

    /**
     * Calculate mathematical constant milestones
     */
    calculateMathMilestones(birthDate, maxDate) {
        const events = [];

        // Pi milestones
        const piMilestones = [
            { multiplier: 1e7, label: 'π × 10⁷ Seconds', value: this.PI * 1e7 },
            { multiplier: 1e8, label: 'π × 10⁸ Seconds', value: this.PI * 1e8 },
            { multiplier: 1e9, label: 'π × 10⁹ Seconds', value: this.PI * 1e9 }
        ];

        for (const milestone of piMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `pi-${milestone.multiplier}`,
                    title: milestone.label,
                    description: `You've lived for π × ${milestone.multiplier.toExponential(0)} ≈ ${Math.floor(milestone.value).toLocaleString()} seconds!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: 'π',
                    milestone: milestone.label
                });
            }
        }

        // e (Euler's number) milestones
        const eMilestones = [
            { multiplier: 1e7, label: 'e × 10⁷ Seconds', value: this.E * 1e7 },
            { multiplier: 1e8, label: 'e × 10⁸ Seconds', value: this.E * 1e8 },
            { multiplier: 1e9, label: 'e × 10⁹ Seconds', value: this.E * 1e9 }
        ];

        for (const milestone of eMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `e-${milestone.multiplier}`,
                    title: milestone.label,
                    description: `You've lived for e × ${milestone.multiplier.toExponential(0)} ≈ ${Math.floor(milestone.value).toLocaleString()} seconds!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: 'e',
                    milestone: milestone.label
                });
            }
        }

        // Golden ratio milestones
        const phiMilestones = [
            { multiplier: 1e7, label: 'φ × 10⁷ Seconds', value: this.PHI * 1e7 },
            { multiplier: 1e8, label: 'φ × 10⁸ Seconds', value: this.PHI * 1e8 },
            { multiplier: 1e9, label: 'φ × 10⁹ Seconds', value: this.PHI * 1e9 }
        ];

        for (const milestone of phiMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `phi-${milestone.multiplier}`,
                    title: milestone.label,
                    description: `You've lived for φ (golden ratio) × ${milestone.multiplier.toExponential(0)} ≈ ${Math.floor(milestone.value).toLocaleString()} seconds!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: 'φ',
                    milestone: milestone.label
                });
            }
        }

        // Tau milestones (2π)
        const tauMilestones = [
            { multiplier: 1e7, label: 'τ × 10⁷ Seconds', value: this.TAU * 1e7 },
            { multiplier: 1e8, label: 'τ × 10⁸ Seconds', value: this.TAU * 1e8 }
        ];

        for (const milestone of tauMilestones) {
            const eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `tau-${milestone.multiplier}`,
                    title: milestone.label,
                    description: `You've lived for τ (2π) × ${milestone.multiplier.toExponential(0)} ≈ ${Math.floor(milestone.value).toLocaleString()} seconds!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: 'τ',
                    milestone: milestone.label
                });
            }
        }

        return events;
    },

    /**
     * Calculate Fibonacci sequence milestones
     */
    calculateFibonacciMilestones(birthDate, maxDate) {
        const events = [];

        // Fibonacci seconds (larger ones that span a lifetime)
        const fibSeconds = this.FIBONACCI.filter(n => n >= 1e6 && n <= 3e9);
        for (const fib of fibSeconds) {
            const eventDate = new Date(birthDate.getTime() + fib * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `fib-seconds-${fib}`,
                    title: `Fibonacci Second ${fib.toLocaleString()}`,
                    description: `Second ${fib.toLocaleString()} is a Fibonacci number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🌀',
                    milestone: `F(${this.FIBONACCI.indexOf(fib) + 1}) = ${fib.toLocaleString()} seconds`
                });
            }
        }

        // Fibonacci minutes
        const fibMinutes = this.FIBONACCI.filter(n => n >= 1e5 && n <= 5e7);
        for (const fib of fibMinutes) {
            const eventDate = new Date(birthDate.getTime() + fib * this.MS_PER_MINUTE);
            if (eventDate <= maxDate) {
                events.push({
                    id: `fib-minutes-${fib}`,
                    title: `Fibonacci Minute ${fib.toLocaleString()}`,
                    description: `Minute ${fib.toLocaleString()} is a Fibonacci number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🌀',
                    milestone: `F(${this.FIBONACCI.indexOf(fib) + 1}) = ${fib.toLocaleString()} minutes`
                });
            }
        }

        // Fibonacci hours
        const fibHours = this.FIBONACCI.filter(n => n >= 10000 && n <= 1000000);
        for (const fib of fibHours) {
            const eventDate = new Date(birthDate.getTime() + fib * this.MS_PER_HOUR);
            if (eventDate <= maxDate) {
                events.push({
                    id: `fib-hours-${fib}`,
                    title: `Fibonacci Hour ${fib.toLocaleString()}`,
                    description: `Hour ${fib.toLocaleString()} is a Fibonacci number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🌀',
                    milestone: `F(${this.FIBONACCI.indexOf(fib) + 1}) = ${fib.toLocaleString()} hours`
                });
            }
        }

        // Fibonacci days
        const fibDays = this.FIBONACCI.filter(n => n >= 100 && n <= 40000);
        for (const fib of fibDays) {
            const eventDate = new Date(birthDate.getTime() + fib * this.MS_PER_DAY);
            if (eventDate <= maxDate) {
                events.push({
                    id: `fib-days-${fib}`,
                    title: `Fibonacci Day ${fib}`,
                    description: `Day ${fib.toLocaleString()} is a Fibonacci number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🌀',
                    milestone: `F(${this.FIBONACCI.indexOf(fib) + 1}) = ${fib.toLocaleString()} days`
                });
            }
        }

        return events;
    },

    /**
     * Calculate Lucas number milestones (like Fibonacci but starts 2, 1)
     */
    calculateLucasMilestones(birthDate, maxDate) {
        const events = [];

        // Lucas seconds
        const lucasSeconds = this.LUCAS.filter(n => n >= 1e6 && n <= 3e9);
        for (const luc of lucasSeconds) {
            const eventDate = new Date(birthDate.getTime() + luc * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `lucas-seconds-${luc}`,
                    title: `Lucas Second ${luc.toLocaleString()}`,
                    description: `Second ${luc.toLocaleString()} is a Lucas number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🔷',
                    milestone: `L(${this.LUCAS.indexOf(luc) + 1}) = ${luc.toLocaleString()} seconds`
                });
            }
        }

        // Lucas minutes
        const lucasMinutes = this.LUCAS.filter(n => n >= 1e5 && n <= 5e7);
        for (const luc of lucasMinutes) {
            const eventDate = new Date(birthDate.getTime() + luc * this.MS_PER_MINUTE);
            if (eventDate <= maxDate) {
                events.push({
                    id: `lucas-minutes-${luc}`,
                    title: `Lucas Minute ${luc.toLocaleString()}`,
                    description: `Minute ${luc.toLocaleString()} is a Lucas number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🔷',
                    milestone: `L(${this.LUCAS.indexOf(luc) + 1}) = ${luc.toLocaleString()} minutes`
                });
            }
        }

        // Lucas hours
        const lucasHours = this.LUCAS.filter(n => n >= 10000 && n <= 1000000);
        for (const luc of lucasHours) {
            const eventDate = new Date(birthDate.getTime() + luc * this.MS_PER_HOUR);
            if (eventDate <= maxDate) {
                events.push({
                    id: `lucas-hours-${luc}`,
                    title: `Lucas Hour ${luc.toLocaleString()}`,
                    description: `Hour ${luc.toLocaleString()} is a Lucas number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🔷',
                    milestone: `L(${this.LUCAS.indexOf(luc) + 1}) = ${luc.toLocaleString()} hours`
                });
            }
        }

        // Lucas days
        const lucasDays = this.LUCAS.filter(n => n >= 100 && n <= 40000);
        for (const luc of lucasDays) {
            const eventDate = new Date(birthDate.getTime() + luc * this.MS_PER_DAY);
            if (eventDate <= maxDate) {
                events.push({
                    id: `lucas-days-${luc}`,
                    title: `Lucas Day ${luc.toLocaleString()}`,
                    description: `Day ${luc.toLocaleString()} is a Lucas number!`,
                    date: eventDate,
                    category: 'fibonacci',
                    icon: '🔷',
                    milestone: `L(${this.LUCAS.indexOf(luc) + 1}) = ${luc.toLocaleString()} days`
                });
            }
        }

        return events;
    },

    /**
     * Calculate perfect number milestones (numbers equal to sum of proper divisors)
     */
    calculatePerfectNumberMilestones(birthDate, maxDate) {
        const events = [];

        // Perfect number days (6, 28, 496, 8128)
        for (const perfect of this.PERFECT_NUMBERS) {
            const eventDate = new Date(birthDate.getTime() + perfect * this.MS_PER_DAY);
            if (eventDate <= maxDate) {
                events.push({
                    id: `perfect-days-${perfect}`,
                    title: `Perfect Day ${perfect}`,
                    description: `Day ${perfect} is a perfect number! (${perfect} = sum of its divisors)`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: '💎',
                    milestone: `${perfect} days (perfect number)`
                });
            }
        }

        // Perfect number hours (for larger ones)
        for (const perfect of [496, 8128]) {
            const eventDate = new Date(birthDate.getTime() + perfect * this.MS_PER_HOUR);
            if (eventDate <= maxDate) {
                events.push({
                    id: `perfect-hours-${perfect}`,
                    title: `Perfect Hour ${perfect.toLocaleString()}`,
                    description: `Hour ${perfect.toLocaleString()} is a perfect number!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: '💎',
                    milestone: `${perfect.toLocaleString()} hours (perfect number)`
                });
            }
        }

        return events;
    },

    /**
     * Calculate triangular number milestones (1+2+3+...+n)
     */
    calculateTriangularMilestones(birthDate, maxDate) {
        const events = [];

        // Only use interesting triangular numbers (every 10th or special ones)
        const interestingTriangular = this.TRIANGULAR.filter((t, i) =>
            (i + 1) % 10 === 0 || // Every 10th triangular number (T10, T20, T30...)
            t === 666 ||  // Number of the beast
            t === 5050 || // Famous 1+2+...+100
            t === 1225 || // T49 (7²)
            t === 2016 || // Recent year
            t === 3003 || // Symmetric
            t === 5778 || // Also Lucas!
            t === 8128    // Also perfect!
        );

        for (const tri of interestingTriangular) {
            if (tri >= 100 && tri <= 15000) {
                const eventDate = new Date(birthDate.getTime() + tri * this.MS_PER_DAY);
                if (eventDate <= maxDate) {
                    const n = Math.round((-1 + Math.sqrt(1 + 8 * tri)) / 2);
                    events.push({
                        id: `triangular-days-${tri}`,
                        title: `Triangular Day ${tri.toLocaleString()}`,
                        description: `Day ${tri.toLocaleString()} is triangular! (1+2+3+...+${n} = ${tri})`,
                        date: eventDate,
                        category: 'mathematical',
                        icon: '🔺',
                        milestone: `T(${n}) = ${tri.toLocaleString()} days`
                    });
                }
            }
        }

        // Triangular hours for larger numbers
        const triangularHours = this.TRIANGULAR.filter(t => t >= 10000 && t <= 100000 &&
            this.TRIANGULAR.indexOf(t) % 5 === 0);
        for (const tri of triangularHours) {
            const eventDate = new Date(birthDate.getTime() + tri * this.MS_PER_HOUR);
            if (eventDate <= maxDate) {
                const n = Math.round((-1 + Math.sqrt(1 + 8 * tri)) / 2);
                events.push({
                    id: `triangular-hours-${tri}`,
                    title: `Triangular Hour ${tri.toLocaleString()}`,
                    description: `Hour ${tri.toLocaleString()} is triangular! (1+2+...+${n})`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: '🔺',
                    milestone: `T(${n}) = ${tri.toLocaleString()} hours`
                });
            }
        }

        return events;
    },

    /**
     * Calculate palindrome milestones
     */
    calculatePalindromeMilestones(birthDate, maxDate) {
        const events = [];

        // Palindrome days (only interesting ones)
        const interestingPalindromes = this.PALINDROMES.filter(p =>
            p >= 1000 && p <= 15000 && (
                p % 1111 === 0 || // Like 1111, 2222, 3333...
                String(p).split('').every((c, i, a) => c === a[0]) || // All same digits
                p === 1001 || p === 1221 || p === 1331 || p === 1441 ||
                p === 2112 || p === 2552 || p === 3003 || p === 5005 ||
                p === 5775 || p === 7007 || p === 7337 || p === 9009 ||
                p === 10001 || p === 10101 || p === 11011 || p === 11111 ||
                p === 12321 || p === 12921
            )
        );

        for (const pal of interestingPalindromes) {
            const eventDate = new Date(birthDate.getTime() + pal * this.MS_PER_DAY);
            if (eventDate <= maxDate) {
                events.push({
                    id: `palindrome-days-${pal}`,
                    title: `Palindrome Day ${pal.toLocaleString()}`,
                    description: `Day ${pal} reads the same forwards and backwards!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: '🪞',
                    milestone: `${pal} days (palindrome)`
                });
            }
        }

        // Palindrome hours
        const palindromeHours = [10001, 10101, 10201, 11011, 11111, 11211, 12021, 12121, 12221, 12321];
        for (const pal of palindromeHours) {
            const eventDate = new Date(birthDate.getTime() + pal * this.MS_PER_HOUR);
            if (eventDate <= maxDate) {
                events.push({
                    id: `palindrome-hours-${pal}`,
                    title: `Palindrome Hour ${pal.toLocaleString()}`,
                    description: `Hour ${pal.toLocaleString()} is a palindrome!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: '🪞',
                    milestone: `${pal.toLocaleString()} hours (palindrome)`
                });
            }
        }

        return events;
    },

    /**
     * Calculate repunit milestones (numbers with all 1s)
     */
    calculateRepunitMilestones(birthDate, maxDate) {
        const events = [];

        // Repunit days
        for (const rep of this.REPUNITS) {
            if (rep >= 111 && rep <= 11111) {
                const eventDate = new Date(birthDate.getTime() + rep * this.MS_PER_DAY);
                if (eventDate <= maxDate) {
                    events.push({
                        id: `repunit-days-${rep}`,
                        title: `Repunit Day ${rep.toLocaleString()}`,
                        description: `Day ${rep.toLocaleString()} is all 1s!`,
                        date: eventDate,
                        category: 'binary',
                        icon: '1️⃣',
                        milestone: `${rep.toLocaleString()} days (repunit)`
                    });
                }
            }
        }

        // Repunit hours
        for (const rep of this.REPUNITS) {
            if (rep >= 1111 && rep <= 111111) {
                const eventDate = new Date(birthDate.getTime() + rep * this.MS_PER_HOUR);
                if (eventDate <= maxDate) {
                    events.push({
                        id: `repunit-hours-${rep}`,
                        title: `Repunit Hour ${rep.toLocaleString()}`,
                        description: `Hour ${rep.toLocaleString()} is all 1s!`,
                        date: eventDate,
                        category: 'binary',
                        icon: '1️⃣',
                        milestone: `${rep.toLocaleString()} hours (repunit)`
                    });
                }
            }
        }

        // Repunit minutes
        for (const rep of this.REPUNITS) {
            if (rep >= 111111 && rep <= 11111111) {
                const eventDate = new Date(birthDate.getTime() + rep * this.MS_PER_MINUTE);
                if (eventDate <= maxDate) {
                    events.push({
                        id: `repunit-minutes-${rep}`,
                        title: `Repunit Minute ${rep.toLocaleString()}`,
                        description: `Minute ${rep.toLocaleString()} is all 1s!`,
                        date: eventDate,
                        category: 'binary',
                        icon: '1️⃣',
                        milestone: `${rep.toLocaleString()} minutes (repunit)`
                    });
                }
            }
        }

        // Repunit seconds
        for (const rep of this.REPUNITS) {
            if (rep >= 11111111 && rep <= 1111111111) {
                const eventDate = new Date(birthDate.getTime() + rep * this.MS_PER_SECOND);
                if (eventDate <= maxDate) {
                    events.push({
                        id: `repunit-seconds-${rep}`,
                        title: `Repunit Second ${rep.toLocaleString()}`,
                        description: `Second ${rep.toLocaleString()} is all 1s!`,
                        date: eventDate,
                        category: 'binary',
                        icon: '1️⃣',
                        milestone: `${rep.toLocaleString()} seconds (repunit)`
                    });
                }
            }
        }

        return events;
    },

    /**
     * Calculate scientific constant milestones
     */
    calculateScientificMilestones(birthDate, maxDate) {
        const events = [];

        // Speed of light: 299,792,458 m/s - use as seconds!
        const speedOfLight = 299792458;
        const solEvent = new Date(birthDate.getTime() + speedOfLight * this.MS_PER_SECOND);
        if (solEvent <= maxDate) {
            events.push({
                id: 'speed-of-light-seconds',
                title: 'Speed of Light Seconds',
                description: `You've lived for ${speedOfLight.toLocaleString()} seconds - the speed of light in m/s!`,
                date: solEvent,
                category: 'mathematical',
                icon: '💡',
                milestone: `c = ${speedOfLight.toLocaleString()} seconds`
            });
        }

        // Euler's identity related: e^π ≈ 23.14
        const ePi = Math.pow(Math.E, Math.PI);
        for (const [mult, label] of [[1e6, 'Million'], [1e7, '10 Million'], [1e8, '100 Million']]) {
            const eventDate = new Date(birthDate.getTime() + ePi * mult * this.MS_PER_SECOND);
            if (eventDate <= maxDate) {
                events.push({
                    id: `e-pi-${mult}`,
                    title: `e^π × ${label} Seconds`,
                    description: `You've lived for e^π × ${mult.toLocaleString()} ≈ ${Math.floor(ePi * mult).toLocaleString()} seconds!`,
                    date: eventDate,
                    category: 'mathematical',
                    icon: '🧮',
                    milestone: `e^π × ${mult.toLocaleString()} seconds`
                });
            }
        }

        return events;
    },

    /**
     * Calculate pop culture milestones
     */
    calculatePopCultureMilestones(birthDate, maxDate) {
        const events = [];

        // 42 milestones (Hitchhiker's Guide)
        const answer42 = [
            { value: 42 * 1e6, unit: 'seconds', label: '42 Million Seconds' },
            { value: 42 * 1e8, unit: 'seconds', label: '4.2 Billion Seconds' },
            { value: 42 * 100, unit: 'days', label: '4,200 Days' },
            { value: 42 * 1000, unit: 'hours', label: '42,000 Hours' }
        ];

        for (const milestone of answer42) {
            let eventDate;
            if (milestone.unit === 'seconds') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            } else if (milestone.unit === 'days') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_DAY);
            } else if (milestone.unit === 'hours') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_HOUR);
            }

            if (eventDate <= maxDate) {
                events.push({
                    id: `42-${milestone.value}-${milestone.unit}`,
                    title: milestone.label,
                    description: `The Answer to the Ultimate Question! (${milestone.value.toLocaleString()} ${milestone.unit})`,
                    date: eventDate,
                    category: 'pop-culture',
                    icon: '🌌',
                    milestone: `42 × ${(milestone.value / 42).toLocaleString()} ${milestone.unit}`
                });
            }
        }

        // 1337 (leet) milestones
        const leetMilestones = [
            { value: 1337 * 1e4, unit: 'seconds', label: '13.37 Million Seconds' },
            { value: 1337, unit: 'days', label: '1,337 Days' },
            { value: 13370, unit: 'hours', label: '13,370 Hours' }
        ];

        for (const milestone of leetMilestones) {
            let eventDate;
            if (milestone.unit === 'seconds') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_SECOND);
            } else if (milestone.unit === 'days') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_DAY);
            } else if (milestone.unit === 'hours') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_HOUR);
            }

            if (eventDate <= maxDate) {
                events.push({
                    id: `1337-${milestone.value}-${milestone.unit}`,
                    title: milestone.label,
                    description: `You're now officially 1337 (elite)! 🎮`,
                    date: eventDate,
                    category: 'pop-culture',
                    icon: '🎮',
                    milestone: `1337 × ${(milestone.value / 1337).toLocaleString()} ${milestone.unit}`
                });
            }
        }

        // Pi Day style milestones (314, 31415, etc.)
        const piDayMilestones = [
            { value: 314, unit: 'days', label: '314 Days' },
            { value: 3141, unit: 'days', label: '3,141 Days' },
            { value: 31415, unit: 'hours', label: '31,415 Hours' }
        ];

        for (const milestone of piDayMilestones) {
            let eventDate;
            if (milestone.unit === 'days') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_DAY);
            } else if (milestone.unit === 'hours') {
                eventDate = new Date(birthDate.getTime() + milestone.value * this.MS_PER_HOUR);
            }

            if (eventDate <= maxDate) {
                events.push({
                    id: `piday-${milestone.value}-${milestone.unit}`,
                    title: milestone.label,
                    description: `A π-inspired milestone (3.14159...)!`,
                    date: eventDate,
                    category: 'pop-culture',
                    icon: '🥧',
                    milestone: `${milestone.value.toLocaleString()} ${milestone.unit}`
                });
            }
        }

        return events;
    },

    /**
     * Calculate nerdy holiday milestones (Pi Day, May 4th, Tau Day)
     */
    calculateNerdyHolidays(birthDate, maxDate) {
        const events = [];
        const holidays = [
            { month: 2, day: 14, name: 'Pi Day', icon: '🥧', desc: 'March 14 (3.14)' },
            { month: 4, day: 4, name: 'May the 4th', icon: '⚔️', desc: 'Star Wars Day' },
            { month: 5, day: 28, name: 'Tau Day', icon: '🌀', desc: 'June 28 (τ ≈ 6.28)' }
        ];

        // Calculate max years based on date range
        const maxYears = 120;

        for (const holiday of holidays) {
            for (let year = 1; year <= maxYears; year++) {
                // Calculate the date of this holiday in the milestone year
                const holidayDate = new Date(
                    birthDate.getFullYear() + year,
                    holiday.month,
                    holiday.day,
                    birthDate.getHours(),
                    birthDate.getMinutes()
                );

                // Check if this date is after birth and before max
                if (holidayDate > birthDate && holidayDate <= maxDate) {
                    const ordinal = this.getOrdinal(year);
                    events.push({
                        id: `${holiday.name.toLowerCase().replace(/\s/g, '-')}-${year}`,
                        title: `${ordinal} ${holiday.name}`,
                        description: `Your ${ordinal} ${holiday.name}! (${holiday.desc})`,
                        date: holidayDate,
                        category: 'pop-culture',
                        icon: holiday.icon,
                        milestone: `${year} years of ${holiday.name}`
                    });
                }
            }
        }

        return events;
    },

    /**
     * Calculate Earth birthday milestones
     */
    calculateEarthBirthdays(birthDate, maxDate) {
        const events = [];
        const maxYears = 120;

        // Special age labels
        const primes = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113]);
        const squares = { 4: '2²', 9: '3²', 16: '4²', 25: '5²', 36: '6²', 49: '7²', 64: '8²', 81: '9²', 100: '10²' };
        const powersOf2 = { 2: '2¹', 4: '2²', 8: '2³', 16: '2⁴', 32: '2⁵', 64: '2⁶' };
        const cubes = { 8: '2³', 27: '3³', 64: '4³' };
        const hexRound = { 16: '0x10', 32: '0x20', 48: '0x30', 64: '0x40', 80: '0x50', 96: '0x60', 112: '0x70' };

        for (let year = 1; year <= maxYears; year++) {
            const birthdayDate = new Date(
                birthDate.getFullYear() + year,
                birthDate.getMonth(),
                birthDate.getDate(),
                birthDate.getHours(),
                birthDate.getMinutes()
            );

            if (birthdayDate > birthDate && birthdayDate <= maxDate) {
                const ordinal = this.getOrdinal(year);

                // Build special labels
                const labels = [];
                if (year === 42) labels.push('The Answer! 🌌');
                if (primes.has(year)) labels.push('Prime');
                if (squares[year]) labels.push(`Perfect Square (${squares[year]})`);
                if (powersOf2[year]) labels.push(`Power of 2 (${powersOf2[year]})`);
                if (cubes[year]) labels.push(`Perfect Cube (${cubes[year]})`);
                if (hexRound[year]) labels.push(`Hex Round (${hexRound[year]})`);

                const specialLabel = labels.length > 0 ? ` — ${labels.join(', ')}` : '';

                events.push({
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

        return events;
    },

    /**
     * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
     */
    getOrdinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },

    /**
     * Convert number to superscript string
     */
    toSuperscript(num) {
        const superscripts = {
            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
        };
        return String(num).split('').map(d => superscripts[d] || d).join('');
    },

    /**
     * Format a date for display
     */
    formatDate(date) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Format relative time (days until/since)
     */
    formatRelative(days) {
        if (days === 0) return 'Today!';
        if (days === 1) return 'Tomorrow!';
        if (days === -1) return 'Yesterday';
        if (days > 0) {
            if (days < 7) return `In ${days} days`;
            if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
            if (days < 365) return `In ${Math.floor(days / 30)} months`;
            return `In ${(days / 365).toFixed(1)} years`;
        } else {
            const absDays = Math.abs(days);
            if (absDays < 7) return `${absDays} days ago`;
            if (absDays < 30) return `${Math.floor(absDays / 7)} weeks ago`;
            if (absDays < 365) return `${Math.floor(absDays / 30)} months ago`;
            return `${(absDays / 365).toFixed(1)} years ago`;
        }
    },

    /**
     * Get the next upcoming event
     */
    getNextEvent(events) {
        const now = new Date();
        return events.find(e => e.date > now);
    },

    /**
     * Get category display info
     */
    getCategoryInfo(category) {
        const categories = {
            'planetary': { name: 'Planetary', icon: '🪐', color: '#f4d58d' },
            'decimal': { name: 'Decimal', icon: '🔢', color: '#10b981' },
            'binary': { name: 'Number Bases', icon: '💻', color: '#06b6d4' },
            'mathematical': { name: 'Mathematical', icon: 'π', color: '#a855f7' },
            'fibonacci': { name: 'Fibonacci', icon: '🌀', color: '#f59e0b' },
            'pop-culture': { name: 'Pop Culture', icon: '🎬', color: '#ef4444' }
        };
        return categories[category] || { name: category, icon: '📅', color: '#7c3aed' };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Nerdiversary;
}
