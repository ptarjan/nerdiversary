/**
 * Results page script - displays nerdiversary events
 */

let allEvents = [];
let currentFilter = 'all';
let currentView = 'upcoming';
let birthDate = null;
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get birth date from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const dateStr = urlParams.get('d');
    const timeStr = urlParams.get('t') || '00:00';

    if (!dateStr) {
        window.location.href = 'index.html';
        return;
    }

    // Parse birth date
    birthDate = new Date(`${dateStr}T${timeStr}:00`);

    if (isNaN(birthDate.getTime())) {
        window.location.href = 'index.html';
        return;
    }

    // Update birth info display
    const birthInfo = document.getElementById('birth-info');
    birthInfo.textContent = `Born: ${Nerdiversary.formatDate(birthDate)}`;

    // Calculate events
    calculateAndDisplayEvents();

    // Set up filter buttons
    setupFilters();

    // Set up timeline toggle
    setupTimelineToggle();

    // Set up action buttons
    setupActionButtons();

    // Start countdown timer
    startCountdownTimer();
});

/**
 * Calculate and display all nerdiversary events
 */
function calculateAndDisplayEvents() {
    // Calculate events (100 years of events)
    allEvents = Nerdiversary.calculate(birthDate, 100);

    // Display next event
    displayNextEvent();

    // Display timeline
    displayTimeline();
}

/**
 * Display the next upcoming nerdiversary
 */
function displayNextEvent() {
    const container = document.getElementById('next-event');
    const nextEvent = Nerdiversary.getNextEvent(allEvents);

    if (!nextEvent) {
        container.innerHTML = '<p class="empty-state">No upcoming events found</p>';
        return;
    }

    const now = new Date();
    const diff = nextEvent.date - now;
    const days = Math.floor(diff / Nerdiversary.MS_PER_DAY);
    const hours = Math.floor((diff % Nerdiversary.MS_PER_DAY) / Nerdiversary.MS_PER_HOUR);
    const minutes = Math.floor((diff % Nerdiversary.MS_PER_HOUR) / Nerdiversary.MS_PER_MINUTE);
    const seconds = Math.floor((diff % Nerdiversary.MS_PER_MINUTE) / Nerdiversary.MS_PER_SECOND);

    const categoryInfo = Nerdiversary.getCategoryInfo(nextEvent.category);

    container.innerHTML = `
        <div class="countdown-title">${nextEvent.icon} ${nextEvent.title}</div>
        <div class="countdown-date">${Nerdiversary.formatDate(nextEvent.date)}</div>
        <div class="countdown-timer">
            <div class="countdown-unit">
                <span class="countdown-value" id="countdown-days">${days}</span>
                <span class="countdown-label">Days</span>
            </div>
            <div class="countdown-unit">
                <span class="countdown-value" id="countdown-hours">${hours}</span>
                <span class="countdown-label">Hours</span>
            </div>
            <div class="countdown-unit">
                <span class="countdown-value" id="countdown-minutes">${minutes}</span>
                <span class="countdown-label">Minutes</span>
            </div>
            <div class="countdown-unit">
                <span class="countdown-value" id="countdown-seconds">${seconds}</span>
                <span class="countdown-label">Seconds</span>
            </div>
        </div>
        <span class="countdown-category">${categoryInfo.icon} ${categoryInfo.name}</span>
    `;
}

/**
 * Start the countdown timer
 */
