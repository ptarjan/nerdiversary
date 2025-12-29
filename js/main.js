/**
 * Main page script - handles birthday form submission
 */

let memberCount = 1;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('birthday-form');
    const addMemberBtn = document.getElementById('add-member');
    const familyMembers = document.getElementById('family-members');

    // Set date constraints for first member
    setupDateConstraints(0);

    // Check for stored family data on page load
    loadStoredData();

    // Check URL parameters for shared links
    loadFromUrlParams();

    // Add family member button
    addMemberBtn.addEventListener('click', function() {
        addFamilyMember();
    });

    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm();
    });

    // Add some interactive effects
    addStarfieldInteractivity();
});

/**
 * Set up date constraints for a member's birthdate input
 */
function setupDateConstraints(index) {
    const birthdateInput = document.getElementById(`birthdate-${index}`);
    if (!birthdateInput) return;

    // Set max date to today
    const today = new Date();
    birthdateInput.max = today.toISOString().split('T')[0];

    // Set a reasonable min date (150 years ago)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    birthdateInput.min = minDate.toISOString().split('T')[0];
}

/**
 * Load stored family data from localStorage
 */
function loadStoredData() {
    const storedFamily = localStorage.getItem('nerdiversary_family');
    if (storedFamily) {
        try {
            const family = JSON.parse(storedFamily);
            if (Array.isArray(family) && family.length > 0) {
                // Load first member
                const first = family[0];
                document.getElementById('name-0').value = first.name || '';
                document.getElementById('birthdate-0').value = first.date || '';
                if (first.time) {
                    document.getElementById('birthtime-0').value = first.time;
                }

                // Add and load additional members
                for (let i = 1; i < family.length; i++) {
                    addFamilyMember(family[i]);
                }
            }
        } catch (e) {
            console.error('Failed to load stored family data:', e);
        }
    }
}

/**
 * Load family data from URL parameters
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
                    time: parts[2] || ''
                };
            });

            if (members.length > 0) {
                // Load first member
                document.getElementById('name-0').value = members[0].name;
                document.getElementById('birthdate-0').value = members[0].date;
                if (members[0].time) {
                    document.getElementById('birthtime-0').value = members[0].time;
                }

                // Add additional members
                for (let i = 1; i < members.length; i++) {
                    addFamilyMember(members[i]);
                }
            }
        } catch (e) {
            console.error('Failed to parse family URL param:', e);
        }
        return;
    }

    // Legacy single-person format
    const sharedDate = urlParams.get('d');
    const sharedTime = urlParams.get('t');
    if (sharedDate) {
        document.getElementById('birthdate-0').value = sharedDate;
        if (sharedTime) {
            document.getElementById('birthtime-0').value = sharedTime;
        }
    }
}

/**
 * Add a new family member to the form
 */
function addFamilyMember(data = null) {
    const familyMembers = document.getElementById('family-members');
    const index = memberCount++;

    const memberDiv = document.createElement('div');
    memberDiv.className = 'family-member';
    memberDiv.dataset.index = index;
    const name = data && data.name ? data.name : '';
    const date = data && data.date ? data.date : '';
    const time = data && data.time ? data.time : '';

    memberDiv.innerHTML = `
        <div class="member-header">
            <span class="member-label">Person ${index + 1}</span>
            <button type="button" class="remove-member-btn" onclick="removeFamilyMember(${index})">✕</button>
        </div>
        <div class="form-group">
            <label for="name-${index}">Name</label>
            <input type="text" id="name-${index}" name="name" placeholder="Name" required value="${name}">
        </div>
        <div class="form-group">
            <label for="birthdate-${index}">Birthday</label>
            <input type="date" id="birthdate-${index}" name="birthdate" required value="${date}">
        </div>
        <div class="form-group optional">
            <label for="birthtime-${index}">
                Birth Time <span class="optional-label">(optional)</span>
            </label>
            <input type="time" id="birthtime-${index}" name="birthtime" step="60" value="${time}">
        </div>
    `;

    familyMembers.appendChild(memberDiv);
    setupDateConstraints(index);

    // Show remove button on first member if we now have multiple
    updateRemoveButtons();
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
    }
}

/**
 * Update visibility of remove buttons
 */
function updateRemoveButtons() {
    const members = document.querySelectorAll('.family-member');
    const firstMember = members[0];

    if (members.length > 1) {
        // Add remove button to first member if not present
        if (!firstMember.querySelector('.remove-member-btn')) {
            const header = firstMember.querySelector('.member-header');
            const index = firstMember.dataset.index;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'remove-member-btn';
            btn.textContent = '✕';
            btn.onclick = () => removeFamilyMember(parseInt(index));
            header.appendChild(btn);
        }
    } else {
        // Remove the button from first member if only one left
        const btn = firstMember?.querySelector('.remove-member-btn');
        if (btn) btn.remove();
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
function submitForm() {
    const members = document.querySelectorAll('.family-member');
    const family = [];

    members.forEach(member => {
        const index = member.dataset.index;
        const name = document.getElementById(`name-${index}`).value.trim();
        const birthdate = document.getElementById(`birthdate-${index}`).value;
        const birthtime = document.getElementById(`birthtime-${index}`).value || '';

        if (name && birthdate) {
            family.push({ name, date: birthdate, time: birthtime });
        }
    });

    if (family.length === 0) {
        alert('Please enter at least one person!');
        return;
    }

    // Store in localStorage
    localStorage.setItem('nerdiversary_family', JSON.stringify(family));

    // Build URL params
    const familyParam = family.map(m =>
        `${encodeURIComponent(m.name)}|${m.date}${m.time ? '|' + m.time : ''}`
    ).join(',');

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

    document.addEventListener('mousemove', (e) => {
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
