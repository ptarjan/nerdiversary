/**
 * Results page script - displays nerdiversary events for individuals or families
 */

// ESM imports to ensure module dependency ordering
import NerdiversaryModule from './nerdiversary.js';
import MilestonesModule from './milestones.js';
import ICalGeneratorModule from './ical.js';
import NotificationsModule from './notifications.js';

// Use window globals if available (backwards compat), otherwise imported modules
const Nerdiversary = typeof window !== 'undefined' && window.Nerdiversary ? window.Nerdiversary : NerdiversaryModule;
const Milestones = typeof window !== 'undefined' && window.Milestones ? window.Milestones : MilestonesModule;
const ICalGenerator = typeof window !== 'undefined' && window.ICalGenerator ? window.ICalGenerator : ICalGeneratorModule;
const Notifications = typeof window !== 'undefined' && window.Notifications ? window.Notifications : NotificationsModule;

let allEvents = [];
let familyMembers = [];
let currentFilter = 'all';
let currentPerson = 'all';
let currentView = 'upcoming';
let countdownInterval = null;
let scheduledNotifications = [];

// Cached DOM elements for countdown (to avoid querying every second)
const countdownElements = {
    days: null,
    hours: null,
    minutes: null,
    seconds: null
};

/**
 * Escape HTML to prevent XSS (for user-provided content)
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Clean up resources on page unload
 */
window.addEventListener('beforeunload', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Parse family data from URL params
    const urlParams = new URLSearchParams(window.location.search);

    // Check for new family format
    const familyParam = urlParams.get('family');
    if (familyParam) {
        try {
            familyMembers = familyParam.split(',').map(m => {
                const parts = m.split('|');
                const name = decodeURIComponent(parts[0] || '');
                const dateStr = parts[1] || '';
                const timeStr = parts[2] || '00:00';
                const birthDate = new Date(`${dateStr}T${timeStr}:00`);

                return { name, dateStr, timeStr, birthDate };
            }).filter(m => m.name && !isNaN(m.birthDate.getTime()));
        } catch (e) {
            console.error('Failed to parse family param:', e);
        }
    }

    if (familyMembers.length === 0) {
        window.location.href = 'index.html';
        return;
    }

    // Update family info display
    updateFamilyInfo();

    // Set up person filter if multiple people
    if (familyMembers.length > 1) {
        setupPersonFilter();
    }

    // Calculate events for all family members
    calculateAndDisplayEvents();

    // Set up filter buttons
    setupFilters();

    // Set up timeline toggle
    setupTimelineToggle();

    // Set up action buttons
    setupActionButtons();

    // Set up notifications (async, errors handled internally)
    setupNotifications().catch(err => {
        console.error('Failed to setup notifications:', err);
    });

    // Start countdown timer
    startCountdownTimer();
});

/**
 * Update family info display
 */
function updateFamilyInfo() {
    const familyInfo = document.getElementById('family-info');

    if (familyMembers.length === 1) {
        const m = familyMembers[0];
        familyInfo.innerHTML = `<p class="birth-info">${escapeHtml(m.name)}: Born ${Nerdiversary.formatDate(m.birthDate)}</p>`;
    } else {
        const html = familyMembers.map(m =>
            `<span class="family-member-badge" style="background: ${getColorForPerson(m.name)}">
                ${escapeHtml(m.name)}
            </span>`
        ).join('');
        familyInfo.innerHTML = `<div class="family-badges">${html}</div>`;
    }
}

/**
 * Get consistent color for a person based on their index in the family
 * Colors are chosen to be maximally distinct from each other
 */
function getColorForPerson(name) {
    // Vibrant, maximally distinct colors
    const colors = [
        '#e63946', // Red
        '#2a9d8f', // Teal
        '#f4a261', // Orange
        '#457b9d', // Steel Blue
        '#9b5de5', // Purple
        '#00f5d4', // Cyan
        '#f15bb5', // Pink
        '#fee440', // Yellow
        '#00bbf9', // Sky Blue
        '#9ef01a', // Lime
    ];
    // Use index in familyMembers array for consistent assignment
    const index = familyMembers.findIndex(m => m.name === name);
    return colors[index >= 0 ? index % colors.length : 0];
}

/**
 * Set up person filter buttons
 */
