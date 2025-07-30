document.addEventListener('DOMContentLoaded', () => {

    // --- USER AUTHENTICATION & GATEKEEPER ---
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        // If no user is signed in, redirect to the login page
        window.location.href = 'index.html';
        return; // Stop executing the rest of the script
    }
    // Create a unique storage key for this user's data
    const storageKey = `myTVShows_${currentUser}`;

    // --- STATE MANAGEMENT ---
    let shows = [];
    let currentFilter = 'all';
    let editingShowId = null;

    // --- DOM ELEMENTS ---
    const welcomeMessage = document.getElementById('welcomeMessage');
    const signOutBtn = document.getElementById('signOutBtn');
    const addShowForm = document.getElementById('addShowForm');
    const showsList = document.getElementById('showsList');
    const emptyState = document.getElementById('emptyState');
    const filterContainer = document.getElementById('filter-container');
    const editModal = document.getElementById('editModal');
    const editShowForm = document.getElementById('editShowForm');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const removeImageBtn = document.getElementById('removeImageBtn');

    // --- DATA PERSISTENCE (Now User-Specific) ---
    function saveShows() {
        localStorage.setItem(storageKey, JSON.stringify(shows));
    }

    function loadShows() {
        const savedShows = localStorage.getItem(storageKey);
        shows = savedShows ? JSON.parse(savedShows) : [];
    }

    // --- EVENT LISTENERS ---
    signOutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // The rest of your functions (renderShows, addShow, etc.) and event listeners remain the same
    // as the last version I provided you. Just copy them here.

    // --- RENDERING & UI ---
    function renderShows() {
        const filteredShows = currentFilter === 'all' 
            ? shows 
            : shows.filter(show => show.status === currentFilter);

        showsList.innerHTML = '';

        if (filteredShows.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filteredShows.forEach(show => {
                const showElement = document.createElement('div');
                showElement.className = "bg-white rounded-lg shadow-lg p-6 border-l-4 border-dark-green hover:shadow-xl transition-shadow duration-200";

                const statusColor = getStatusColor(show.status);
                const statusText = getStatusText(show.status);

                const posterHTML = show.image 
                    ? `<img src="${show.image}" alt="Poster for ${show.title}" class="w-28 h-40 object-cover rounded shadow-md flex-shrink-0">`
                    : `<div class="w-28 h-40 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs text-center p-2">No Poster</div>`;

                showElement.innerHTML = `
                    <div class="flex gap-5 items-start">
                        ${posterHTML}
                        <div class="flex-1">
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-xl font-bold text-dark-green mb-2 pr-2">${show.title}</h3>
                                <div class="flex gap-2 ml-4 flex-shrink-0">
                                    <button data-id="${show.id}" class="edit-btn px-3 py-1 bg-medium-green text-white rounded hover:bg-light-green transition-colors duration-200 text-sm">Edit</button>
                                    <button data-id="${show.id}" class="delete-btn px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 text-sm">Remove</button>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2 mb-3">
                                <span class="px-3 py-1 rounded-full text-sm font-medium border ${statusColor}">${statusText}</span>
                                <span class="px-3 py-1 rounded-full text-sm font-medium bg-light-brown text-white">${show.genre || 'N/A'}</span>
                                ${show.rating ? `<span class="px-3 py-1 rounded-full text-sm font-medium bg-dark-green text-white">⭐ ${show.rating}/10</span>` : ''}
                            </div>
                            <div class="bg-beige p-3 rounded-lg mt-4">
                                <p class="text-medium-brown font-medium mb-1 text-sm">Notes:</p>
                                <p class="text-dark-brown whitespace-pre-wrap text-sm">${show.notes || 'No notes added.'}</p>
                            </div>
                        </div>
                    </div>
                `;
                showsList.appendChild(showElement);
            });
        }
        updateFilterButtons();
    }

    function updateFilterButtons() {
        document.querySelectorAll('#filter-container button').forEach(btn => {
            btn.className = btn.getAttribute('data-filter') === currentFilter
                ? 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 bg-dark-green text-white'
                : 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 bg-light-brown text-white hover:bg-medium-brown';
        });
    }

    async function addShow(e) {
        e.preventDefault();
        const title = document.getElementById('showTitle').value.trim();
        const status = document.getElementById('showStatus').value;
        if (!title || !status) {
            alert('Please fill in the show title and status.');
            return;
        }

        const posterFile = document.getElementById('showPoster').files[0];
        let imageUrl = null;
        if (posterFile) {
            imageUrl = await readFileAsDataURL(posterFile);
        }

        const newShow = {
            id: Date.now(),
            title: title,
            status: status,
            rating: parseInt(document.getElementById('showRating').value) || null,
            genre: document.getElementById('showGenre').value.trim(),
            notes: document.getElementById('showNotes').value.trim(),
            image: imageUrl
        };

        shows.unshift(newShow);
        saveShows();
        renderShows();
        addShowForm.reset();
    }

    function deleteShow(id) {
        if (confirm('Are you sure you want to remove this show?')) {
            shows = shows.filter(show => show.id !== id);
            saveShows();
            renderShows();
        }
    }

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

    function closeEditModal() {
        editingShowId = null;
        editModal.classList.add('hidden');
        editShowForm.reset();
    }

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

        saveShows();
        renderShows();
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

    addShowForm.addEventListener('submit', addShow);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            currentFilter = e.target.getAttribute('data-filter');
            renderShows();
        }
    });

    showsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const id = parseInt(target.getAttribute('data-id'));
        if (target.classList.contains('delete-btn')) deleteShow(id);
        if (target.classList.contains('edit-btn')) openEditModal(id);
    });

    editShowForm.addEventListener('submit', handleEditSave);
    cancelEditBtn.addEventListener('click', closeEditModal);
    removeImageBtn.addEventListener('click', () => {
        document.getElementById('editImagePreview').classList.add('hidden');
        removeImageBtn.classList.add('hidden');
        document.getElementById('editShowPoster').value = '';
    });

    // --- INITIALIZATION ---
    welcomeMessage.textContent = `Welcome, ${currentUser}!`;
    loadShows();
    renderShows();
});