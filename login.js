document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENT SELECTION ---
    const authForm = document.getElementById('authForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const toggleBtn = document.getElementById('toggleBtn');
    const formTitle = document.getElementById('formTitle');
    const toggleText = document.getElementById('toggleText');

    // Modal Elements
    const notificationModal = document.getElementById('notificationModal');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationCloseBtn = document.getElementById('notificationCloseBtn');

    let isSignInMode = true;

    // --- UTILITY: HASH PASSWORD ---
    // Securely creates a fingerprint of the password.
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // --- CUSTOM NOTIFICATION MODAL ---
    function showNotification(message) {
        // This function sets the text and makes the modal visible.
        notificationMessage.textContent = message;
        notificationModal.classList.remove('hidden');
    }
    notificationCloseBtn.addEventListener('click', () => {
        notificationModal.classList.add('hidden');
    });

    // --- UI TOGGLE ---
    function toggleMode() {
        isSignInMode = !isSignInMode;
        if (isSignInMode) {
            formTitle.textContent = 'Sign In';
            submitBtn.textContent = 'Sign In';
            toggleText.innerHTML = `Don't have an account? <button id="toggleBtn" class="font-bold text-yellow-500 hover:underline">Create one</button>`;
        } else {
            formTitle.textContent = 'Create Account';
            submitBtn.textContent = 'Create Account';
            toggleText.innerHTML = `Already have an account? <button id="toggleBtn" class="font-bold text-yellow-500 hover:underline">Sign in</button>`;
        }
        // Re-attach listener to the newly created button
        document.getElementById('toggleBtn').addEventListener('click', toggleMode);
    }
    toggleBtn.addEventListener('click', toggleMode);


    // --- FORM SUBMISSION LOGIC ---
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showNotification('Please fill in all fields.');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users')) || {};
        const passwordHash = await hashPassword(password);

        if (isSignInMode) {
            // --- SIGN IN LOGIC ---
            if (users[username] && users[username].passwordHash === passwordHash) {
                localStorage.setItem('currentUser', username);
                window.location.href = 'tracker.html';
            } else {
                showNotification('Invalid username or password.');
            }
        } else {
            // --- CREATE ACCOUNT LOGIC ---
            if (users[username]) {
                showNotification('Username already exists. Please choose another one.');
                return;
            }
            users[username] = {
                passwordHash: passwordHash,
                shows: [],
                lists: {}
            };
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', username);
            window.location.href = 'tracker.html';
        }
    });
});