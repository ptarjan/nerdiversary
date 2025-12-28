/**
 * iCalendar Generator for Nerdiversary events
 */

const ICalGenerator = {
    /**
     * Generate iCalendar content from events
     * @param {Array} events - Array of nerdiversary events
     * @param {Date} birthDate - The birth date
     * @returns {string} iCalendar formatted string
     */
    generate(events, birthDate) {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Nerdiversary//Nerdy Anniversary Calculator//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:My Nerdiversaries',
            'X-WR-CALDESC:Nerdy anniversary milestones'
        ];

        for (const event of events) {
            lines.push(...this.createEvent(event));
        }

        lines.push('END:VCALENDAR');

        return lines.join('\r\n');
    },

    /**
     * Create a single VEVENT
     * @param {Object} event - Nerdiversary event object
     * @returns {Array} Array of iCal lines for the event
     */
    createEvent(event) {
        const uid = `${event.id}@nerdiversary`;
        const dtstamp = this.formatDate(new Date());
        const dtstart = this.formatDate(event.date);
        const dtend = this.formatDate(new Date(event.date.getTime() + 60 * 60 * 1000)); // 1 hour duration

        const categoryInfo = Nerdiversary.getCategoryInfo(event.category);

        const lines = [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `SUMMARY:${this.escapeText(`${event.icon} ${event.title}`)}`,
            `DESCRIPTION:${this.escapeText(event.description)}`,
            `CATEGORIES:${categoryInfo.name}`,
            'STATUS:CONFIRMED',
            'TRANSP:TRANSPARENT',
            // Add alarm 1 day before
            'BEGIN:VALARM',
            'TRIGGER:-P1D',
            'ACTION:DISPLAY',
            `DESCRIPTION:${this.escapeText(`Tomorrow: ${event.title}`)}`,
            'END:VALARM',
            // Add alarm 1 hour before
            'BEGIN:VALARM',
            'TRIGGER:-PT1H',
            'ACTION:DISPLAY',
            `DESCRIPTION:${this.escapeText(`In 1 hour: ${event.title}`)}`,
            'END:VALARM',
            'END:VEVENT'
        ];

        return lines;
    },

    /**
     * Format date to iCalendar format (YYYYMMDDTHHMMSSZ)
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    },

    /**
     * Escape special characters in iCal text
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeText(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ICalGenerator;
}
