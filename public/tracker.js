import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// This script needs access to the initialized Firebase app.
// We'll wait for the main firebase-app script in index.html to load.
const checkFirebase = setInterval(() => {
    if (window.firebaseApp) {
        clearInterval(checkFirebase);
        initializeApp();
    }
}, 100);

function initializeApp() {
    const app = window.firebaseApp;
    const auth = getAuth(app);
    const db = getFirestore(app);

    let currentUser = null;

    // --- STATE MANAGEMENT ---
    let shows = [];
    let lists = {};
    let currentFilter = 'all';
    let editingShowId = null;
    let showIdToAdd = null;
    let confirmAction = null;

    // --- DOM ELEMENTS ---
    const welcomeMessage = document.getElementById('welcomeMessage');
    const signOutBtn = document.getElementById('signOutBtn');
    const addShowForm = document.getElementById('addShowForm');
    const showsList = document.getElementById('showsList');
    const emptyState = document.getElementById('emptyState');
    const filterContainer = document.getElementById('filter-container');
    const customListsContainer = document.getElementById('custom-lists-container');
    const createListForm = document.getElementById('createListForm');
    const editModal = document.getElementById('editModal');
    const addToListModal = document.getElementById('addToListModal');
    const notificationModal = document.getElementById('notificationModal');
    const confirmationModal = document.getElementById('confirmationModal');
    const editShowForm = document.getElementById('editShowForm');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const addToListForm = document.getElementById('addToListForm');
    const cancelAddToListBtn = document.getElementById('cancelAddToList');
    const modalListContainer = document.getElementById('modalListContainer');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationIcon = document.getElementById('notificationIcon');
    const notificationCloseBtn = document.getElementById('notificationCloseBtn');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');

    // --- FIREBASE AUTH LISTENER ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            welcomeMessage.textContent = `Welcome, ${user.email}!`;
            await loadData();
            render();
        } else {
            window.location.href = 'index.html';
        }
    });

    // --- DATA PERSISTENCE (FIREBASE) ---
    async function loadData() {
        if (!currentUser) return;
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            shows = data.shows || [];
            lists = data.lists || {};
        }
    }

    async function saveData() {
        if (!currentUser) return;
        const userDocRef = doc(db, "users", currentUser.uid);
        await setDoc(userDocRef, { shows, lists });
    }

    // --- MAIN RENDER FUNCTION ---
    function render() {
        renderShows();
        renderCustomLists();
        updateFilterButtons();
    }

    // --- UI RENDERING ---
    function renderShows() {
        let filteredShows = [];
        if (['all', 'watching', 'completed', 'plan-to-watch', 'dropped'].includes(currentFilter)) {
            filteredShows = currentFilter === 'all' ? shows : shows.filter(show => show.status === currentFilter);
        } else if (lists[currentFilter]) {
            const showIdsInList = lists[currentFilter];
            filteredShows = shows.filter(show => showIdsInList.includes(show.id));
        }
        showsList.innerHTML = '';
        if (filteredShows.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filteredShows.forEach(show => {
                const showElement = document.createElement('div');
                showElement.className = "bg-beige rounded-lg shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-shadow duration-200";
                const posterHTML = show.image ? `<img src="${show.image}" alt="Poster for ${show.title}" class="w-28 h-40 object-cover rounded shadow-md flex-shrink-0">` : `<div class="w-28 h-40 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs text-center p-2">No Poster</div>`;
                showElement.innerHTML = `<div class="flex gap-5 items-start">${posterHTML}<div class="flex-1"><div class="flex justify-between items-start mb-2"><h3 class="text-xl font-bold text-dark-green pr-2">${show.title}</h3><div class="flex gap-2 ml-4 flex-shrink-0"><button data-id="${show.id}" class="edit-btn px-3 py-1 bg-medium-green text-white rounded hover:bg-light-green transition-colors duration-200 text-sm">Edit</button><button data-id="${show.id}" class="delete-btn px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 text-sm">Remove</button></div></div><div class="flex flex-wrap gap-2 mb-3"><span class="px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(show.status)}">${getStatusText(show.status)}</span><span class="px-3 py-1 rounded-full text-sm font-medium bg-light-brown text-white">${show.genre || 'N/A'}</span>${show.rating ? `<span class="px-3 py-1 rounded-full text-sm font-medium bg-dark-green text-white">⭐ ${show.rating}/10</span>` : ''}</div><div class="bg-white p-3 rounded-lg mt-2"><p class="text-medium-brown font-medium mb-1 text-sm">Notes:</p><p class="text-dark-brown whitespace-pre-wrap text-sm">${show.notes || 'No notes added.'}</p></div><div class="mt-3"><button data-id="${show.id}" class="add-to-list-btn text-sm bg-gray-200 hover:bg-gray-300 text-dark-brown font-semibold py-1 px-3 rounded-lg">Add to List...</button></div></div></div>`;
                showsList.appendChild(showElement);
            });
        }
    }

    function renderCustomLists() {
        customListsContainer.innerHTML = '';
        if (Object.keys(lists).length === 0) {
            customListsContainer.innerHTML = `<p class="text-sm text-gray-400">You have no custom lists. Create one above!</p>`;
            return;
        }
        for (const listName in lists) {
            const button = document.createElement('button');
            button.className = `relative pr-8 pl-4 py-2 rounded-lg font-medium transition-colors duration-200 ${currentFilter === listName ? 'bg-yellow-600 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`;
            button.textContent = listName;
            button.setAttribute('data-filter', listName);
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs hover:text-red-300';
            deleteBtn.textContent = 'x';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                showConfirmation(`Are you sure you want to delete the "${listName}" list?`, async () => {
                    delete lists[listName];
                    if(currentFilter === listName) currentFilter = 'all';
                    await saveData();
                    render();
                });
            };
            button.appendChild(deleteBtn);
            customListsContainer.appendChild(button);
        }
    }

    function updateFilterButtons() {
        filterContainer.querySelectorAll('button').forEach(btn => {
            btn.className = `px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${btn.getAttribute('data-filter') === currentFilter ? 'bg-yellow-600 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`;
        });
    }

    // --- CUSTOM MODAL CONTROLS ---
    function showNotification(message, type = 'success') {
        notificationMessage.textContent = message;
        notificationIcon.textContent = type === 'success' ? '✅' : '❌';
        notificationModal.classList.remove('hidden');
    }

    function showConfirmation(message, onConfirm) {
        confirmationMessage.textContent = message;
        confirmAction = onConfirm;
        confirmationModal.classList.remove('hidden');
    }

    // --- CORE LOGIC & EVENT HANDLERS ---
    signOutBtn.addEventListener('click', () => {
        signOut(auth).catch((error) => console.error('Sign out error', error));
    });

    addShowForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('showTitle').value.trim();
        const status = document.getElementById('showStatus').value;
        if (!title || !status) return showNotification('Please fill in the show title and status.', 'error');

        // ===================================================================
        // BUG FIX IS HERE: Added checks for `s` and `s.title`
        // ===================================================================
        if (shows.some(s => s && s.title && s.title.toLowerCase() === title.toLowerCase())) {
            return showNotification('A show with this title has already been added.', 'error');
        }

        const posterFile = document.getElementById('showPoster').files[0];
        const imageUrl = posterFile ? await readFileAsDataURL(posterFile) : null;

        const newShow = {
            id: Date.now(), title, status, image: imageUrl,
            rating: parseInt(document.getElementById('showRating').value) || null,
            genre: document.getElementById('showGenre').value.trim(),
            notes: document.getElementById('showNotes').value.trim()
        };
        shows.unshift(newShow);
        await saveData();
        render();
        addShowForm.reset();
        showNotification('Show added successfully!', 'success');
    });

    createListForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const listNameInput = document.getElementById('listName');
        const listName = listNameInput.value.trim();
        if (listName && !lists[listName]) {
            lists[listName] = [];
            await saveData();
            render();
            listNameInput.value = '';
        } else if (lists[listName]) {
            showNotification("A list with that name already exists.", 'error');
        }
    });

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            currentFilter = e.target.getAttribute('data-filter');
            render();
        }
    });
    customListsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (target) {
            currentFilter = target.getAttribute('data-filter');
            render();
        }
    });

    showsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = parseInt(target.getAttribute('data-id'));
        if (target.classList.contains('delete-btn')) {
            showConfirmation('Are you sure you want to remove this show?', async () => {
                shows = shows.filter(show => show.id !== id);
                Object.keys(lists).forEach(listName => {
                    lists[listName] = lists[listName].filter(showId => showId !== id);
                });
                await saveData();
                render();
            });
        } else if (target.classList.contains('edit-btn')) {
            openEditModal(id);
        } else if (target.classList.contains('add-to-list-btn')) {
            openAddToListModal(id);
        }
    });

    addToListForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedListInput = document.querySelector('input[name="listSelection"]:checked');
        if (!selectedListInput) {
            closeAddToListModal();
            return showNotification("Please select a list.", 'error');
        }
        const chosenList = selectedListInput.value;
        if (showIdToAdd && lists[chosenList]) {
            if (!lists[chosenList].includes(showIdToAdd)) {
                lists[chosenList].push(showIdToAdd);
                await saveData();
                showNotification(`Show added to "${chosenList}"`, 'success');
            } else {
                showNotification("This show is already in that list.", 'error');
            }
            closeAddToListModal();
        }
    });
    cancelAddToListBtn.addEventListener('click', () => closeAddToListModal());
    editShowForm.addEventListener('submit', handleEditSave);
    cancelEditBtn.addEventListener('click', () => closeEditModal());
    removeImageBtn.addEventListener('click', () => {
        document.getElementById('editImagePreview').classList.add('hidden');
        removeImageBtn.classList.add('hidden');
        document.getElementById('editShowPoster').value = '';
    });
    notificationCloseBtn.addEventListener('click', () => notificationModal.classList.add('hidden'));
    confirmCancelBtn.addEventListener('click', () => confirmationModal.classList.add('hidden'));
    confirmActionBtn.addEventListener('click', () => {
        if (confirmAction) confirmAction();
        confirmationModal.classList.add('hidden');
    });

    // --- HELPER & SECONDARY MODAL FUNCTIONS ---
    function openAddToListModal(id) {
        showIdToAdd = id;
        const listNames = Object.keys(lists);
        modalListContainer.innerHTML = '';
        if (listNames.length === 0) {
            modalListContainer.innerHTML = `<p class="text-center text-gray-600">No lists found. Please create one first.</p>`;
        } else {
            listNames.forEach((name, index) => {
                const isChecked = index === 0 ? 'checked' : '';
                modalListContainer.innerHTML += `<label class="block p-3 rounded-lg hover:bg-beige cursor-pointer border"><input type="radio" name="listSelection" value="${name}" class="mr-3" ${isChecked}>${name}</label>`;
            });
        }
        addToListModal.classList.remove('hidden');
    }
    function closeAddToListModal() { addToListModal.classList.add('hidden'); }

    function openEditModal(id) {
        const show = shows.find(s => s.id === id);
        if (!show) return;
        editingShowId = id;
        document.getElementById('editShowTitle').value = show.title;
        document.getElementById('editShowStatus').value = show.status;
        document.getElementById('editShowRating').value = show.rating || '';
        document.getElementById('editShowGenre').value = show.genre || '';
        document.getElementById('editShowNotes').value = show.notes || '';
        const preview = document.getElementById('editImagePreview');
        if (show.image) {
            preview.src = show.image;
            preview.classList.remove('hidden');
            removeImageBtn.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
            removeImageBtn.classList.add('hidden');
        }
        editModal.classList.remove('hidden');
    }
    function closeEditModal() { editModal.classList.add('hidden'); }

    async function handleEditSave(e) {
        e.preventDefault();
        if (!editingShowId) return;
        const showIndex = shows.findIndex(s => s.id === editingShowId);
        if (showIndex === -1) return;
        const posterFile = document.getElementById('editShowPoster').files[0];
        let imageUrl = shows[showIndex].image;
        if (posterFile) {
            imageUrl = await readFileAsDataURL(posterFile);
        } else if (document.getElementById('editImagePreview').classList.contains('hidden')) {
            imageUrl = null;
        }
        shows[showIndex] = {
            ...shows[showIndex],
            title: document.getElementById('editShowTitle').value.trim(),
            status: document.getElementById('editShowStatus').value,
            rating: parseInt(document.getElementById('editShowRating').value) || null,
            genre: document.getElementById('editShowGenre').value.trim(),
            notes: document.getElementById('editShowNotes').value.trim(),
            image: imageUrl
        };
        await saveData();
        render();
        closeEditModal();
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function getStatusColor(status) {
        const colors = { watching: 'bg-green-100 text-green-800 border-green-200', completed: 'bg-blue-100 text-blue-800 border-blue-200', 'plan-to-watch': 'bg-yellow-100 text-yellow-800 border-yellow-200', dropped: 'bg-red-100 text-red-800 border-red-200' };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    }

    function getStatusText(status) {
        return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}
