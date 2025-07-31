import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const app = window.firebaseApp;
    const auth = getAuth(app);
    const db = getFirestore(app);

    const authForm = document.getElementById('authForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const toggleBtn = document.getElementById('toggleBtn');
    const formTitle = document.getElementById('formTitle');
    const toggleText = document.getElementById('toggleText');
    const notificationModal = document.getElementById('notificationModal');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationCloseBtn = document.getElementById('notificationCloseBtn');

    let isSignInMode = true;

    function showNotification(message) {
        notificationMessage.textContent = message;
        notificationModal.classList.remove('hidden');
    }
    notificationCloseBtn.addEventListener('click', () => {
        notificationModal.classList.add('hidden');
    });

    function toggleMode() {
        isSignInMode = !isSignInMode;
        formTitle.textContent = isSignInMode ? 'Sign In' : 'Create Account';
        submitBtn.textContent = isSignInMode ? 'Sign In' : 'Create Account';
        toggleText.innerHTML = isSignInMode 
            ? `Don't have an account? <button id="toggleBtn" class="font-bold text-yellow-500 hover:underline">Create one</button>`
            : `Already have an account? <button id="toggleBtn" class="font-bold text-yellow-500 hover:underline">Sign in</button>`;
        document.getElementById('toggleBtn').addEventListener('click', toggleMode);
    }
    toggleBtn.addEventListener('click', toggleMode);

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showNotification('Please fill in all fields.');
            return;
        }

        if (isSignInMode) {
            signInWithEmailAndPassword(auth, email, password)
                .then(() => { window.location.href = 'tracker.html'; })
                .catch(() => { showNotification('Invalid email or password.'); });
        } else {
            createUserWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    const user = userCredential.user;
                    // Create an empty user document. Data will be stored in subcollections.
                    await setDoc(doc(db, "users", user.uid), { email: user.email, createdAt: new Date() });
                    window.location.href = 'tracker.html';
                })
                .catch((error) => {
                    if (error.code === 'auth/email-already-in-use') {
                        showNotification('An account with this email already exists.');
                    } else if (error.code === 'auth/weak-password') {
                        showNotification('Password should be at least 6 characters.');
                    } else {
                        showNotification('Failed to create account. Please try again.');
                    }
                });
        }
    });
});