function setupPersonFilter() {
    const section = document.getElementById('person-filter-section');
    const container = document.getElementById('person-filter-buttons');

    section.style.display = 'block';

    // Add buttons for each person
    familyMembers.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.person = m.name;
        btn.innerHTML = `<span style="color: ${getColorForPerson(m.name)}">●</span> ${escapeHtml(m.name)}`;
        container.appendChild(btn);
    });

    container.addEventListener('click', e => {
        if (!e.target.classList.contains('filter-btn')) { return; }

        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        currentPerson = e.target.dataset.person;
        displayNextEvent();
        displayTimeline();
    });
}

/**
 * Calculate and display all nerdiversary events
 */
function calculateAndDisplayEvents() {
    allEvents = [];
    const seenSharedHolidays = new Set();

    // Calculate events for each family member
    familyMembers.forEach(member => {
        const events = Nerdiversary.calculate(member.birthDate, 100);

        // Add person info to each event
        events.forEach(event => {
            // Skip duplicate shared holidays (Pi Day, Star Wars Day, etc.)
            if (event.isSharedHoliday) {
                const holidayKey = event.id;
                if (seenSharedHolidays.has(holidayKey)) {
                    return; // Skip this duplicate
                }
                seenSharedHolidays.add(holidayKey);
                // Shared holidays belong to everyone
                event.personName = 'Everyone';
                event.personColor = '#7c3aed';
            } else {
                event.personName = member.name;
                event.personColor = getColorForPerson(member.name);
                // Make ID unique per person
                event.id = `${member.name}-${event.id}`;
            }

            allEvents.push(event);
        });
    });

    // Sort all events by date
    allEvents.sort((a, b) => a.date - b.date);

    // Display next event
    displayNextEvent();

    // Display timeline
    displayTimeline();
}

/**
 * Get filtered events based on current person filter
 */
function getFilteredByPerson(events) {
    if (currentPerson === 'all') {
        return events;
    }
    // Include shared holidays (Everyone) when filtering by person
    return events.filter(e => e.personName === currentPerson || e.personName === 'Everyone');
}

/**
 * Display the next upcoming nerdiversary
 */
