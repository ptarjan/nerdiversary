/**
 * The birthday form on index.html: add and remove people, pick a birth time
 * zone, save to device storage (js/storage.js) and go to results.html with the
 * birthdays in the `family` URL parameter (format: parseFamilyParam in
 * js/shared.js).
 *
 * If birthdays are already stored, the page goes straight to results unless
 * the URL has `?new=1` (results.html's "Edit birthdays" link adds it).
 *
 * Each person's inputs are ids suffixed with a numeric index (`name-0`,
 * `birthdate-0`, `birthtime-0`, `birthtz-0`); person 0 is in the HTML, the rest
 * are added by addFamilyMember.
 */

import * as Storage from './storage.js';
import { buildFamilyParam } from './shared.js';

/**
 * Lowest index not used by any person on the form, so a removed person's
 * index is reused.
 * @returns {number}
 */
function getNextMemberIndex() {
    const members = document.querySelectorAll('.family-member');
    const usedIndices = new Set();
    members.forEach(m => usedIndices.add(parseInt(m.dataset.index, 10)));

    let index = 0;
    while (usedIndices.has(index)) {
        index++;
    }
    return index;
}

/**
 * The device's time zone abbreviation for the "Birth time (optional, in PDT)"
 * label, e.g. "PDT", or "GMT+2" where no abbreviation exists.
 * @returns {string}
 */
function getTimezoneName() {
    try {
        return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
            .formatToParts(new Date())
            .find(p => p.type === 'timeZoneName').value;
    } catch {
        const offset = new Date().getTimezoneOffset();
        const sign = offset <= 0 ? '+' : '-';
        const hours = Math.floor(Math.abs(offset) / 60);
        return `UTC${sign}${hours}`;
    }
}

/**
 * The device's IANA time zone, e.g. "America/Denver", or '' if unavailable.
 * @returns {string}
 */
function getIANATimezone() {
    try {
        return new Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return '';
    }
}

// Choices for the birth time zone select: one zone per distinct UTC offset and
// DST rule. The comment on each is its standard/daylight offset from UTC.
const COMMON_TIMEZONES = [
    'Pacific/Pago_Pago', // -11
    'Pacific/Honolulu', // -10
    'Pacific/Marquesas', // -9:30
    'America/Anchorage', // -9/-8
    'America/Los_Angeles', // -8/-7
    'America/Phoenix', // -7 (no DST)
    'America/Denver', // -7/-6
    'America/Chicago', // -6/-5
    'America/New_York', // -5/-4
    'America/Bogota', // -5 (no DST)
    'America/Halifax', // -4/-3
    'America/Caracas', // -4 (no DST)
    'America/St_Johns', // -3:30/-2:30
    'America/Sao_Paulo', // -3
    'Atlantic/South_Georgia', // -2
    'Atlantic/Azores', // -1/+0
    'Atlantic/Cape_Verde', // -1 (no DST)
    'Atlantic/Reykjavik', // +0 (no DST)
    'Europe/London', // +0/+1
    'Africa/Lagos', // +1 (no DST)
    'Europe/Paris', // +1/+2
    'Africa/Cairo', // +2 (no DST)
    'Europe/Athens', // +2/+3
    'Africa/Nairobi', // +3 (no DST)
    'Europe/Moscow', // +3 (no DST)
    'Asia/Tehran', // +3:30/+4:30
    'Asia/Dubai', // +4
    'Asia/Kabul', // +4:30
    'Asia/Karachi', // +5
    'Asia/Kolkata', // +5:30
    'Asia/Kathmandu', // +5:45
    'Asia/Dhaka', // +6
    'Asia/Yangon', // +6:30
    'Asia/Bangkok', // +7
    'Asia/Shanghai', // +8
    'Asia/Singapore', // +8
    'Australia/Perth', // +8
    'Asia/Tokyo', // +9
    'Australia/Darwin', // +9:30 (no DST)
    'Australia/Adelaide', // +9:30/+10:30
    'Australia/Brisbane', // +10 (no DST)
    'Australia/Sydney', // +10/+11
    'Pacific/Noumea', // +11
    'Pacific/Auckland', // +12/+13
    'Pacific/Chatham', // +12:45/+13:45
    'Pacific/Tongatapu', // +13
];

/**
 * Fill a birth time zone select with COMMON_TIMEZONES plus the device's own
 * zone, sorted by today's UTC offset and labelled "(GMT-07:00) America / Denver".
 * The device's zone is selected.
 * @param {HTMLSelectElement} selectEl
 */
