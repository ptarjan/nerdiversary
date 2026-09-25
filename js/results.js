/**
 * results.html: every milestone for the people in the `family` URL parameter
 * (format: parseFamilyParam in js/shared.js), or for the birthdays in device
 * storage when the URL has none. Sends the visitor to index.html if it finds
 * neither.
 *
 * Renders the next-milestone countdown, the person/category/time filters and
 * the timeline, and runs the action buttons: calendar feed (served by the
 * worker from this page's query string), .ics download, sharing, and
 * notifications (js/notifications.js).
 *
 * HTML is built with template strings. Event titles, descriptions and icons
 * come from js/calculator.js and are inserted as HTML on purpose (descriptions
 * contain links). Every other value, above all anything holding a person's
 * name (personName, event ids), goes through escapeHtml, in text and in
 * attributes alike.
 */

import Nerdiversary from './nerdiversary.js';
import Milestones from './milestones.js';
import Notifications from './notifications.js';
import * as Storage from './storage.js';
import { parseFamilyParam, buildFamilyParam, escapeHtml, formatICalDate, getCategoryInfo, generateICal, WORKER_URL, HAPPENING_NOW, NOTIFY_LABELS } from './shared.js';

// Every person's events, merged and sorted by date. Non-holiday ids are
// prefixed with the person's name so they are unique across people.
let allEvents = [];
let familyMembers = [];
let currentFilter = 'all'; // category, or 'all'
let currentPerson = 'all'; // a person's name, or 'all'
let currentView = 'upcoming'; // 'upcoming' | 'past' | 'all'
let countdownInterval = null;
let scheduledNotifications = [];

// The countdown's number elements, looked up on the first tick after
// displayNextEvent rebuilds them, instead of every second.
const countdownElements = {
    days: null,
    hours: null,
    minutes: null,
    seconds: null
};

window.addEventListener('beforeunload', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
});

/**
 * Replace the timeline and countdown with an error. `message` is inserted as HTML.
 * @param {string} message
 */