function displayNextEvent() {
    const container = document.getElementById('next-event');
    const now = new Date();

    // Invalidate cached countdown elements since we're rebuilding the DOM
    countdownElements.days = null;
    countdownElements.hours = null;
    countdownElements.minutes = null;
    countdownElements.seconds = null;

    // Get next event (respecting person filter)
    const filteredEvents = getFilteredByPerson(allEvents);
    const upcomingEvents = filteredEvents.filter(e => e.date > now);
    const nextEvent = upcomingEvents[0];

    if (!nextEvent) {
        container.innerHTML = '<p class="empty-state">No upcoming events found</p>';
        return;
    }

    const diff = nextEvent.date - now;
    const days = Math.floor(diff / Milestones.MS_PER_DAY);
    const hours = Math.floor((diff % Milestones.MS_PER_DAY) / Milestones.MS_PER_HOUR);
    const minutes = Math.floor((diff % Milestones.MS_PER_HOUR) / Milestones.MS_PER_MINUTE);
    const seconds = Math.floor((diff % Milestones.MS_PER_MINUTE) / Milestones.MS_PER_SECOND);

    const categoryInfo = Nerdiversary.getCategoryInfo(nextEvent.category);
    const showPerson = familyMembers.length > 1;

    container.innerHTML = `
        <div class="countdown-title">${nextEvent.icon} ${nextEvent.title}</div>
        ${showPerson ? `<div class="countdown-person" style="color: ${nextEvent.personColor}">${escapeHtml(nextEvent.personName)}</div>` : ''}
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

    let celebrationTriggered = false;

    countdownInterval = setInterval(() => {
        const now = new Date();
        const filteredEvents = getFilteredByPerson(allEvents);
        const upcomingEvents = filteredEvents.filter(e => e.date > now);
        const nextEvent = upcomingEvents[0];

        if (!nextEvent) { return; }

        const diff = nextEvent.date - now;

        if (diff <= 0) {
            // Event is happening! Trigger celebration (only once)
            if (!celebrationTriggered) {
                celebrationTriggered = true;
                clearInterval(countdownInterval);
                showCelebration(nextEvent);
            }
            return;
        }

        const days = Math.floor(diff / Milestones.MS_PER_DAY);
        const hours = Math.floor((diff % Milestones.MS_PER_DAY) / Milestones.MS_PER_HOUR);
        const minutes = Math.floor((diff % Milestones.MS_PER_HOUR) / Milestones.MS_PER_MINUTE);
        const seconds = Math.floor((diff % Milestones.MS_PER_MINUTE) / Milestones.MS_PER_SECOND);

        // Use cached DOM elements (refresh cache if needed)
        if (!countdownElements.days) {
            countdownElements.days = document.getElementById('countdown-days');
            countdownElements.hours = document.getElementById('countdown-hours');
            countdownElements.minutes = document.getElementById('countdown-minutes');
            countdownElements.seconds = document.getElementById('countdown-seconds');
        }

        if (countdownElements.days) { countdownElements.days.textContent = days; }
        if (countdownElements.hours) { countdownElements.hours.textContent = hours; }
        if (countdownElements.minutes) { countdownElements.minutes.textContent = minutes; }
        if (countdownElements.seconds) { countdownElements.seconds.textContent = seconds; }
    }, 1000);
}

/**
 * Display the timeline of events
 */
function displayTimeline() {
    const timeline = document.getElementById('timeline');
    const now = new Date();

    // Start with person filter
    let filteredEvents = getFilteredByPerson(allEvents);

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
    const nextEvent = getFilteredByPerson(allEvents).filter(e => e.date > now)[0];
    const nextEventId = nextEvent ? nextEvent.id : null;
    const showPerson = familyMembers.length > 1;

    timeline.innerHTML = displayEvents.map(event => {
        const categoryInfo = Nerdiversary.getCategoryInfo(event.category);
        const isNext = event.id === nextEventId;
        const isPast = event.date < now;

        return `
            <div class="event-card ${isPast ? 'past' : ''} ${isNext ? 'next' : ''}" data-category="${event.category}">
                <div class="event-icon">${event.icon}</div>
                <div class="event-content">
                    <h3 class="event-title">${event.title}</h3>
                    ${showPerson ? `<span class="event-person" style="background: ${event.personColor}">${escapeHtml(event.personName)}</span>` : ''}
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
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const { eventId } = btn.dataset;
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

    filterButtons.addEventListener('click', e => {
        if (!e.target.classList.contains('filter-btn')) { return; }

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
        subscribeBtn.addEventListener('click', e => {
            e.preventDefault();
            subscribeToCalendar();
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', e => {
            e.preventDefault();
            downloadICalendar();
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', e => {
            e.preventDefault();
            shareResults();
        });
    }
}

/**
 * Set up push notifications
 */
async function setupNotifications() {
    const notifyBtn = document.getElementById('enable-notifications');
    if (!notifyBtn) { return; }

    // Initialize notifications system
    const status = await Notifications.initialize();

    // Hide button if notifications aren't supported
    if (!status.supported) {
        notifyBtn.style.display = 'none';
        return;
    }

    // Update button state based on current status
    updateNotificationButton(notifyBtn, status.permissionStatus, status.enabled);

    // Handle button click
    notifyBtn.addEventListener('click', async () => {
        // Check if on iOS with unsupported browser (Chrome, Firefox, etc.)
        if (Notifications.isUnsupportedIOSBrowser()) {
            showUnsupportedBrowserModal();
            return;
        }

        // Check if iOS/iPadOS requires PWA installation first
        if (Notifications.requiresPWAInstall()) {
            showPWAInstallModal();
            return;
        }

        const currentPermission = Notifications.getPermissionStatus();
        const isEnabled = Notifications.isEnabled();

        if (currentPermission === 'denied') {
            showToast('Notifications blocked. Please enable in browser settings.');
            return;
        }

        if (isEnabled) {
            // Disable notifications
            Notifications.setEnabled(false);
            Notifications.cancelScheduledNotifications(scheduledNotifications);
            scheduledNotifications = [];
            updateNotificationButton(notifyBtn, currentPermission, false);
            showToast('Notifications disabled');
        } else {
            // Request permission if needed
            if (currentPermission !== 'granted') {
                const result = await Notifications.requestPermission();
                if (!result.granted) {
                    if (result.reason === 'denied') {
                        showToast('Notifications blocked. Please enable in browser settings.');
                    }
                    return;
                }
            }

            // Enable notifications
            Notifications.setEnabled(true);
            updateNotificationButton(notifyBtn, 'granted', true);
            scheduleUpcomingNotifications();
            showToast('Notifications enabled! You\'ll be notified of upcoming nerdiversaries.');

            // Show a test notification
            await Notifications.showNotification('Notifications Enabled!', {
                body: 'You\'ll be notified when your nerdiversaries are approaching.',
                tag: 'nerdiversary-enabled'
            });
        }
    });

    // Schedule notifications if already enabled
    if (status.enabled && status.permissionStatus === 'granted') {
        scheduleUpcomingNotifications();
    }
}

/**
 * Update notification button appearance
 */
function updateNotificationButton(button, permission, enabled) {
    const icon = button.querySelector('.btn-icon');
    const text = button.querySelector('span:not(.btn-icon)');

    if (permission === 'denied') {
        button.classList.add('disabled');
        button.classList.remove('active');
        if (icon) { icon.textContent = '🔕'; }
        if (text) { text.textContent = 'Notifications Blocked'; }
    } else if (enabled) {
        button.classList.add('active');
        button.classList.remove('disabled');
        if (icon) { icon.textContent = '🔔'; }
        if (text) { text.textContent = 'Notifications On'; }
    } else {
        button.classList.remove('active', 'disabled');
        if (icon) { icon.textContent = '🔕'; }
        if (text) { text.textContent = 'Enable Notifications'; }
    }
}

/**
 * Schedule notifications for upcoming events
 */
function scheduleUpcomingNotifications() {
    // Cancel existing scheduled notifications
    Notifications.cancelScheduledNotifications(scheduledNotifications);

    // Get upcoming events (next 10 events within the next month)
    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingEvents = allEvents
        .filter(e => e.date > now && e.date < oneMonthFromNow)
        .slice(0, 10);

    // Schedule notifications for these events
    scheduledNotifications = Notifications.scheduleEventNotifications(upcomingEvents);

    console.log(`Scheduled ${scheduledNotifications.length} notifications for ${upcomingEvents.length} events`);
}

/**
 * Subscribe to calendar via Cloudflare Worker
 */
function subscribeToCalendar() {
    const urlParams = new URLSearchParams(window.location.search);

    // Build the calendar URL with family or single person params
    const calendarUrl = `${CALENDAR_WORKER_URL}/?${urlParams.toString()}`;

    // Show subscription modal
    showSubscribeModal(calendarUrl);
}

/**
 * Show modal explaining PWA installation requirement for iOS notifications
 */
function showPWAInstallModal() {
    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            <h3>Add to Home Screen</h3>
            <p>To enable notifications on iPad/iPhone, you need to install this app first:</p>
            <div class="pwa-install-steps">
                <div class="pwa-step">
                    <span class="pwa-step-number">1</span>
                    <span>Tap the <strong>Share</strong> button <span class="share-icon">&#xFEFF;<svg width="18" height="18" viewBox="0 0 50 50" fill="currentColor"><path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/><path d="M24 7h2v21h-2z"/><path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/></svg></span> in Safari</span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">3</span>
                    <span>Open the app from your Home Screen</span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">4</span>
                    <span>Tap "Enable Notifications" again</span>
                </div>
            </div>
            <p class="pwa-note">This is required by Apple for web app notifications.</p>
            <button class="import-close" onclick="this.closest('.import-modal').remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
        if (e.target === modal) { modal.remove(); }
    });
}

