/**
 * Nerdiversary Calculator
 * Calculates various nerdy anniversary milestones
 */

const Nerdiversary = {
    // Time constants in milliseconds
    MS_PER_SECOND: 1000,
    MS_PER_MINUTE: 60 * 1000,
    MS_PER_HOUR: 60 * 60 * 1000,
    MS_PER_DAY: 24 * 60 * 60 * 1000,
    MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
    MS_PER_YEAR: 365.2425 * 24 * 60 * 60 * 1000, // Gregorian calendar average

    // Planetary orbital periods in Earth days
    PLANETS: {
        mercury: { name: 'Mercury', days: 87.969, icon: '☿️', color: '#8c8c8c' },
        venus: { name: 'Venus', days: 224.701, icon: '♀️', color: '#e6c229' },
        mars: { name: 'Mars', days: 686.980, icon: '♂️', color: '#e04f39' },
        jupiter: { name: 'Jupiter', days: 4332.59, icon: '♃', color: '#d8a066' },
        saturn: { name: 'Saturn', days: 10759.22, icon: '♄', color: '#f4d58d' },
        uranus: { name: 'Uranus', days: 30688.5, icon: '⛢', color: '#4fd0e7' },
        neptune: { name: 'Neptune', days: 60182, icon: '♆', color: '#4b70dd' }
    },

    // Mathematical constants
    PI: Math.PI,
    E: Math.E,
    PHI: (1 + Math.sqrt(5)) / 2, // Golden ratio
    TAU: 2 * Math.PI,

    // Fibonacci sequence (useful range for time milestones)
    FIBONACCI: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040, 1346269, 2178309, 3524578, 5702887, 9227465, 14930352, 24157817, 39088169, 63245986],

    // Powers of 2 for binary milestones
    POWERS_OF_2: [10, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],

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

        // Add pop culture milestones
        events.push(...this.calculatePopCultureMilestones(birthDate, maxDate));

        // Add nerdy holidays (Pi Day, May 4th, Tau Day)
        events.push(...this.calculateNerdyHolidays(birthDate, maxDate));

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
            { value: 1e5, label: '100,000 Minutes', short: '10⁵ minutes' },
            { value: 1e6, label: '1 Million Minutes', short: '10⁶ minutes' },
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

        // Days milestones
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

        // Fibonacci hours (larger ones)
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
            'binary': { name: 'Binary/Hex', icon: '💻', color: '#06b6d4' },
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