function showLoadingError(message) {
    const timeline = document.getElementById('timeline');
    if (timeline) {
        timeline.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
                <p><a href="index.html" style="color: #7c3aed;">Go back and re-enter the birthdays</a></p>
            </div>
        `;
    }
    const nextEvent = document.getElementById('next-event');
    if (nextEvent) {
        nextEvent.innerHTML = '<div class="countdown-loading">Countdown unavailable</div>';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const familyParam = urlParams.get('family');

        if (familyParam) {
            familyMembers = parseFamilyParam(familyParam);
        }

        // No usable parameter, e.g. a push notification opened results.html.
        if (familyMembers.length === 0) {
            try {
                const storagePromise = Storage.loadFamily();
                const storedFamily = await Promise.race([
                    storagePromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Storage loading timed out')), 5000)
                    )
                ]);
                if (storedFamily && storedFamily.length > 0) {
                    // Go through the URL format so stored and linked birthdays are
                    // parsed by the same code.
                    const newFamilyParam = buildFamilyParam(storedFamily);
                    familyMembers = parseFamilyParam(newFamilyParam);

                    // Put the birthdays in the URL without reloading: the share
                    // button, calendar feed and push subscription all read them
                    // from there. Encoded twice, as buildFamilyParam explains.
                    if (familyMembers.length > 0) {
                        const newUrl = `${window.location.pathname}?family=${encodeURIComponent(newFamilyParam)}`;
                        window.history.replaceState({}, '', newUrl);
                    }
                }
            } catch (e) {
                console.error('Failed to load from storage:', e);
            }
        }

        if (familyMembers.length === 0) {
            window.location.href = 'index.html';
            return;
        }

        updateFamilyInfo();

        if (familyMembers.length > 1) {
            setupPersonFilter();
        }

        calculateAndDisplayEvents();
        setupFilters();
        setupTimelineToggle();
        setupActionButtons();

        // Not awaited: the page is usable before the service worker is ready.
        setupNotifications().catch(err => {
            console.error('Failed to setup notifications:', err);
        });

        startCountdownTimer();
    } catch (err) {
        console.error('Failed to initialize results page:', err);
        showLoadingError('Your milestones could not be calculated. Reload the page to try again.');
    }
});

/**
 * Header under the title: "Name, born <date>" for one person, colored name
 * badges for several.
 */
function updateFamilyInfo() {
    const familyInfo = document.getElementById('family-info');

    if (familyMembers.length === 1) {
        const m = familyMembers[0];
        familyInfo.innerHTML = `<p class="birth-info">${escapeHtml(m.name)}, born ${Nerdiversary.formatDate(m.birthDate)}</p>`;
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
 * A person's color, by their position in familyMembers (wrapping after 10).
 * People with the same name get the first one's color.
 * @param {string} name
 * @returns {string} CSS hex color
 */
function getColorForPerson(name) {
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
    const index = familyMembers.findIndex(m => m.name === name);
    return colors[index >= 0 ? index % colors.length : 0];
}

/**
 * Show the "Filter by person" row with one button per person. Only called when
 * there are two or more people.
 */
function setupPersonFilter() {
    const section = document.getElementById('person-filter-section');
    const container = document.getElementById('person-filter-buttons');

    section.style.display = 'block';

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
 * Rebuild allEvents for every person, then redraw the countdown and timeline.
 * Shared holidays (Pi Day, May the 4th, ...) are the same date for everyone,
 * so they appear once, under "Everyone".
 */
function calculateAndDisplayEvents() {
    allEvents = [];
    const seenSharedHolidays = new Set();

    familyMembers.forEach(member => {
        const events = Nerdiversary.calculate(member.birthDate, 100);

        events.forEach(event => {
            if (event.isSharedHoliday) {
                const holidayKey = event.id;
                if (seenSharedHolidays.has(holidayKey)) {
                    return;
                }
                seenSharedHolidays.add(holidayKey);
                event.personName = 'Everyone';
                event.personColor = '#7c3aed';
            } else {
                event.personName = member.name;
                event.personColor = getColorForPerson(member.name);
                event.id = `${member.name}-${event.id}`;
            }

            allEvents.push(event);
        });
    });

    allEvents.sort((a, b) => a.date - b.date);

    displayNextEvent();
    displayTimeline();
}

/**
 * Apply the person filter. A person's view includes the shared holidays.
 * @param {Array<Object>} events
 * @returns {Array<Object>}
 */
function getFilteredByPerson(events) {
    if (currentPerson === 'all') {
        return events;
    }
    return events.filter(e => e.personName === currentPerson || e.personName === 'Everyone');
}

/**
 * Draw the countdown card for the next milestone under the person filter
 * (the category filter does not apply), plus a line naming the next
 * legendary milestone if that is a different one.
 */
function displayNextEvent() {
    const container = document.getElementById('next-event');
    const now = new Date();

    // The elements are about to be replaced; the next tick looks them up again.
    countdownElements.days = null;
    countdownElements.hours = null;
    countdownElements.minutes = null;
    countdownElements.seconds = null;

    const filteredEvents = getFilteredByPerson(allEvents);
    const upcomingEvents = filteredEvents.filter(e => e.date > now);
    const nextEvent = upcomingEvents[0];

    if (!nextEvent) {
        container.innerHTML = '<p class="empty-state">No upcoming milestones for this person.</p>';
        return;
    }

    const diff = nextEvent.date - now;
    const days = Math.floor(diff / Milestones.MS_PER_DAY);
    const hours = Math.floor((diff % Milestones.MS_PER_DAY) / Milestones.MS_PER_HOUR);
    const minutes = Math.floor((diff % Milestones.MS_PER_HOUR) / Milestones.MS_PER_MINUTE);
    const seconds = Math.floor((diff % Milestones.MS_PER_MINUTE) / Milestones.MS_PER_SECOND);

    const categoryInfo = getCategoryInfo(nextEvent.category);
    const showPerson = familyMembers.length > 1;

    const nextLegendary = upcomingEvents.find(e => e.rarity === 'legendary');
    const legendaryLine = nextLegendary && nextLegendary !== nextEvent
        ? `<div class="next-legendary">💎 Later, a once-in-a-lifetime milestone: ${nextLegendary.icon} ${nextLegendary.title}${showPerson ? ` (${escapeHtml(nextLegendary.personName)})` : ''} · ${Nerdiversary.formatDate(nextLegendary.date)}</div>`
        : '';

    container.innerHTML = `
        <div class="countdown-title">${nextEvent.icon} ${nextEvent.title}</div>
        ${showPerson ? `<div class="countdown-person" style="background: ${nextEvent.personColor}">${escapeHtml(nextEvent.personName)}</div>` : ''}
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
        ${legendaryLine}
    `;
}

/**
 * Tick the countdown every second. A milestone (under the person filter) whose
 * moment falls between two ticks has arrived: the ticking stops and the
 * celebration shows; dismissing it restarts the countdown on the next one.
 */
function startCountdownTimer() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    let lastTick = new Date();

    countdownInterval = setInterval(() => {
        const now = new Date();
        const filteredEvents = getFilteredByPerson(allEvents);
        const arrived = filteredEvents.find(e => e.date > lastTick && e.date <= now);
        lastTick = now;

        if (arrived) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            showCelebration(arrived);
            return;
        }

        const nextEvent = filteredEvents.find(e => e.date > now);
        if (!nextEvent) { return; }

        const diff = nextEvent.date - now;

        const days = Math.floor(diff / Milestones.MS_PER_DAY);
        const hours = Math.floor((diff % Milestones.MS_PER_DAY) / Milestones.MS_PER_HOUR);
        const minutes = Math.floor((diff % Milestones.MS_PER_HOUR) / Milestones.MS_PER_MINUTE);
        const seconds = Math.floor((diff % Milestones.MS_PER_MINUTE) / Milestones.MS_PER_SECOND);

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
 * Draw the timeline under all three filters. Upcoming shows the next 100,
 * soonest first; Past shows all, newest first; All shows all, oldest first.
 * Only upcoming cards get share and add-to-calendar buttons.
 */
function displayTimeline() {
    const timeline = document.getElementById('timeline');
    const now = new Date();

    let filteredEvents = getFilteredByPerson(allEvents);

    if (currentFilter !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.category === currentFilter);
    }

    if (currentView === 'upcoming') {
        filteredEvents = filteredEvents.filter(e => e.date >= now);
    } else if (currentView === 'past') {
        filteredEvents = filteredEvents.filter(e => e.date < now).reverse();
    }

    const limit = currentView === 'upcoming' ? 100 : filteredEvents.length;
    const displayEvents = filteredEvents.slice(0, limit);

    if (displayEvents.length === 0) {
        timeline.innerHTML = '<div class="empty-state"><p>No milestones match this filter. Try another category or view.</p></div>';
        return;
    }

    // The card that matches the countdown gets the "next" highlight.
    const nextEvent = getFilteredByPerson(allEvents).filter(e => e.date > now)[0];
    const nextEventId = nextEvent ? nextEvent.id : null;
    const showPerson = familyMembers.length > 1;

    timeline.innerHTML = displayEvents.map(event => {
        const categoryInfo = getCategoryInfo(event.category);
        const isNext = event.id === nextEventId;
        const isPast = event.date < now;
        const rarityBadges = {
            legendary: '<span class="rarity-badge legendary">💎 Legendary</span>',
            rare: '<span class="rarity-badge rare">⭐ Rare</span>'
        };
        const rarityBadge = rarityBadges[event.rarity] || '';

        return `
            <div class="event-card ${isPast ? 'past' : ''} ${isNext ? 'next' : ''} rarity-${event.rarity || 'common'}" data-category="${event.category}">
                <div class="event-icon">${event.icon}</div>
                <div class="event-content">
                    <h3 class="event-title">${event.title} ${rarityBadge}</h3>
                    ${showPerson ? `<span class="event-person" style="background: ${event.personColor}">${escapeHtml(event.personName)}</span>` : ''}
                    <p class="event-description">${event.description}</p>
                    <div class="event-meta">
                        <span class="event-date">${Nerdiversary.formatDate(event.date)}</span>
                        <span class="event-countdown">${Nerdiversary.formatRelative(event.daysFromNow)}</span>
                        <span class="event-category">${categoryInfo.icon} ${categoryInfo.name}</span>
                    </div>
                </div>
                ${!isPast ? `
                    <div class="event-actions">
                        <button class="event-share-btn" data-event-id="${escapeHtml(event.id)}" title="Share this milestone" aria-label="Share this milestone">📤</button>
                        <button class="event-add-btn" data-event-id="${escapeHtml(event.id)}" title="Add to Google Calendar" aria-label="Add to Google Calendar">📅</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    timeline.querySelectorAll('.event-add-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const { eventId } = btn.dataset;
            const event = allEvents.find(ev => ev.id === eventId);
            if (event) {
                const gcalUrl = createGoogleCalendarUrl(event);
                const newWindow = window.open(gcalUrl, '_blank');
                // Popup blocked: open it in this tab instead.
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    window.location.href = gcalUrl;
                }
            }
        });
    });

    timeline.querySelectorAll('.event-share-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const { eventId } = btn.dataset;
            const event = allEvents.find(ev => ev.id === eventId);
            if (event) {
                showShareModal(event);
            }
        });
    });
}

/**
 * Category filter buttons. Only the timeline follows them, not the countdown.
 */
function setupFilters() {
    const filterButtons = document.getElementById('filter-buttons');

    filterButtons.addEventListener('click', e => {
        if (!e.target.classList.contains('filter-btn')) { return; }

        filterButtons.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        currentFilter = e.target.dataset.filter;
        displayTimeline();
    });
}

/**
 * Upcoming / Past / All buttons above the timeline.
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


/**
 * Calendar feed, .ics download and share buttons. The notification button is
 * wired separately by setupNotifications.
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
 * Wire the notification button. Hidden if the browser has no service worker or
 * Notification API. Turning it on requests permission and starts alerts
 * (startAlerts); turning it off cancels local timers and push. On a visit with
 * notifications already on, alerts are started again.
 */
async function setupNotifications() {
    const notifyBtn = document.getElementById('enable-notifications');
    if (!notifyBtn) { return; }

    const status = await Notifications.initialize();

    if (!status.supported) {
        notifyBtn.style.display = 'none';
        return;
    }

    updateNotificationButton(notifyBtn, status.permissionStatus, status.enabled);

    notifyBtn.addEventListener('click', async () => {
        // iOS: only Safari, installed to the Home Screen, can show notifications.
        if (Notifications.isUnsupportedIOSBrowser()) {
            showUnsupportedBrowserModal();
            return;
        }

        if (Notifications.requiresPWAInstall()) {
            showPWAInstallModal();
            return;
        }

        const currentPermission = Notifications.getPermissionStatus();
        const isEnabled = Notifications.isEnabled();

        if (currentPermission === 'denied') {
            showToast('Notifications are blocked for this site. Allow them in your browser settings, then tap the bell again.');
            return;
        }

        if (isEnabled) {
            Notifications.setEnabled(false);
            Notifications.cancelScheduledNotifications(scheduledNotifications);
            scheduledNotifications = [];
            if (Notifications.isPushSupported()) {
                Notifications.unsubscribeFromPush().catch(err => {
                    console.log('Failed to unsubscribe from push:', err);
                });
            }
            updateNotificationButton(notifyBtn, currentPermission, false);
            showToast('Notifications off. You will not get milestone alerts on this device.');
        } else {
            if (currentPermission !== 'granted') {
                const result = await Notifications.requestPermission();
                if (!result.granted) {
                    if (result.reason === 'denied') {
                        showToast('Notifications are blocked for this site. Allow them in your browser settings, then tap the bell again.');
                    }
                    return;
                }
            }

            Notifications.setEnabled(true);
            updateNotificationButton(notifyBtn, 'granted', true);

            const viaPush = await startAlerts();
            showToast(viaPush
                ? `Notifications on. You get an alert ${describeAlertTimes()} each milestone, even with this page closed.`
                : `Notifications on. You get an alert ${describeAlertTimes()} each milestone, but only while this page is open.`);

            // A sample, so the user sees what an alert looks like and that it works.
            await Notifications.showNotification('Notifications on', {
                body: `Milestone alerts look like this. They arrive ${describeAlertTimes()} each milestone.`,
                tag: 'nerdiversary-enabled'
            });
        }
    });

    if (status.enabled && status.permissionStatus === 'granted') {
        await startAlerts();
    }
}

/**
 * Deliver milestone alerts from exactly one source, so none arrives twice:
 * server push when this browser can subscribe (it also covers the page being
 * open), local timers otherwise. Subscribing again also sends the worker the
 * current birthdays.
 * @returns {Promise<boolean>} true if alerts come by push
 */
async function startAlerts() {
    const familyParam = new URLSearchParams(window.location.search).get('family');
    if (familyParam && Notifications.isPushSupported()) {
        const pushResult = await Notifications.subscribeToPush(familyParam);
        if (pushResult.success) {
            Notifications.cancelScheduledNotifications(scheduledNotifications);
            scheduledNotifications = [];
            return true;
        }
        console.log('Push subscription failed, using local notifications:', pushResult.reason);
    }
    scheduleUpcomingNotifications();
    return false;
}

/**
 * The alert lead times as a phrase that reads before "each milestone":
 * "1 day before, 1 hour before and at the moment of".
 * @returns {string}
 */
function describeAlertTimes() {
    const parts = [...Notifications.getNotificationTimes()].sort((a, b) => b - a).map(min => {
        if (min === 0) { return 'at the moment of'; }
        let [n, unit] = [min, 'minute'];
        if (min % 1440 === 0) { [n, unit] = [min / 1440, 'day']; } else if (min % 60 === 0) { [n, unit] = [min / 60, 'hour']; }
        return `${n} ${unit}${n === 1 ? '' : 's'} before`;
    });
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
}

/**
 * Set the notification button's icon, label (NOTIFY_LABELS) and class.
 * @param {HTMLElement} button
 * @param {string} permission - from Notifications.getPermissionStatus
 * @param {boolean} enabled
 */
function updateNotificationButton(button, permission, enabled) {
    const icon = button.querySelector('.btn-icon');
    const text = button.querySelector('span:not(.btn-icon)');

    if (permission === 'denied') {
        button.classList.add('disabled');
        button.classList.remove('active');
        if (icon) { icon.textContent = '🔕'; }
        if (text) { text.textContent = NOTIFY_LABELS.blocked; }
    } else if (enabled) {
        button.classList.add('active');
        button.classList.remove('disabled');
        if (icon) { icon.textContent = '🔔'; }
        if (text) { text.textContent = NOTIFY_LABELS.on; }
    } else {
        button.classList.remove('active', 'disabled');
        if (icon) { icon.textContent = '🔕'; }
        if (text) { text.textContent = NOTIFY_LABELS.off; }
    }
}

/**
 * Replace the local alert timers with ones for the next 10 milestones in the
 * next 30 days, for everyone regardless of the person filter.
 */
function scheduleUpcomingNotifications() {
    Notifications.cancelScheduledNotifications(scheduledNotifications);

    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingEvents = allEvents
        .filter(e => e.date > now && e.date < oneMonthFromNow)
        .slice(0, 10);

    scheduledNotifications = Notifications.scheduleEventNotifications(upcomingEvents);

    console.log(`Scheduled ${scheduledNotifications.length} notifications for ${upcomingEvents.length} events`);
}

/**
 * Open the subscribe dialog for the worker's calendar feed, which takes this
 * page's query string as is.
 */
function subscribeToCalendar() {
    const urlParams = new URLSearchParams(window.location.search);

    const calendarUrl = `${WORKER_URL}/?${urlParams.toString()}`;

    showSubscribeModal(calendarUrl);
}

/**
 * Dialog for iOS Safari in a tab: how to add the site to the Home Screen so it
 * can send notifications.
 */
function showPWAInstallModal() {
    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            <h3>Add to Home Screen</h3>
            <p>iPhone and iPad only send notifications from web apps on your Home Screen. To add this one:</p>
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
                    <span>Tap <strong>${NOTIFY_LABELS.off}</strong> again</span>
                </div>
            </div>
            <button class="import-close" onclick="this.closest('.import-modal').remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
        if (e.target === modal) { modal.remove(); }
    });
}

/**
 * Dialog for Chrome, Firefox and other non-Safari browsers on iOS: how to get
 * notifications by switching to Safari.
 */
function showUnsupportedBrowserModal() {
    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            <h3>Safari required</h3>
            <p>On iPhone and iPad, only web apps added to the Home Screen from <strong>Safari</strong> can send notifications. To set that up:</p>
            <div class="pwa-install-steps">
                <div class="pwa-step">
                    <span class="pwa-step-number">1</span>
                    <span>Copy this page's address</span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">2</span>
                    <span>Open it in <strong>Safari</strong></span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">3</span>
                    <span>Tap <strong>Share</strong>, then <strong>"Add to Home Screen"</strong></span>
                </div>
                <div class="pwa-step">
                    <span class="pwa-step-number">4</span>
                    <span>Open the app from your Home Screen and tap <strong>${NOTIFY_LABELS.off}</strong></span>
                </div>
            </div>
            <button class="import-close" onclick="this.closest('.import-modal').remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
        if (e.target === modal) { modal.remove(); }
    });
}

/**
 * Dialog with Google, Apple and Outlook subscribe links for the feed, plus the
 * raw URL to copy. Apple Calendar takes the webcal:// form.
 * @param {string} calendarUrl - https URL of the worker feed
 */
function showSubscribeModal(calendarUrl) {
    const webcalUrl = calendarUrl.replace('https://', 'webcal://');
    // Encoded so the feed's own query string stays inside Google's cid parameter.
    const googleCalUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
    const outlookUrl = `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(calendarUrl)}`;

    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content">
            <h3>📅 Subscribe in your calendar</h3>
            <p>The feed always holds your next 2 years of milestones and moves forward on its own, so you never have to re-import.</p>
            <div class="import-options">
                <a href="${escapeHtml(googleCalUrl)}" target="_blank" class="import-option" id="gcal-subscribe">
                    <span class="import-icon">📅</span>
                    <span>Google Calendar</span>
                    <small>Opens Google Calendar</small>
                </a>
                <a href="${escapeHtml(webcalUrl)}" class="import-option" id="apple-subscribe">
                    <span class="import-icon">🍎</span>
                    <span>Apple Calendar</span>
                    <small>Opens the Calendar app</small>
                </a>
                <a href="${escapeHtml(outlookUrl)}" target="_blank" class="import-option" id="outlook-subscribe">
                    <span class="import-icon">📧</span>
                    <span>Outlook</span>
                    <small>Opens Outlook.com</small>
                </a>
            </div>
            <div class="subscribe-url-section">
                <p class="subscribe-url-label">Or paste this address into any calendar app that can subscribe to a URL:</p>
                <div class="subscribe-url-box">
                    <input type="text" value="${escapeHtml(calendarUrl)}" readonly id="calendar-url-input">
                    <button onclick="copyCalendarUrl()" class="copy-btn">📋 Copy</button>
                </div>
            </div>
            <button class="import-close" onclick="this.closest('.import-modal').remove()">Done</button>
        </div>
    `;
    document.body.appendChild(modal);

    // On iOS the webcal: link is opened by navigating this tab; on desktop the
    // plain href works.
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
 * Copy the feed URL from the subscribe dialog, falling back to execCommand
 * where the Clipboard API is refused.
 */
function copyCalendarUrl() {
    const input = document.getElementById('calendar-url-input');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Calendar address copied');
    }).catch(() => {
        const success = document.execCommand('copy');
        showToast(success ? 'Calendar address copied' : 'Copying failed. Select the address and copy it by hand.');
    });
}