/**
 * Show modal explaining that notifications aren't supported in this iOS browser
 */
function showUnsupportedBrowserModal() {
    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            <h3>Browser Not Supported</h3>
            <p>Unfortunately, push notifications are not supported in this browser on iOS.</p>
            <p>To enable notifications, please:</p>
            <div class="pwa-install-steps">
                <div class="pwa-step">
                    <span class="pwa-step-number">1</span>
                    <span>Open this page in <strong>Safari</strong></span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">2</span>
                    <span>Add the app to your Home Screen</span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">3</span>
                    <span>Open the app and enable notifications</span>
                </div>
            </div>
            <p class="pwa-note">Only Safari supports web app notifications on iOS devices.</p>
            <button class="import-close" onclick="this.closest('.import-modal').remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
        if (e.target === modal) { modal.remove(); }
    });
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
        modal.querySelector('#apple-subscribe').addEventListener('click', e => {
            e.preventDefault();
            window.location.href = webcalUrl;
        });
    }

    modal.addEventListener('click', e => {
        if (e.target === modal) { modal.remove(); }
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
        const success = document.execCommand('copy');
        showToast(success ? 'Calendar URL copied!' : 'Failed to copy URL');
    });
}

// Expose to window for onclick handlers
window.copyCalendarUrl = copyCalendarUrl;

