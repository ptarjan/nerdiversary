/**
 * Code that must behave identically in the browser and in the Cloudflare
 * Worker: the family URL format, birth-time time zone conversion, HTML
 * escaping, notification titles, and .ics generation.
 *
 * Imported by js/main.js, js/results.js, js/notifications.js and
 * worker/worker.js. Nothing
 * here may touch the DOM or window; the worker has neither.
 */

// Base URL of the Cloudflare Worker (worker/worker.js): calendar feeds,
// push subscriptions and /share pages.
export const WORKER_URL = 'https://nerdiversary-calendar.curly-unit-b9e0.workers.dev';

// Public URL of the static site. The worker's /share pages redirect here and
// point their OG images here.
export const SITE_URL = 'https://paultarjan.com/nerdiversary/';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const zoneFormatters = new Map();

/**
 * Offset of `timezone` from UTC at the instant `ms`, in ms (UTC+1 is +3600000).
 * @param {number} ms
 * @param {string} timezone
 * @returns {number}
 */
function zoneOffsetAt(ms, timezone) {
    let fmt = zoneFormatters.get(timezone);
    if (!fmt) {
        fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone, hourCycle: 'h23', era: 'short',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
        });
        zoneFormatters.set(timezone, fmt);
    }
    const p = Object.fromEntries(fmt.formatToParts(ms).map(({ type, value }) => [type, value]));
    const year = p.era === 'BC' ? 1 - Number(p.year) : Number(p.year);
    const wall = new Date(0);
    wall.setUTCFullYear(year, Number(p.month) - 1, Number(p.day));
    wall.setUTCHours(Number(p.hour), Number(p.minute), Number(p.second), 0);
    return wall.getTime() - (ms - (((ms % 1000) + 1000) % 1000));
}

/**
 * Convert a wall-clock birth date and time in an IANA time zone to the UTC
 * instant, using the offset in force at that wall-clock time (so 2024-05-15
 * 20:37 in America/Denver is MDT, UTC-6). Around a DST switch this follows
 * Temporal's "compatible" disambiguation:
 * - a time skipped by spring-forward is moved forward by the gap
 *   (Europe/Paris 2024-03-31 02:30 becomes 03:30 CEST);
 * - a time repeated by fall-back resolves to the earlier instant
 *   (Europe/Paris 2024-10-27 02:30 is 02:30 CEST, not CET).
 *
 * Throws RangeError for an unknown time zone name.
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:MM format
 * @param {string} timezone - IANA timezone name (e.g. "America/Denver")
 * @returns {Date}
 */
export function localToUtcWithTimezone(dateStr, timeStr, timezone) {
    // The wall-clock digits read as if they were UTC.
    const wall = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
    // A day either side is outside any single DST switch, so these are the
    // offsets before and after it (equal when there is no switch nearby).
    const offsetBefore = zoneOffsetAt(wall - MS_PER_DAY, timezone);
    const offsetAfter = zoneOffsetAt(wall + MS_PER_DAY, timezone);
    // A candidate is valid when the zone really shows `wall` at that instant.
    const valid = [wall - offsetBefore, wall - offsetAfter]
        .filter(ms => zoneOffsetAt(ms, timezone) === wall - ms);
    if (valid.length) {
        return new Date(Math.min(...valid));
    }
    // In a spring-forward gap: apply the pre-switch offset, which lands the
    // same distance past the switch as the wall time is past its start.
    return new Date(wall - offsetBefore);
}

/**
 * Parse the `family` URL parameter, the one format every page and the worker
 * use to pass birthdays around: comma-separated `name|YYYY-MM-DD|HH:MM|IANA-zone`
 * entries. Time and zone are optional; the name is percent-encoded so it can
 * contain `,` and `|`.
 *
 * With no zone the birth time is read in the local zone of whatever runs this:
 * the device in the browser, UTC in the worker. Entries with no name or an
 * unparseable date are dropped.
 * @param {string} familyParam - Value after URLSearchParams decoding, so names are still encoded once
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
                // A hand-typed name can contain a bare % that is not an escape;
                // keep it as typed rather than dropping the member.
                name = parts[0] || '';
            }
            const dateStr = parts[1] || '';
            const timeStr = parts[2] || '00:00';
            const timezone = parts[3] || '';
            let birthDate;
            if (timezone) {
                try {
                    birthDate = localToUtcWithTimezone(dateStr, timeStr, timezone);
                } catch {
                    // Unknown zone name: treat the time as local, as if no zone were given
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
 * Build the `family` URL parameter that parseFamilyParam reads. Trailing empty
 * fields are left off. Put it in a URL with encodeURIComponent on top, because
 * URLSearchParams.get() decodes once and each name must still be encoded
 * after that.
 * @param {Array<{name: string, date: string, time?: string, timezone?: string}>} family
 * @returns {string}
 */