// For the inline onclick in showSubscribeModal's markup.
window.copyCalendarUrl = copyCalendarUrl;

/**
 * Google Calendar "add event" link for one milestone, one hour long.
 * @param {Object} event - an allEvents entry
 * @returns {string}
 */
function createGoogleCalendarUrl(event) {
    const startDate = formatICalDate(event.date);
    const endDate = formatICalDate(new Date(event.date.getTime() + Milestones.MS_PER_HOUR));

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
 * Download an .ics of every future milestone for everyone. Unlike the feed it
 * is a snapshot and never updates.
 */
function downloadICalendar() {
    const upcomingEvents = allEvents.filter(e => !e.isPast);
    const icalContent = generateICal(upcomingEvents, familyMembers.length > 1);

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = familyMembers.length > 1 ? 'family-nerdiversaries.ics' : 'nerdiversaries.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded ${link.download}. Open it to import the milestones into your calendar.`);
}

/**
 * Share this page's URL through the system share sheet, or copy it where there
 * is none.
 */
function shareResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;

    const shareText = familyMembers.length > 1
        ? 'Our family\'s nerdy time milestones: billion-second birthdays, Mars years, and more'
        : 'My nerdy time milestones: billion-second birthdays, Mars years, and more';

    if (navigator.share) {
        navigator.share({
            title: familyMembers.length > 1 ? 'Nerdiversary: our family\'s milestones' : 'Nerdiversary: my milestones',
            text: shareText,
            url: shareUrl
        }).catch(err => {
            // User cancelling the share sheet is not a failure — don't copy
            if (err.name !== 'AbortError') {
                copyToClipboard(shareUrl);
            }
        });
    } else {
        copyToClipboard(shareUrl);
    }
}

