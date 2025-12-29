/**
 * Nerdiversary Calculator
 * Wrapper around shared Calculator for website use
 *
 * In browser: Requires js/milestones.js and js/calculator.js to be loaded first
 * In ESM: Dependencies are imported below
 */

// ESM imports for Node.js and bundlers
import MilestonesModule from './milestones.js';
import CalculatorModule from './calculator.js';

// Use global versions if available (browser), otherwise use imported modules
const MilestonesRef = typeof Milestones !== 'undefined' ? Milestones : MilestonesModule;
const CalculatorRef = typeof Calculator !== 'undefined' ? Calculator : CalculatorModule;

const Nerdiversary = {

    /**
     * Calculate all nerdiversaries for a given birthdate
     * @param {Date} birthDate - The birth date/time
     * @param {number} yearsAhead - How many years ahead to calculate (default 100)
     * @returns {Array} Array of nerdiversary objects with relative time info
     */
    calculate(birthDate, yearsAhead = 100) {
        const now = new Date();

        // Use shared calculator
        const events = CalculatorRef.calculate(birthDate, {
            yearsAhead,
            includePast: true
        });

        // Add relative time info for website display
        return events.map(event => ({
            ...event,
            isPast: event.date < now,
            daysFromNow: Math.floor((event.date - now) / MilestonesRef.MS_PER_DAY)
        }));
    },

    /**
     * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
     */
    getOrdinal(n) {
        return MilestonesRef.getOrdinal(n);
    },

    /**
     * Convert number to superscript string
     */
    toSuperscript(num) {
        return MilestonesRef.toSuperscript(num);
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
        if (days === 0) { return 'Today!'; }
        if (days === 1) { return 'Tomorrow!'; }
        if (days === -1) { return 'Yesterday'; }
        if (days > 0) {
            if (days < 7) { return `In ${days} days`; }
            if (days < 30) { return `In ${Math.floor(days / 7)} weeks`; }
            if (days < 365) { return `In ${Math.floor(days / 30)} months`; }
            return `In ${(days / 365).toFixed(1)} years`;
        }
            const absDays = Math.abs(days);
            if (absDays < 7) { return `${absDays} days ago`; }
            if (absDays < 30) { return `${Math.floor(absDays / 7)} weeks ago`; }
            if (absDays < 365) { return `${Math.floor(absDays / 30)} months ago`; }
            return `${(absDays / 365).toFixed(1)} years ago`;
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
            planetary: { name: 'Planetary', icon: '🪐', color: '#f4d58d' },
            decimal: { name: 'Decimal', icon: '🔢', color: '#10b981' },
            binary: { name: 'Number Bases', icon: '💻', color: '#06b6d4' },
            mathematical: { name: 'Mathematical', icon: 'π', color: '#a855f7' },
            fibonacci: { name: 'Fibonacci', icon: '🌀', color: '#f59e0b' },
            'pop-culture': { name: 'Pop Culture', icon: '🎬', color: '#ef4444' }
        };
        return categories[category] || { name: category, icon: '📅', color: '#7c3aed' };
    }
};

// ESM export
export default Nerdiversary;
