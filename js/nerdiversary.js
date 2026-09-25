/**
 * Browser-side wrapper around the shared Calculator (js/calculator.js).
 *
 * Adds the fields the results page needs on top of each event (isPast,
 * daysFromNow) and the display formatters for dates. Used by js/results.js;
 * the worker calls Calculator directly and does not load this file.
 */

import MilestonesRef from './milestones.js';
import CalculatorRef from './calculator.js';

const Nerdiversary = {

    /**
     * Every milestone from birth up to `yearsAhead` years after birth, past ones
     * included, sorted by date.
     * @param {Date} birthDate - Birth instant
     * @param {number} [yearsAhead=100] - Horizon, counted from the birth date (not from today)
     * @returns {Array<Object>} Calculator events, each with `isPast` and `daysFromNow`
     *   (whole days, floored, so negative for anything earlier than now) added
     */
    calculate(birthDate, yearsAhead = 100) {
        const now = new Date();

        const events = CalculatorRef.calculate(birthDate, {
            yearsAhead,
            includePast: true
        });

        return events.map(event => ({
            ...event,
            isPast: event.date < now,
            daysFromNow: Math.floor((event.date.getTime() - now.getTime()) / MilestonesRef.MS_PER_DAY)
        }));
    },

    /**
     * Same as Milestones.getOrdinal: 1 -> "1st", 22 -> "22nd".
     * @param {number} n
     * @returns {string}
     */
    getOrdinal(n) {
        return MilestonesRef.getOrdinal(n);
    },

    /**
     * Same as Milestones.toSuperscript: 20 -> "²⁰".
     * @param {number} num
     * @returns {string}
     */
    toSuperscript(num) {
        return MilestonesRef.toSuperscript(num);
    },

    /**
     * Date and time in the device's time zone, e.g.
     * "Friday, September 25, 2026 at 12:01 AM".
     * @param {Date} date
     * @returns {string}
     */
    formatDate(date) {
        /** @type {Intl.DateTimeFormatOptions} */
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
     * Distance from today in the largest whole unit: "Tomorrow", "In 3 weeks",
     * "5 months ago", "In 12.3 years". Months are 30 days and years 365.
     * @param {number} days - Signed day count, e.g. an event's `daysFromNow`
     * @returns {string}
     */
    formatRelative(days) {
        if (days === 0) { return 'Today'; }
        if (days === 1) { return 'Tomorrow'; }
        if (days === -1) { return 'Yesterday'; }
        const absDays = Math.abs(days);
        const count = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
        let span = `${(absDays / 365).toFixed(1)} years`;
        if (absDays < 7) {
            span = count(absDays, 'day');
        } else if (absDays < 30) {
            span = count(Math.floor(absDays / 7), 'week');
        } else if (absDays < 365) {
            span = count(Math.floor(absDays / 30), 'month');
        }
        return days > 0 ? `In ${span}` : `${span} ago`;
    }
};

export default Nerdiversary;