/**
 * Share text for one milestone. The title is only ever used as a noun phrase
 * ("My 3rd Mars birthday is on ...") or after a label ("My upcoming milestone: 444 months"),
 * so any title wording reads correctly. Planet birthdays add the planet's year
 * length, without which "3rd Mars birthday" means nothing to most people.
 * @param {Object} event - an allEvents entry
 * @returns {string} plain text, not HTML
 */
function generateShareText(event) {
    const dateStr = event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const isPast = event.date < new Date();
    const isSelf = familyMembers.length === 1 || event.personName === 'Everyone';
    const whose = isSelf ? 'My' : `${event.personName}'s`;
    const planet = Object.values(Milestones.PLANETS).find(p => p.name === event.planet);

    if (event.isSharedHoliday) {
        return `${event.icon} ${event.title} ${isPast ? 'was' : 'is'} on ${dateStr}.`;
    }
    if (planet) {
        const earthDays = Math.round(planet.days).toLocaleString('en-US');
        const text = `${event.icon} ${whose} ${event.title} ${isPast ? 'was' : 'is'} on ${dateStr}. One ${planet.name} year is ${earthDays} Earth days.`;
        return event.rarity === 'legendary' ? `💎 Once in a lifetime: ${text}` : text;
    }
    if (event.rarity === 'legendary') {
        return `💎 Once in a lifetime${isSelf ? '' : ` for ${event.personName}`}: ${event.icon} ${event.title}, on ${dateStr}.`;
    }
    return `${event.icon} ${whose} ${isPast ? '' : 'upcoming '}milestone: ${event.title}, on ${dateStr}.`;
}

