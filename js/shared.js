/**
 * Shared utilities for Nerdiversary
 * Pure functions (no DOM, no browser APIs) that work in both browser and worker contexts.
 */

// Cloudflare Worker URL
export const WORKER_URL = 'https://nerdiversary-calendar.curly-unit-b9e0.workers.dev';

// Canonical site URL (used for share redirects and OG images)
export const SITE_URL = 'https://paultarjan.com/nerdiversary/';

/**
 * Convert a local date/time in a specific IANA timezone to UTC.
 * This handles historical DST correctly — e.g., 2024-05-15 20:37
 * in America/Denver is MDT (UTC-6), not MST (UTC-7).
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:MM format
 * @param {string} timezone - IANA timezone name (e.g. "America/Denver")
 * @returns {Date}
 */
export function localToUtcWithTimezone(dateStr, timeStr, timezone) {
    // Create a UTC date as a starting guess
    const guess = new Date(`${dateStr}T${timeStr}:00Z`);
    // Get the offset for this date in the target timezone
    const utcStr = guess.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = guess.toLocaleString('en-US', { timeZone: timezone });
    const offsetMs = new Date(utcStr).getTime() - new Date(tzStr).getTime();
    // Apply offset: local + offset = UTC
    return new Date(guess.getTime() + offsetMs);
}

/**
 * Parse family parameter string into array of members
 * @param {string} familyParam - Comma-separated "Name|Date|Time|Timezone" entries
 * @returns {Array<{name: string, dateStr: string, timeStr: string, timezone: string, birthDate: Date}>}
 */
export function parseFamilyParam(familyParam) {
    try {
        return familyParam.split(',').map(m => {
            const parts = m.split('|');
            let name;
            try {
                name = decodeURIComponent(parts[0] || '');
            } catch {
                // Legacy/hand-typed URLs may contain a raw % — keep the name as-is
                // rather than dropping the whole family
                name = parts[0] || '';
            }
            const dateStr = parts[1] || '';
            const timeStr = parts[2] || '00:00';
            const timezone = parts[3] || '';
            let birthDate;
            if (timezone) {
                try {
                    // Explicit birth timezone: convert to the true UTC instant
                    birthDate = localToUtcWithTimezone(dateStr, timeStr, timezone);
                } catch {
                    // Invalid timezone string — fall back to environment-local parsing
                    birthDate = new Date(`${dateStr}T${timeStr}:00`);
                }
            } else {
                birthDate = new Date(`${dateStr}T${timeStr}:00`);
            }
            return { name, dateStr, timeStr, timezone, birthDate };
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
    }
    const days = Math.round(minutesBefore / 1440);
    return `${icon} ${days} day${days > 1 ? 's' : ''} away!`;
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
 * Fold an iCal content line to 75 octets per RFC 5545 §3.1.
 * Continuation lines start with a single space. Splits on code point
 * boundaries so multi-byte characters (emoji) are never cut in half.
 * @param {string} line
 * @returns {string} The folded line (may contain CRLF + space)
 */
export function foldICalLine(line) {
    const encoder = new TextEncoder();
    if (encoder.encode(line).length <= 75) { return line; }

    const folded = [];
    let current = '';
    let currentOctets = 0;
    for (const ch of line) {
        const chOctets = encoder.encode(ch).length;
        if (currentOctets + chOctets > 75) {
            folded.push(current);
            current = ' ';
            currentOctets = 1;
        }
        current += ch;
        currentOctets += chOctets;
    }
    folded.push(current);
    return folded.join('\r\n');
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
    return lines.map(foldICalLine).join('\r\n');
}