export function buildFamilyParam(family) {
    return family.map(m => {
        let param = `${encodeURIComponent(m.name)}|${m.date}`;
        if (m.time || m.timezone) {
            param += `|${m.time || ''}`;
        }
        if (m.timezone) {
            param += `|${m.timezone}`;
        }
        return param;
    }).join(',');
}

/**
 * Escape text for HTML, both between tags and inside a quoted attribute
 * value. Every value that is not a literal in the code goes through this
 * before it is put into HTML.
 * @param {unknown} text
 * @returns {string}
 */
export function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Title line for a milestone that is arriving now. Used by the push
// notification title, the local notification and the celebration overlay, and
// asserted by tests through this binding rather than a copy of the words.
export const HAPPENING_NOW = 'Happening now';

// Every label the results page's notification button can show, keyed by
// state. Tests import this to assert the button's state without copying the
// wording.
export const NOTIFY_LABELS = {
    blocked: 'Notifications blocked',
    on: 'Notifications on',
    off: 'Enable notifications'
};

/**
 * Notification title for an alert sent `minutesBefore` minutes ahead of a
 * milestone: "<icon> Happening now", "<icon> In 5 minutes", "<icon> In 1 hour",
 * "<icon> In 1 day". Hours and days are rounded. Used for both server push
 * (worker) and local timer notifications (notifications.js).
 * @param {string} icon - The event's emoji
 * @param {number} minutesBefore - 0 means the milestone is now
 * @returns {string}
 */
export function formatNotificationTitle(icon, minutesBefore) {
    if (minutesBefore === 0) {
        return `${icon} ${HAPPENING_NOW}`;
    } else if (minutesBefore < 60) {
        return `${icon} In ${minutesBefore} minute${minutesBefore === 1 ? '' : 's'}`;
    } else if (minutesBefore < 1440) {
        const hours = Math.round(minutesBefore / 60);
        return `${icon} In ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    const days = Math.round(minutesBefore / 1440);
    return `${icon} In ${days} day${days > 1 ? 's' : ''}`;
}

/**
 * Format a Date as an iCalendar UTC timestamp (YYYYMMDDTHHMMSSZ). Also the
 * format Google Calendar's `dates` URL parameter takes.
 * @param {Date} date
 * @returns {string}
 */
export function formatICalDate(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Make text safe for an iCal TEXT value: strip HTML tags (event descriptions
 * contain Wikipedia <a> links), then escape backslash, `;`, `,` and newline.
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
 * Fold an iCal content line to at most 75 UTF-8 octets per line (RFC 5545
 * §3.1). Continuation lines start with one space, which counts toward their 75.
 * Splits between code points so an emoji is never cut in half.
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
 * Display name, icon and color for a milestone category. An unknown category
 * gets its own id as the name and a calendar icon.
 * @param {string} category - Event `category`, e.g. "planetary", "pop-culture"
 * @returns {{name: string, icon: string, color: string}}
 */
export function getCategoryInfo(category) {
    const categories = {
        planetary: { name: 'Planetary', icon: '\u{1FA90}', color: '#f4d58d' },
        decimal: { name: 'Decimal', icon: '\u{1F522}', color: '#10b981' },
        binary: { name: 'Number bases', icon: '\u{1F4BB}', color: '#06b6d4' },
        mathematical: { name: 'Mathematical', icon: '\u03C0', color: '#a855f7' },
        fibonacci: { name: 'Fibonacci', icon: '\u{1F300}', color: '#f59e0b' },
        scientific: { name: 'Scientific', icon: '\u{1F52C}', color: '#3b82f6' },
        'pop-culture': { name: 'Pop culture', icon: '\u{1F3AC}', color: '#ef4444' }
    };
    return categories[category] || { name: category, icon: '\u{1F4C5}', color: '#7c3aed' };
}

/**
 * Build a complete .ics calendar. The worker serves it as the subscription
 * feed; the results page offers it as a download. Each event lasts one hour and
 * carries two reminders, one day and one hour before.
 *
 * UIDs are `<event.id>@nerdiversary`, so ids must be unique across the whole
 * calendar and stable between feed refreshes; callers prefix per-person ids
 * with the person's name.
 * @param {Array<{id: string, title: string, description: string, date: Date, category: string, icon: string, personName?: string}>} events
 * @param {boolean} [isFamily=false] - Prefix titles with the person's name and use the family calendar name
 * @returns {string} CRLF-separated, line-folded iCalendar text
 */
export function generateICal(events, isFamily = false) {
    const calName = isFamily ? 'Nerdiversary: family milestones' : 'Nerdiversary: my milestones';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Nerdiversary//Nerdy Anniversary Calculator//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${calName}`,
        `X-WR-CALDESC:${escapeICalText('Dates you turn 1 billion seconds old, have a Mars birthday, and pass other number milestones. From paultarjan.com/nerdiversary')}`
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