/**
 * Create Google Calendar URL for an event
 */
function createGoogleCalendarUrl(event) {
    const startDate = formatGoogleDate(event.date);
    const endDate = formatGoogleDate(new Date(event.date.getTime() + Milestones.MS_PER_HOUR));

    const title = familyMembers.length > 1
        ? `${event.icon} ${event.personName}: ${event.title}`
        : `${event.icon} ${event.title}`;

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
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

    // Use first person's birthdate as reference
    const { birthDate } = familyMembers[0];
    const icalContent = ICalGenerator.generate(upcomingEvents, birthDate, familyMembers.length > 1);

    // Create download
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = familyMembers.length > 1 ? 'family-nerdiversaries.ics' : 'nerdiversaries.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded ${link.download}`);
}

/**
 * Share results link
 */
function shareResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;

    const shareText = familyMembers.length > 1
        ? 'Check out our family\'s nerdy anniversaries!'
        : 'Check out my nerdy anniversaries!';

    if (navigator.share) {
        navigator.share({
            title: familyMembers.length > 1 ? 'Our Family Nerdiversaries' : 'My Nerdiversaries',
            text: shareText,
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

/**
 * Show celebration overlay when a nerdiversary happens
 */
function showCelebration(event) {
    // Show push notification if enabled (useful if user is on another tab)
    if (Notifications.isEnabled() && Notifications.getPermissionStatus() === 'granted') {
        const notificationBody = familyMembers.length > 1
            ? `${event.personName}: ${event.title}`
            : event.title;

        Notifications.showNotification(`${event.icon} It's Happening NOW!`, {
            body: notificationBody,
            tag: `nerdiversary-celebration-${event.id}`,
            data: {
                eventId: event.id,
                url: window.location.href
            }
        });
    }

    // Create celebration overlay FIRST (lower z-index)
    const showPerson = familyMembers.length > 1;
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = `
        <div class="celebration-content">
            <span class="celebration-emoji">${event.icon}</span>
            <h2 class="celebration-title">🎉 It's Happening NOW! 🎉</h2>
            ${showPerson ? `<p class="celebration-person" style="color: ${event.personColor}">${escapeHtml(event.personName)}</p>` : ''}
            <p class="celebration-event">${event.title}</p>
            <p class="celebration-description">${event.description}</p>
            <button class="celebration-dismiss">Continue to Next Event</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // Create confetti container AFTER overlay (higher z-index, appears on top)
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);

    // Generate confetti particles
    const colors = ['#7c3aed', '#a855f7', '#c084fc', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#f43f5e'];
    const shapes = ['square', 'circle'];

    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        confetti.style.width = `${Math.random() * 8 + 6}px`;
        confetti.style.height = confetti.style.width;

        if (shapes[Math.floor(Math.random() * shapes.length)] === 'circle') {
            confetti.style.borderRadius = '50%';
        }

        confettiContainer.appendChild(confetti);
    }

    // Handle dismiss
    const dismissBtn = overlay.querySelector('.celebration-dismiss');
    dismissBtn.addEventListener('click', () => {
        overlay.style.animation = 'celebration-fade-in 0.3s ease-out reverse';
        confettiContainer.style.opacity = '0';
        confettiContainer.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            overlay.remove();
            confettiContainer.remove();
            // Recalculate and display events, restart countdown
            calculateAndDisplayEvents();
            startCountdownTimer();
        }, 300);
    });

    // Also dismiss on overlay click (outside content)
    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            dismissBtn.click();
        }
    });
}

// Expose for console testing: testCelebration()
window.testCelebration = function () {
    const now = new Date();
    const filteredEvents = getFilteredByPerson(allEvents);
    const nextEvent = filteredEvents.filter(e => e.date > now)[0];
    if (nextEvent) {
        showCelebration(nextEvent);
    } else {
        showCelebration({
            icon: '🎉',
            title: 'Test Celebration!',
            description: 'This is what happens when a nerdiversary occurs!',
            personName: 'Test',
            personColor: 'rgba(124, 58, 237, 0.8)'
        });
    }
};
