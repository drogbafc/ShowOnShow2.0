document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    let shows = [];
    let currentFilter = 'all';
    let editingShowId = null;

    // --- DOM ELEMENTS ---
    const addShowForm = document.getElementById('addShowForm');
    const showsList = document.getElementById('showsList');
    const emptyState = document.getElementById('emptyState');
    const filterContainer = document.getElementById('filter-container');

    // Modal Elements
    const editModal = document.getElementById('editModal');
    const editShowForm = document.getElementById('editShowForm');
    const cancelEditBtn = document.getElementById('cancelEdit');

    // --- DATA PERSISTENCE ---
    function saveShows() {
        localStorage.setItem('myTVShows', JSON.stringify(shows));
    }

    function loadShows() {
        const savedShows = localStorage.getItem('myTVShows');
        shows = savedShows ? JSON.parse(savedShows) : [];
    }

    // --- RENDERING & UI ---
    function renderShows() {
        const filteredShows = currentFilter === 'all' 
            ? shows 
            : shows.filter(show => show.status === currentFilter);

        showsList.innerHTML = ''; // Clear previous list

        if (filteredShows.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filteredShows.forEach(show => {
                const showElement = document.createElement('div');
                showElement.className = "bg-white rounded-lg shadow-lg p-6 border-l-4 border-dark-green hover:shadow-xl transition-shadow duration-200";

                const statusColor = getStatusColor(show.status);
                const statusText = getStatusText(show.status);

                showElement.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold text-dark-green mb-2">${show.title}</h3>
                            <div class="flex flex-wrap gap-2 mb-3">
                                <span class="px-3 py-1 rounded-full text-sm font-medium border ${statusColor}">${statusText}</span>
                                <span class="px-3 py-1 rounded-full text-sm font-medium bg-light-brown text-white">${show.genre || 'N/A'}</span>
                                ${show.rating ? `<span class="px-3 py-1 rounded-full text-sm font-medium bg-dark-green text-white">⭐ ${show.rating}/10</span>` : ''}
                            </div>
                        </div>
                        <div class="flex gap-2 ml-4 flex-shrink-0">
                            <button data-id="${show.id}" class="edit-btn px-3 py-1 bg-medium-green text-white rounded hover:bg-light-green transition-colors duration-200 text-sm">Edit</button>
                            <button data-id="${show.id}" class="delete-btn px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 text-sm">Remove</button>
                        </div>
                    </div>
                    <div class="bg-beige p-4 rounded-lg">
                        <p class="text-medium-brown font-medium mb-1">Notes:</p>
                        <p class="text-dark-brown whitespace-pre-wrap">${show.notes || 'No notes added.'}</p>
                    </div>
                `;
                showsList.appendChild(showElement);
            });
        }
        updateFilterButtons();
    }

    function updateFilterButtons() {
        document.querySelectorAll('#filter-container button').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter === currentFilter) {
                btn.className = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 bg-dark-green text-white';
            } else {
                btn.className = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 bg-light-brown text-white hover:bg-medium-brown';
            }
        });
    }

    // --- CORE LOGIC (Add, Edit, Delete) ---
    function addShow(e) {
        e.preventDefault();
        const titleInput = document.getElementById('showTitle');
        const ratingInput = document.getElementById('showRating');

        // Reset previous validation errors
        titleInput.classList.remove('border-red-500');
        ratingInput.classList.remove('border-red-500');

        const title = titleInput.value.trim();
        const status = document.getElementById('showStatus').value;
        const rating = ratingInput.value;

        // Validation
        if (!title || !status) {
            alert('Please fill in the show title and status.');
            if (!title) titleInput.classList.add('border-red-500');
            return;
        }
        if (rating && (parseInt(rating) < 1 || parseInt(rating) > 10)) {
            alert('Rating must be between 1 and 10.');
            ratingInput.classList.add('border-red-500');
            return;
        }

        const newShow = {
            id: Date.now(),
            title: title,
            status: status,
            rating: rating ? parseInt(rating) : null,
            genre: document.getElementById('showGenre').value.trim(),
            notes: document.getElementById('showNotes').value.trim()
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

    // --- EDIT MODAL LOGIC ---
    function openEditModal(id) {
        const show = shows.find(s => s.id === id);
        if (!show) return;

        editingShowId = id;
        document.getElementById('editShowTitle').value = show.title;
        document.getElementById('editShowStatus').value = show.status;
        document.getElementById('editShowRating').value = show.rating || '';
        document.getElementById('editShowGenre').value = show.genre || '';
        document.getElementById('editShowNotes').value = show.notes || '';

        editModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editingShowId = null;
        editModal.classList.add('hidden');
        editShowForm.reset();
    }

    function handleEditSave(e) {
        e.preventDefault();
        if (!editingShowId) return;

        const showIndex = shows.findIndex(s => s.id === editingShowId);
        if (showIndex === -1) return;

        const rating = document.getElementById('editShowRating').value;
        if (rating && (parseInt(rating) < 1 || parseInt(rating) > 10)) {
            alert('Rating must be between 1 and 10.');
            return;
        }

        shows[showIndex] = {
            ...shows[showIndex],
            title: document.getElementById('editShowTitle').value.trim(),
            status: document.getElementById('editShowStatus').value,
            rating: rating ? parseInt(rating) : null,
            genre: document.getElementById('editShowGenre').value.trim(),
            notes: document.getElementById('editShowNotes').value.trim(),
        };

        saveShows();
        renderShows();
        closeEditModal();
    }

    // --- HELPER FUNCTIONS ---
    function getStatusColor(status) {
        const colors = {
            watching: 'bg-green-100 text-green-800 border-green-200',
            completed: 'bg-blue-100 text-blue-800 border-blue-200',
            'plan-to-watch': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            dropped: 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    }

    function getStatusText(status) {
        return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // --- EVENT LISTENERS ---
    addShowForm.addEventListener('submit', addShow);

    filterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            currentFilter = e.target.getAttribute('data-filter');
            renderShows();
        }
    });

    showsList.addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        if (e.target.classList.contains('delete-btn')) {
            deleteShow(id);
        }
        if (e.target.classList.contains('edit-btn')) {
            openEditModal(id);
        }
    });

    editShowForm.addEventListener('submit', handleEditSave);
    cancelEditBtn.addEventListener('click', closeEditModal);

    // --- INITIALIZATION ---
    loadShows();
    renderShows();
});