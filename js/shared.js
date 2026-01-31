/**
 * Shared utilities for Nerdiversary
 * Pure functions (no DOM, no browser APIs) that work in both browser and worker contexts.
 */

// Cloudflare Worker URL
export const WORKER_URL = 'https://nerdiversary-calendar.curly-unit-b9e0.workers.dev';

/**
 * Parse family parameter string into array of members
 * @param {string} familyParam - Comma-separated "Name|Date|Time" entries
 * @returns {Array<{name: string, dateStr: string, timeStr: string, birthDate: Date}>}
 */
export function parseFamilyParam(familyParam) {
    try {
        return familyParam.split(',').map(m => {
            const parts = m.split('|');
            const name = decodeURIComponent(parts[0] || '');
            const dateStr = parts[1] || '';
            const timeStr = parts[2] || '00:00';
            const birthDate = new Date(`${dateStr}T${timeStr}:00`);
            return { name, dateStr, timeStr, birthDate };
        }).filter(m => m.name && !isNaN(m.birthDate.getTime()));
    } catch {
        return [];
    }
}

/**
 * Format a notification title based on how far away the event is
 * @param {string} icon - Emoji icon for the event
 * @param {number} minutesBefore - Minutes before the event (0 = now)
 * @returns {string} Formatted title string
 */
export function formatNotificationTitle(icon, minutesBefore) {
    if (minutesBefore === 0) {
        return `${icon} It's happening NOW!`;
    } else if (minutesBefore < 60) {
        return `${icon} ${minutesBefore} minutes away!`;
    } else if (minutesBefore < 1440) {
        const hours = Math.round(minutesBefore / 60);
        return `${icon} ${hours} hour${hours > 1 ? 's' : ''} away!`;
    } else {
        const days = Math.round(minutesBefore / 1440);
        return `${icon} ${days} day${days > 1 ? 's' : ''} away!`;
    }
}

/**
 * Format a Date to iCalendar format (YYYYMMDDTHHMMSSZ)
 * @param {Date} date
 * @returns {string}
 */
export function formatICalDate(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters in iCal text values.
 * Strips HTML tags first, then escapes iCal-special characters.
 * @param {string} text
 * @returns {string}
 */
export function escapeICalText(text) {
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Get category display info (name, icon, color)
 * @param {string} category
 * @returns {{name: string, icon: string, color: string}}
 */
export function getCategoryInfo(category) {
    const categories = {
        planetary: { name: 'Planetary', icon: '\u{1FA90}', color: '#f4d58d' },
        decimal: { name: 'Decimal', icon: '\u{1F522}', color: '#10b981' },
        binary: { name: 'Number Bases', icon: '\u{1F4BB}', color: '#06b6d4' },
        mathematical: { name: 'Mathematical', icon: '\u03C0', color: '#a855f7' },
        fibonacci: { name: 'Fibonacci', icon: '\u{1F300}', color: '#f59e0b' },
        scientific: { name: 'Scientific', icon: '\u{1F52C}', color: '#3b82f6' },
        'pop-culture': { name: 'Pop Culture', icon: '\u{1F3AC}', color: '#ef4444' }
    };
    return categories[category] || { name: category, icon: '\u{1F4C5}', color: '#7c3aed' };
}

/**
 * Generate an iCalendar (.ics) string from an array of events.
 * This is the full-featured version with VALARM, DTSTAMP, DTEND, and CATEGORIES.
 * @param {Array} events - Array of event objects with {id, title, description, date, category, icon, personName?}
 * @param {boolean} isFamily - Whether this is a family calendar
 * @returns {string} iCalendar formatted string
 */
export function generateICal(events, isFamily = false) {
    const calName = isFamily ? 'Family Nerdiversaries' : 'My Nerdiversaries';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Nerdiversary//Nerdy Anniversary Calculator//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${calName}`,
        'X-WR-CALDESC:Nerdy anniversary milestones'
    ];

    for (const event of events) {
        const uid = `${event.id}@nerdiversary`;
        const dtstamp = formatICalDate(new Date());
        const dtstart = formatICalDate(event.date);
        const dtend = formatICalDate(new Date(event.date.getTime() + 60 * 60 * 1000));
        const categoryInfo = getCategoryInfo(event.category);

        const title = isFamily && event.personName
            ? `${event.icon} ${event.personName}: ${event.title}`
            : `${event.icon} ${event.title}`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(`DTSTART:${dtstart}`);
        lines.push(`DTEND:${dtend}`);
        lines.push(`SUMMARY:${escapeICalText(title)}`);
        lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
        lines.push(`CATEGORIES:${categoryInfo.name}`);
        lines.push('STATUS:CONFIRMED');
        lines.push('TRANSP:TRANSPARENT');
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-P1D');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:${escapeICalText(`Tomorrow: ${event.title}`)}`);
        lines.push('END:VALARM');
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT1H');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:${escapeICalText(`In 1 hour: ${event.title}`)}`);
        lines.push('END:VALARM');
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}