function populateTimezoneSelect(selectEl) {
    const deviceTz = getIANATimezone();

    const timezones = [...COMMON_TIMEZONES];
    if (deviceTz && !timezones.includes(deviceTz)) {
        timezones.push(deviceTz);
    }

    // Offsets are today's, so a DST zone is listed at its current offset.
    const now = new Date();
    const entries = timezones.map(tz => {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'shortOffset'
        });
        const parts = formatter.formatToParts(now);
        const offsetStr = parts.find(p => p.type === 'timeZoneName')?.value || '';
        const match = offsetStr.match(/GMT([+-]?)(\d+)?(?::(\d+))?/);
        let offsetMinutes = 0;
        if (match) {
            const sign = match[1] === '-' ? -1 : 1;
            const hours = parseInt(match[2] || '0', 10);
            const mins = parseInt(match[3] || '0', 10);
            offsetMinutes = sign * (hours * 60 + mins);
        }
        const sign = offsetMinutes <= 0 ? '-' : '+';
        const absH = Math.floor(Math.abs(offsetMinutes) / 60);
        const absM = Math.abs(offsetMinutes) % 60;
        const offsetLabel = offsetMinutes === 0 ? '' : `${sign + String(absH).padStart(2, '0')}:${String(absM).padStart(2, '0')}`;
        const label = `(GMT${offsetLabel}) ${tz.replace(/_/g, ' ').replace(/\//g, ' / ')}`;
        return { tz, label, offsetMinutes };
    });

    entries.sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.tz.localeCompare(b.tz));

    selectEl.innerHTML = '';

    for (const { tz, label } of entries) {
        const option = document.createElement('option');
        option.value = tz;
        option.textContent = label;
        if (tz === deviceTz) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    }
}

/**
 * Show or hide one person's time zone select, filling it on first show.
 * Whether it is visible decides whether the zone is saved (see submitForm).
 * @param {number} index
 */
function toggleTimezoneSelect(index) {
    const selectEl = document.getElementById(`birthtz-${index}`);
    if (!selectEl) { return; }

    if (selectEl.style.display === 'none') {
        if (selectEl.options.length === 0) {
            populateTimezoneSelect(selectEl);
        }
        selectEl.style.display = '';
    } else {
        selectEl.style.display = 'none';
    }
}

/**
 * Write the device's zone abbreviation into every person's time zone link.
 */
function updateTimezoneLabels() {
    const tz = getTimezoneName();
    document.querySelectorAll('.timezone-label').forEach(el => {
        el.textContent = tz;
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('birthday-form');
    const addMemberBtn = document.getElementById('add-member');

    setupDateConstraints(0);
    updateTimezoneLabels();

    // A `family` parameter prefills the form and wins over stored birthdays.
    const hasUrlParams = loadFromUrlParams();
    let hasStoredData = false;
    if (!hasUrlParams) {
        hasStoredData = await loadStoredData();
    }

    // Returning visitors go straight to their results; ?new=1 keeps them on the form.
    const urlParams = new URLSearchParams(window.location.search);
    const isNewCalculation = urlParams.get('new') === '1';
    if (hasStoredData && !isNewCalculation) {
        submitForm();
        return;
    }

    // Delegated so it also covers people added later.
    if (form) {
        form.addEventListener('click', e => {
            const toggle = e.target.closest('.timezone-toggle');
            if (toggle) {
                toggleTimezoneSelect(parseInt(toggle.dataset.index, 10));
            }
        });
    }

    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            addFamilyMember();
        });
    }

    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            submitForm();
        });
    }

    addStarfieldInteractivity();
});

/**
 * Limit a birthday input to the last 150 years, up to today (dates in UTC).
 * @param {number} index
 */
function setupDateConstraints(index) {
    const birthdateInput = document.getElementById(`birthdate-${index}`);
    if (!birthdateInput) { return; }

    const today = new Date();
    birthdateInput.max = today.toISOString().split('T')[0];

    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    birthdateInput.min = minDate.toISOString().split('T')[0];
}

/**
 * Prefill the form from device storage.
 * @returns {Promise<boolean>} true if at least one person with a valid date was loaded
 */
async function loadStoredData() {
    try {
        const family = await Storage.loadFamily();
        if (family && family.length > 0) {
            const first = family[0];
            const nameEl = document.getElementById('name-0');
            const dateEl = document.getElementById('birthdate-0');
            const timeEl = document.getElementById('birthtime-0');

            if (nameEl) { nameEl.value = first.name || ''; }
            if (dateEl) { dateEl.value = first.date || ''; }
            if (timeEl && first.time) { timeEl.value = first.time; }
            if (first.timezone) {
                const tzSelect = document.getElementById('birthtz-0');
                if (tzSelect) {
                    populateTimezoneSelect(tzSelect);
                    tzSelect.value = first.timezone;
                    tzSelect.style.display = '';
                }
            }

            for (let i = 1; i < family.length; i++) {
                addFamilyMember(family[i]);
            }

            return family.some(m => m.date && m.date.match(/^\d{4}-\d{2}-\d{2}$/));
        }
    } catch (e) {
        console.error('Failed to load stored family data:', e);
    }
    return false;
}