function startCountdownTimer() {
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
        const nextEvent = Nerdiversary.getNextEvent(allEvents);
        if (!nextEvent) return;

        const now = new Date();
        const diff = nextEvent.date - now;

        if (diff <= 0) {
            // Event has passed, recalculate
            calculateAndDisplayEvents();
            return;
        }

        const days = Math.floor(diff / Nerdiversary.MS_PER_DAY);
        const hours = Math.floor((diff % Nerdiversary.MS_PER_DAY) / Nerdiversary.MS_PER_HOUR);
        const minutes = Math.floor((diff % Nerdiversary.MS_PER_HOUR) / Nerdiversary.MS_PER_MINUTE);
        const seconds = Math.floor((diff % Nerdiversary.MS_PER_MINUTE) / Nerdiversary.MS_PER_SECOND);

        const daysEl = document.getElementById('countdown-days');
        const hoursEl = document.getElementById('countdown-hours');
        const minutesEl = document.getElementById('countdown-minutes');
        const secondsEl = document.getElementById('countdown-seconds');

        if (daysEl) daysEl.textContent = days;
        if (hoursEl) hoursEl.textContent = hours;
        if (minutesEl) minutesEl.textContent = minutes;
        if (secondsEl) secondsEl.textContent = seconds;
    }, 1000);
}

/**
 * Display the timeline of events
 */
function displayTimeline() {
    const timeline = document.getElementById('timeline');
    const now = new Date();

    // Filter events
    let filteredEvents = allEvents;

    // Apply category filter
    if (currentFilter !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.category === currentFilter);
    }

    // Apply time view filter
    if (currentView === 'upcoming') {
        filteredEvents = filteredEvents.filter(e => e.date >= now);
    } else if (currentView === 'past') {
        filteredEvents = filteredEvents.filter(e => e.date < now).reverse();
    }

    // Limit upcoming events (past events show all since they're finite)
    const limit = currentView === 'upcoming' ? 100 : filteredEvents.length;
    const displayEvents = filteredEvents.slice(0, limit);

    if (displayEvents.length === 0) {
        timeline.innerHTML = '<div class="empty-state"><p>No events found for this filter.</p></div>';
        return;
    }

    // Find the next event for highlighting
    const nextEvent = Nerdiversary.getNextEvent(allEvents);
    const nextEventId = nextEvent ? nextEvent.id : null;

    timeline.innerHTML = displayEvents.map(event => {
        const categoryInfo = Nerdiversary.getCategoryInfo(event.category);
        const isNext = event.id === nextEventId;
        const isPast = event.date < now;

        return `
            <div class="event-card ${isPast ? 'past' : ''} ${isNext ? 'next' : ''}" data-category="${event.category}">
                <div class="event-icon">${event.icon}</div>
                <div class="event-content">
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-description">${event.description}</p>
                    <div class="event-meta">
                        <span class="event-date">${Nerdiversary.formatDate(event.date)}</span>
                        <span class="event-countdown">${Nerdiversary.formatRelative(event.daysFromNow)}</span>
                        <span class="event-category">${categoryInfo.icon} ${categoryInfo.name}</span>
                    </div>
                </div>
                ${!isPast ? `<button class="event-add-btn" data-event-id="${event.id}" title="Add to Google Calendar">📅</button>` : ''}
            </div>
        `;
    }).join('');

    // Add click handlers for individual calendar buttons
    timeline.querySelectorAll('.event-add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const eventId = btn.dataset.eventId;
            const event = allEvents.find(ev => ev.id === eventId);
            if (event) {
                const gcalUrl = createGoogleCalendarUrl(event);
                const newWindow = window.open(gcalUrl, '_blank');
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    window.location.href = gcalUrl;
                }
            }
        });
    });
}

/**
 * Set up filter buttons
 */
function setupFilters() {
    const filterButtons = document.getElementById('filter-buttons');

    filterButtons.addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-btn')) return;

        // Update active state
        filterButtons.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Update filter and redisplay
        currentFilter = e.target.dataset.filter;
        displayTimeline();
    });
}

/**
 * Set up timeline toggle (upcoming/past/all)
 */
function setupTimelineToggle() {
    const toggleButtons = document.querySelectorAll('.timeline-btn');

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            displayTimeline();
        });
    });
}

// Cloudflare Worker URL
const CALENDAR_WORKER_URL = 'https://nerdiversary-calendar.curly-unit-b9e0.workers.dev';

/**
 * Set up action buttons (subscribe, download iCal, share)
 */
