document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();

        if (username) {
            // Save the current user to localStorage
            localStorage.setItem('currentUser', username);

            // Redirect to the main tracker page
            window.location.href = 'tracker.html';
        } else {
            alert('Please enter a username.');
        }
    });
});