/**
 * Dialog to share one milestone on social sites or copy it.
 * @param {Object} event - an allEvents entry
 */
function showShareModal(event) {
    // The link goes to the worker's /share page, not the site: link-preview
    // scrapers don't run JS, so the milestone's own title and card image have
    // to be in the served HTML. People are redirected on to the site.
    const familyParam = new URLSearchParams(window.location.search).get('family') || '';
    const shareParams = new URLSearchParams({
        t: event.title,
        d: event.date.toISOString(),
        i: event.icon,
        c: event.category
    });
    if (event.personName && event.personName !== 'Everyone') { shareParams.set('n', event.personName); }
    if (familyParam) { shareParams.set('f', familyParam); }
    const shareUrl = `${WORKER_URL}/share?${shareParams.toString()}`;
    const shareText = generateShareText(event);
    const fullShareText = `${shareText}\n\nFind your own milestones:`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
    const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(fullShareText)}&url=${encodeURIComponent(shareUrl)}`;

    const modal = document.createElement('div');
    modal.className = 'import-modal';
    modal.innerHTML = `
        <div class="import-modal-content share-modal-content">
            <h3>${event.icon} Share this milestone</h3>
            <div class="share-preview">
                <p class="share-preview-text">"${escapeHtml(shareText)}"</p>
            </div>
            <div class="share-options">
                <a href="${escapeHtml(twitterUrl)}" target="_blank" class="share-option twitter" title="Share on X" aria-label="Share on X">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="${escapeHtml(threadsUrl)}" target="_blank" class="share-option threads" title="Share on Threads" aria-label="Share on Threads">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.912 3.589 12c.027 3.086.718 5.494 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.253 1.332-3.05.857-.74 2.063-1.201 3.476-1.335.89-.084 2.412-.089 3.626.338v-.477c0-1.263-.258-2.153-.832-2.86-.516-.637-1.29-.973-2.37-1.029-2.074.006-3.193.888-3.496 1.648l-1.9-.702c.604-1.539 2.392-2.803 5.456-2.803 1.712.014 3.065.497 4.02 1.437.917.9 1.382 2.17 1.382 3.778v4.063c0 .201.015.403.046.602.078.506.37.907.87 1.193l-.978 1.764c-.745-.414-1.27-.96-1.578-1.622-.814.566-1.782.893-2.857 1.016-.215.024-.432.037-.65.043zm1.608-8.394c-2.33.153-3.576 1.004-3.513 2.396.032.701.376 1.265.967 1.586.536.292 1.255.414 1.988.374 1.055-.057 1.876-.45 2.443-1.168.478-.607.784-1.443.891-2.472-.872-.303-1.823-.399-2.776-.716z"/></svg>
                </a>
                <a href="${escapeHtml(facebookUrl)}" target="_blank" class="share-option facebook" title="Share on Facebook" aria-label="Share on Facebook">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="${escapeHtml(redditUrl)}" target="_blank" class="share-option reddit" title="Share on Reddit" aria-label="Share on Reddit">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                </a>
                <a href="${escapeHtml(linkedinUrl)}" target="_blank" class="share-option linkedin" title="Share on LinkedIn" aria-label="Share on LinkedIn">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <button class="share-option copy" title="Copy text and link" aria-label="Copy text and link">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
            <button class="import-close" onclick="this.closest('.import-modal').remove()">Done</button>
        </div>
    `;
    document.body.appendChild(modal);

    // A listener, not an inline onclick: the text contains user-provided names.
    modal.querySelector('.share-option.copy').addEventListener('click', () => {
        copyMilestoneShare(fullShareText, shareUrl);
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) { modal.remove(); }
    });
}

/**
 * Copy "<text> <url>", falling back to a hidden textarea and execCommand.
 * @param {string} text
 * @param {string} url
 */
function copyMilestoneShare(text, url) {
    const fullText = `${text} ${url}`;
    navigator.clipboard.writeText(fullText).then(() => {
        showToast('Text and link copied');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = fullText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Text and link copied');
    });
}

/**
 * Copy a link, falling back to a hidden textarea and execCommand.
 * @param {string} text
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Link copied');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Link copied');
    });
}

/**
 * Show a message at the bottom of the page for 3 seconds.
 * @param {string} message
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
 * Full-screen overlay with confetti for a milestone arriving now. It sends no
 * notification: the "at the moment" alert (push or local timer) is the one.
 * @param {Object} event - an allEvents entry
 */
function showCelebration(event) {
    // Overlay first, then confetti: appended later means drawn on top.
    const showPerson = familyMembers.length > 1;
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = `
        <div class="celebration-content">
            <span class="celebration-emoji">${event.icon}</span>
            <h2 class="celebration-title">🎉 ${HAPPENING_NOW} 🎉</h2>
            ${showPerson ? `<p class="celebration-person" style="background: ${event.personColor}">${escapeHtml(event.personName)}</p>` : ''}
            <p class="celebration-event">${event.title}</p>
            <p class="celebration-description">${event.description}</p>
            <button class="celebration-dismiss">Show the next milestone</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);

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

    const dismissBtn = overlay.querySelector('.celebration-dismiss');
    dismissBtn.addEventListener('click', () => {
        overlay.style.animation = 'celebration-fade-in 0.3s ease-out reverse';
        confettiContainer.style.opacity = '0';
        confettiContainer.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            overlay.remove();
            confettiContainer.remove();
            calculateAndDisplayEvents();
            startCountdownTimer();
        }, 300);
    });

    // A click outside the content box also dismisses.
    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            dismissBtn.click();
        }
    });
}

// Show the celebration for the next milestone now, or a placeholder if there
// is none. Used by the e2e tests and handy from the browser console.
window.testCelebration = function () {
    const now = new Date();
    const filteredEvents = getFilteredByPerson(allEvents);
    const nextEvent = filteredEvents.filter(e => e.date > now)[0];
    if (nextEvent) {
        showCelebration(nextEvent);
    } else {
        showCelebration({
            icon: '🎉',
            title: 'Test celebration',
            description: 'This screen appears when a milestone arrives while the page is open.',
            personName: 'Test',
            personColor: 'rgba(124, 58, 237, 0.8)'
        });
    }
};