function setupActionButtons() {
    const subscribeBtn = document.getElementById('subscribe-calendar');
    const downloadBtn = document.getElementById('download-ical');
    const shareBtn = document.getElementById('share-results');

    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            subscribeToCalendar();
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadICalendar();
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            shareResults();
        });
    }
}

/**
 * Subscribe to calendar via Cloudflare Worker
 */
function subscribeToCalendar() {
    const urlParams = new URLSearchParams(window.location.search);
    const dateStr = urlParams.get('d');
    const timeStr = urlParams.get('t');

    // Build the calendar URL
    let calendarUrl = `${CALENDAR_WORKER_URL}/?d=${dateStr}`;
    if (timeStr) {
        calendarUrl += `&t=${timeStr}`;
    }

    // Show subscription modal
    showSubscribeModal(calendarUrl);
}

/**
 * Show modal with subscription options
 */
function showSubscribeModal(calendarUrl) {
    const webcalUrl = calendarUrl.replace('https://', 'webcal://');
    // Encode the webcal URL so query params don't get parsed as part of Google's URL
    const googleCalUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
    // Outlook uses its own URL format
    const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarUrl)}`;

    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            <h3>🔔 Subscribe to Your Nerdiversaries</h3>
            <p>Your calendar will auto-update with new events!</p>
            <div class="import-options">
                <a href="${googleCalUrl}" target="_blank" class="import-option" id="gcal-subscribe">
                    <span class="import-icon">📅</span>
                    <span>Google Calendar</span>
                    <small>One-click subscribe</small>
                </a>
                <a href="${webcalUrl}" class="import-option" id="apple-subscribe">
                    <span class="import-icon">🍎</span>
                    <span>Apple Calendar</span>
                    <small>Opens Calendar app</small>
                </a>
                <a href="${outlookUrl}" target="_blank" class="import-option" id="outlook-subscribe">
                    <span class="import-icon">📧</span>
                    <span>Outlook</span>
                    <small>Outlook.com</small>
                </a>
            </div>
            <div class="subscribe-url-section">
                <p class="subscribe-url-label">Or copy the calendar URL:</p>
                <div class="subscribe-url-box">
                    <input type="text" value="${calendarUrl}" readonly id="calendar-url-input">
                    <button onclick="copyCalendarUrl()" class="copy-btn">📋 Copy</button>
                </div>
            </div>
            <button class="import-close" onclick="this.closest('.import-modal').remove()">Done</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Handle Apple Calendar - use JavaScript navigation only on iOS (href works on desktop)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
        modal.querySelector('#apple-subscribe').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = webcalUrl;
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Copy calendar URL to clipboard
 */
function copyCalendarUrl() {
    const input = document.getElementById('calendar-url-input');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Calendar URL copied!');
    }).catch(() => {
        document.execCommand('copy');
        showToast('Calendar URL copied!');
    });
}

/**
 * Create Google Calendar URL for an event
 */
function createGoogleCalendarUrl(event) {
    const startDate = formatGoogleDate(event.date);
    const endDate = formatGoogleDate(new Date(event.date.getTime() + 60 * 60 * 1000)); // 1 hour

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `${event.icon} ${event.title}`,
        dates: `${startDate}/${endDate}`,
        details: event.description,
        sf: 'true'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Format date for Google Calendar (YYYYMMDDTHHMMSSZ)
 */
function formatGoogleDate(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Download iCalendar file
 */
function downloadICalendar() {
    // Get all upcoming events
    const upcomingEvents = allEvents.filter(e => !e.isPast);
    const icalContent = ICalGenerator.generate(upcomingEvents, birthDate);

    // Create download
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nerdiversaries.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Downloaded nerdiversaries.ics');
}

/**
 * Share results link
 */
function shareResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;

    if (navigator.share) {
        navigator.share({
            title: 'My Nerdiversaries',
            text: 'Check out my nerdy anniversaries!',
            url: shareUrl
        }).catch(() => {
            copyToClipboard(shareUrl);
        });
    } else {
        copyToClipboard(shareUrl);
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Link copied to clipboard!');
    }).catch(() => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Link copied to clipboard!');
    });
}

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
