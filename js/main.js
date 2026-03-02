/**
 * Main page script - handles birthday form submission
 */

/**
 * Find the next available member index
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
 * Get short timezone name for display (e.g., "PST", "MST", "EST")
 */
function getTimezoneName() {
    try {
        return Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
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
 * Get the device's IANA timezone (e.g., "America/Denver")
 */
function getIANATimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return '';
    }
}

/**
 * Populate a timezone select element with all IANA timezones
 */
function populateTimezoneSelect(selectEl) {
    const deviceTz = getIANATimezone();
    let timezones;
    try {
        timezones = Intl.supportedValuesOf('timeZone');
    } catch {
        // Fallback for older browsers
        timezones = [deviceTz].filter(Boolean);
    }

    selectEl.innerHTML = '';

    for (const tz of timezones) {
        const option = document.createElement('option');
        option.value = tz;
        option.textContent = tz.replace(/_/g, ' ');
        if (tz === deviceTz) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    }
}

/**
 * Toggle visibility of the timezone select for a member
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
 * Populate all timezone labels on the page and set up toggle click handlers
 */
function updateTimezoneLabels() {
    const tz = getTimezoneName();
    document.querySelectorAll('.timezone-label').forEach(el => {
        el.textContent = tz;
    });

    document.querySelectorAll('.timezone-toggle').forEach(link => {
        // Avoid adding duplicate listeners by replacing the node
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        newLink.addEventListener('click', e => {
            e.preventDefault();
            const index = parseInt(newLink.dataset.index, 10);
            toggleTimezoneSelect(index);
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('birthday-form');
    const addMemberBtn = document.getElementById('add-member');

    // Set date constraints and timezone labels for first member
    setupDateConstraints(0);
    updateTimezoneLabels();

    // Check URL parameters first - if present, use those (shared link)
    // Otherwise load from storage (localStorage + IndexedDB fallback)
    const hasUrlParams = loadFromUrlParams();
    let hasStoredData = false;
    if (!hasUrlParams) {
        hasStoredData = await loadStoredData();
    }

    // Auto-navigate to results if we have stored data (unless user clicked "New Calculation")
    // This improves the experience - users see their nerdiversaries immediately
    const urlParams = new URLSearchParams(window.location.search);
    const isNewCalculation = urlParams.get('new') === '1';
    if (hasStoredData && !isNewCalculation) {
        submitForm();
        return; // Skip rest of initialization since we're navigating away
    }

    // Add family member button
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            addFamilyMember();
        });
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            submitForm();
        });
    }

    // Add some interactive effects
    addStarfieldInteractivity();
});

/**
 * Set up date constraints for a member's birthdate input
 */
function setupDateConstraints(index) {
    const birthdateInput = document.getElementById(`birthdate-${index}`);
    if (!birthdateInput) { return; }

    // Set max date to today
    const today = new Date();
    birthdateInput.max = today.toISOString().split('T')[0];

    // Set a reasonable min date (150 years ago)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    birthdateInput.min = minDate.toISOString().split('T')[0];
}

/**
 * Load stored family data from localStorage/IndexedDB
 * @returns {Promise<boolean>} true if valid data was loaded, false otherwise
 */
async function loadStoredData() {
    try {
        const family = await window.NerdiversaryStorage.loadFamily();
        if (family && family.length > 0) {
            // Load first member
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

            // Add and load additional members
            for (let i = 1; i < family.length; i++) {
                addFamilyMember(family[i]);
            }

            // Return true if at least one member has a valid date
            return family.some(m => m.date && m.date.match(/^\d{4}-\d{2}-\d{2}$/));
        }
    } catch (e) {
        console.error('Failed to load stored family data:', e);
    }
    return false;
}

/**
 * Load family data from URL parameters
 * @returns {boolean} true if valid URL params were loaded, false otherwise
 */
function loadFromUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for new family format
    const familyParam = urlParams.get('family');
    if (familyParam) {
        try {
            const members = familyParam.split(',').map(m => {
                const parts = m.split('|');
                return {
                    name: decodeURIComponent(parts[0] || ''),
                    date: parts[1] || '',
                    time: parts[2] || '',
                    timezone: parts[3] || ''
                };
            });

            // Only use URL params if they contain valid data (at least one member with a date)
            const validMembers = members.filter(m => m.date && m.date.match(/^\d{4}-\d{2}-\d{2}$/));
            if (validMembers.length > 0) {
                // Load first member
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

                // Add additional members
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

/**
 * Add a new family member to the form
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
            <button type="button" class="remove-member-btn" onclick="removeFamilyMember(${index})">✕</button>
        </div>
        <div class="form-group">
            <label for="name-${index}">Name</label>
            <input type="text" id="name-${index}" name="name" placeholder="Name" required>
        </div>
        <div class="form-group">
            <label for="birthdate-${index}">Birthday</label>
            <input type="date" id="birthdate-${index}" name="birthdate" required>
        </div>
        <div class="form-group optional">
            <label for="birthtime-${index}">
                Birth Time <span class="optional-label">(optional, <a href="#" class="timezone-toggle" data-index="${index}"><span class="timezone-label"></span></a>)</span>
            </label>
            <input type="time" id="birthtime-${index}" name="birthtime" step="60">
            <select id="birthtz-${index}" name="birthtz" class="birth-timezone-select" style="display:none"></select>
        </div>
    `;

    // Set values via DOM properties to prevent XSS
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

    // Show remove button on first member and make first name required
    updateRemoveButtons();
    updateNameRequired();
}

/**
 * Remove a family member from the form
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
 * Update visibility of remove buttons
 */
function updateRemoveButtons() {
    const members = document.querySelectorAll('.family-member');
    const firstMember = members[0];
    if (!firstMember) { return; }

    if (members.length > 1) {
        // Add remove button to first member if not present
        if (!firstMember.querySelector('.remove-member-btn')) {
            const header = firstMember.querySelector('.member-header');
            const { index } = firstMember.dataset;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'remove-member-btn';
            btn.textContent = '✕';
            btn.onclick = () => removeFamilyMember(parseInt(index, 10));
            header.appendChild(btn);
        }
    } else {
        // Remove the button from first member if only one left
        const btn = firstMember.querySelector('.remove-member-btn');
        if (btn) { btn.remove(); }
    }
}

/**
 * Update name required status - only required when multiple members
 */
function updateNameRequired() {
    const members = document.querySelectorAll('.family-member');
    const firstNameInput = document.getElementById('name-0');

    if (firstNameInput) {
        // Name is required only when there are multiple members
        firstNameInput.required = members.length > 1;
    }
}

/**
 * Renumber member labels after removal
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
 * Submit the form and navigate to results
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
        // Only include timezone if the select is visible (user explicitly chose it)
        const timezone = (tzEl && tzEl.style.display !== 'none') ? tzEl.value : '';

        if (birthdate) {
            // Use "You" as default name for single person
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
        alert('Please enter at least one birthday!');
        return;
    }

    // Store in localStorage + IndexedDB for iOS PWA persistence
    const saveSucceeded = await window.NerdiversaryStorage.saveFamily(family);

    // Warn user if save failed (they can still view results via URL)
    if (!saveSucceeded) {
        const proceed = confirm(
            'Unable to save your data (you may be in private browsing mode). ' +
            'Your birthdays will still appear on the next page, but won\'t be saved for next time.\n\n' +
            'Continue anyway?'
        );
        if (!proceed) {
            return;
        }
    }

    // Build URL params
    const familyParam = family.map(m => {
        let param = `${encodeURIComponent(m.name)}|${m.date}`;
        if (m.time || m.timezone) {
            param += `|${m.time || ''}`;
        }
        if (m.timezone) {
            param += `|${m.timezone}`;
        }
        return param;
    }).join(',');

    // Use relative URL - works regardless of subdirectory
    window.location.href = `results.html?family=${familyParam}`;
}

// Make removeFamilyMember available globally for onclick
window.removeFamilyMember = removeFamilyMember;

/**
 * Add mouse-following parallax to starfield
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