/**
 * Prefill the form from a `family` URL parameter on index.html. Parses the
 * format itself rather than with parseFamilyParam because the form wants the
 * raw date, time and zone strings, not a computed Date. Entries without a
 * YYYY-MM-DD date are dropped.
 * @returns {boolean} true if at least one person was loaded
 */
function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);

    const familyParam = urlParams.get('family');
    if (familyParam) {
        try {
            const members = familyParam.split(',').map(m => {
                const parts = m.split('|');
                let name;
                try {
                    name = decodeURIComponent(parts[0] || '');
                } catch {
                    // A bare % that is not an escape: keep the name as typed
                    name = parts[0] || '';
                }
                return {
                    name,
                    date: parts[1] || '',
                    time: parts[2] || '',
                    timezone: parts[3] || ''
                };
            });

            const validMembers = members.filter(m => m.date && m.date.match(/^\d{4}-\d{2}-\d{2}$/));
            if (validMembers.length > 0) {
                const nameEl = document.getElementById('name-0');
                const dateEl = document.getElementById('birthdate-0');
                const timeEl = document.getElementById('birthtime-0');

                if (nameEl) { nameEl.value = validMembers[0].name; }
                if (dateEl) { dateEl.value = validMembers[0].date; }
                if (timeEl && validMembers[0].time) { timeEl.value = validMembers[0].time; }
                if (validMembers[0].timezone) {
                    const tzSelect = document.getElementById('birthtz-0');
                    if (tzSelect) {
                        populateTimezoneSelect(tzSelect);
                        tzSelect.value = validMembers[0].timezone;
                        tzSelect.style.display = '';
                    }
                }

                for (let i = 1; i < validMembers.length; i++) {
                    addFamilyMember(validMembers[i]);
                }
                return true;
            }
        } catch (e) {
            console.error('Failed to parse family URL param:', e);
        }
    }
    return false;
}

// Name placeholders, picked by person index; entry 0 matches the placeholder
// hard-coded on person 1 in index.html.
const PLACEHOLDER_NAMES = [
    'Grace Hopper',
    'Alan Turing',
    'Ada Lovelace',
    'Katherine Johnson',
    'Marie Curie',
    'Carl Sagan',
];

/**
 * Append a person to the form, optionally prefilled.
 * @param {{name?: string, date?: string, time?: string, timezone?: string}|null} [data]
 */
function addFamilyMember(data = null) {
    const familyMembers = document.getElementById('family-members');
    if (!familyMembers) { return; }

    const index = getNextMemberIndex();

    const memberDiv = document.createElement('div');
    memberDiv.className = 'family-member';
    memberDiv.dataset.index = index;
    memberDiv.innerHTML = `
        <div class="member-header">
            <span class="member-label">Person ${index + 1}</span>
            <button type="button" class="remove-member-btn" aria-label="Remove this person" title="Remove this person" onclick="removeFamilyMember(${index})">✕</button>
        </div>
        <div class="form-group">
            <label for="name-${index}">Name</label>
            <input type="text" id="name-${index}" name="name" placeholder="${PLACEHOLDER_NAMES[index % PLACEHOLDER_NAMES.length]}" required>
        </div>
        <div class="form-group">
            <label for="birthdate-${index}">Birthday</label>
            <input type="date" id="birthdate-${index}" name="birthdate" required>
        </div>
        <div class="form-group optional">
            <label for="birthtime-${index}">
                Birth time <span class="optional-label">(optional, in <span class="timezone-toggle" data-index="${index}" title="Change the time zone of the birth time"><span class="timezone-label"></span></span>)</span>
            </label>
            <input type="time" id="birthtime-${index}" name="birthtime" step="60">
            <select id="birthtz-${index}" name="birthtz" class="birth-timezone-select" style="display:none"></select>
        </div>
    `;

    // Values come from the URL or storage, so they are set as properties,
    // never interpolated into the innerHTML above.
    if (data) {
        if (data.name) { memberDiv.querySelector(`#name-${index}`).value = data.name; }
        if (data.date) { memberDiv.querySelector(`#birthdate-${index}`).value = data.date; }
        if (data.time) { memberDiv.querySelector(`#birthtime-${index}`).value = data.time; }
        if (data.timezone) {
            const tzSelect = memberDiv.querySelector(`#birthtz-${index}`);
            populateTimezoneSelect(tzSelect);
            tzSelect.value = data.timezone;
            tzSelect.style.display = '';
        }
    }

    familyMembers.appendChild(memberDiv);
    setupDateConstraints(index);
    updateTimezoneLabels();

    updateRemoveButtons();
    updateNameRequired();
}

