/**
 * Main page script - handles birthday form submission
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('birthday-form');
    const birthdateInput = document.getElementById('birthdate');
    const birthtimeInput = document.getElementById('birthtime');

    // Set max date to today
    const today = new Date();
    birthdateInput.max = today.toISOString().split('T')[0];

    // Set a reasonable min date (150 years ago)
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 150);
    birthdateInput.min = minDate.toISOString().split('T')[0];

    // Check for stored birthdate on page load
    const storedBirthdate = localStorage.getItem('nerdiversary_birthdate');
    const storedBirthtime = localStorage.getItem('nerdiversary_birthtime');

    if (storedBirthdate) {
        birthdateInput.value = storedBirthdate;
    }
    if (storedBirthtime) {
        birthtimeInput.value = storedBirthtime;
    }

    // Check URL parameters for shared links
    const urlParams = new URLSearchParams(window.location.search);
    const sharedDate = urlParams.get('d');
    const sharedTime = urlParams.get('t');

    if (sharedDate) {
        birthdateInput.value = sharedDate;
        if (sharedTime) {
            birthtimeInput.value = sharedTime;
        }
    }

    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const birthdate = birthdateInput.value;
        const birthtime = birthtimeInput.value || '00:00';

        if (!birthdate) {
            alert('Please enter your birthday!');
            return;
        }

        // Store in localStorage
        localStorage.setItem('nerdiversary_birthdate', birthdate);
        localStorage.setItem('nerdiversary_birthtime', birthtime);

        // Navigate to results page with query params
        const params = new URLSearchParams();
        params.set('d', birthdate);
        if (birthtimeInput.value) {
            params.set('t', birthtime);
        }

        window.location.href = `results.html?${params.toString()}`;
    });

    // Add some interactive effects
    addStarfieldInteractivity();
});

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