/**
 * Remove a person from the form. Called from the remove button's inline
 * onclick, hence the window global below.
 * @param {number} index
 */
function removeFamilyMember(index) {
    const memberDiv = document.querySelector(`.family-member[data-index="${index}"]`);
    if (memberDiv) {
        memberDiv.remove();
        updateRemoveButtons();
        renumberMembers();
        updateNameRequired();
    }
}

/**
 * Person 1's remove button is in no HTML template: add it when there are two
 * or more people and remove it when person 1 is alone.
 */
function updateRemoveButtons() {
    const members = document.querySelectorAll('.family-member');
    const firstMember = members[0];
    if (!firstMember) { return; }

    if (members.length > 1) {
        if (!firstMember.querySelector('.remove-member-btn')) {
            const header = firstMember.querySelector('.member-header');
            const { index } = firstMember.dataset;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'remove-member-btn';
            btn.textContent = '✕';
            btn.setAttribute('aria-label', 'Remove this person');
            btn.title = 'Remove this person';
            btn.onclick = () => removeFamilyMember(parseInt(index, 10));
            header.appendChild(btn);
        }
    } else {
        const btn = firstMember.querySelector('.remove-member-btn');
        if (btn) { btn.remove(); }
    }
}

/**
 * Person 1's name is optional when alone (submitForm saves them as "You")
 * and required once there are others. Added people always require a name.
 */
function updateNameRequired() {
    const members = document.querySelectorAll('.family-member');
    const firstNameInput = document.getElementById('name-0');

    if (firstNameInput) {
        firstNameInput.required = members.length > 1;
    }
}

/**
 * Relabel "Person N" by position. Element ids keep their original index.
 */
function renumberMembers() {
    const members = document.querySelectorAll('.family-member');
    members.forEach((member, i) => {
        const label = member.querySelector('.member-label');
        if (label) {
            label.textContent = `Person ${i + 1}`;
        }
    });
}

/**
 * Collect the form, save it to device storage and open results.html. People
 * without a birthday are skipped; so are people without a name, unless there is
 * only one person, who becomes "You". If saving fails the user is asked
 * whether to continue anyway.
 */
async function submitForm() {
    const members = document.querySelectorAll('.family-member');
    const family = [];

    members.forEach(member => {
        const { index } = member.dataset;
        const nameEl = document.getElementById(`name-${index}`);
        const dateEl = document.getElementById(`birthdate-${index}`);
        const timeEl = document.getElementById(`birthtime-${index}`);
        const tzEl = document.getElementById(`birthtz-${index}`);

        if (!dateEl) { return; }

        const name = nameEl ? nameEl.value.trim() : '';
        const birthdate = dateEl.value;
        const birthtime = timeEl ? timeEl.value : '';
        // A zone is saved only if the user opened the select. Without one, the
        // birth time is read in the zone of whichever device shows the results.
        const timezone = (tzEl && tzEl.style.display !== 'none') ? tzEl.value : '';

        if (birthdate) {
            const displayName = name || (members.length === 1 ? 'You' : '');
            if (displayName) {
                family.push({
                    name: displayName,
                    date: birthdate,
                    time: birthtime,
                    timezone
                });
            }
        }
    });

    if (family.length === 0) {
        alert('Enter at least one birthday.');
        return;
    }

    const saveSucceeded = await Storage.saveFamily(family);

    // The results still work from the URL; only the next visit loses them.
    if (!saveSucceeded) {
        const proceed = confirm(
            'This browser could not save the birthdays, probably because it is in private browsing mode. ' +
            'Your milestones will still show on the next page, but you will need to enter the birthdays again next time.\n\n' +
            'Continue?'
        );
        if (!proceed) {
            return;
        }
    }

    // Relative, so the site works under any path.
    window.location.href = `results.html?family=${encodeURIComponent(buildFamilyParam(family))}`;
}

// For the inline onclick on added people's remove buttons.
window.removeFamilyMember = removeFamilyMember;

/**
 * Shift the two background star layers with the mouse, the twinkling layer by
 * half as much, for a parallax effect.
 */
function addStarfieldInteractivity() {
    const stars = document.querySelector('.stars');
    const twinkling = document.querySelector('.twinkling');

    if (!stars && !twinkling) { return; }

    document.addEventListener('mousemove', e => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        const offsetX = (x - 0.5) * 20;
        const offsetY = (y - 0.5) * 20;

        if (stars) {
            stars.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }
        if (twinkling) {
            twinkling.style.transform = `translate(${offsetX * 0.5}px, ${offsetY * 0.5}px)`;
        }
    });
}
