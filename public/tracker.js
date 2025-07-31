import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

const checkFirebase = setInterval(() => {
    if (window.firebaseApp && window.firebaseStorage) {
        clearInterval(checkFirebase);
        initializeApp();
    }
}, 100);

function initializeApp() {
    const app = window.firebaseApp;
    const storage = window.firebaseStorage;
    const auth = getAuth(app);
    const db = getFirestore(app);

    let currentUser = null;
    let showsUnsubscribe = null;
    let listsUnsubscribe = null;

    // --- STATE MANAGEMENT ---
    let shows = [];
    let lists = {};
    let currentFilter = 'all';
    let editingShowId = null;
    let showIdToAdd = null;
    let confirmAction = null;

    // --- DOM ELEMENTS ---
    const loadingOverlay = document.getElementById('loadingOverlay');
    const addShowBtn = document.getElementById('addShowBtn');
    const createListBtn = document.getElementById('createListBtn');
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

    // --- INITIAL UI STATE ---
    addShowBtn.disabled = true;
    createListBtn.disabled = true;

    // --- FIREBASE AUTH LISTENER ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            welcomeMessage.textContent = `Welcome, ${user.email}!`;
            if (showsUnsubscribe) showsUnsubscribe();
            if (listsUnsubscribe) listsUnsubscribe();
            attachRealtimeListeners();
        } else {
            window.location.href = 'index.html';
        }
    });

    // --- REAL-TIME DATA LISTENERS ---
    function attachRealtimeListeners() {
        if (!currentUser) return;

        const showsCollectionRef = collection(db, "users", currentUser.uid, "shows");
        showsUnsubscribe = onSnapshot(showsCollectionRef, (snapshot) => {
            shows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            shows.sort((a, b) => b.createdAt - a.createdAt);

            if (!loadingOverlay.classList.contains('hidden')) {
                loadingOverlay.classList.add('hidden');
                addShowBtn.disabled = false;
                createListBtn.disabled = false;
            }
            render();
        }, (error) => {
            console.error("Error listening to shows:", error);
            showNotification("Could not load shows. Please refresh.", "error");
        });

        const listsCollectionRef = collection(db, "users", currentUser.uid, "lists");
        listsUnsubscribe = onSnapshot(listsCollectionRef, (snapshot) => {
            lists = {};
            snapshot.docs.forEach(doc => {
                lists[doc.id] = doc.data().showIds || [];
            });
            render();
        }, (error) => {
            console.error("Error listening to lists:", error);
            showNotification("Could not load lists. Please refresh.", "error");
        });
    }

    // --- IMAGE UPLOAD FUNCTION ---
    async function uploadImage(file) {
        if (!currentUser) return null;
        const filePath = `images/${currentUser.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        try {
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return { url, path: filePath };
        } catch (error) {
            console.error("Image Upload Failed:", error);
            showNotification("Failed to upload image. Check storage rules.", "error");
            return null;
        }
    }

    // --- MAIN RENDER FUNCTION ---
    function render() {
        renderShows();
        renderCustomLists();
        updateFilterButtons();
        initLazyLoading();
    }

    // --- LAZY LOADING ---
    function initLazyLoading() {
        const lazyImages = document.querySelectorAll('img.lazy');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
            lazyImages.forEach(img => observer.observe(img));
        } else {
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }

    // --- UI RENDERING ---
    function renderShows() {
        let filteredShows = [];
        if (['all', 'watching', 'completed', 'plan-to-watch', 'dropped'].includes(currentFilter)) {
            filteredShows = currentFilter === 'all' ? shows : shows.filter(show => show.status === currentFilter);
        } else if (lists[currentFilter]) {
            const showIdsInList = lists[currentFilter];
            filteredShows = shows.filter(show => show && showIdsInList.includes(show.id));
        }
        showsList.innerHTML = '';
        if (filteredShows.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filteredShows.forEach(show => {
                const showElement = document.createElement('div');
                showElement.className = "bg-beige rounded-lg shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-shadow duration-200";
                const posterHTML = show.image 
                    ? `<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-src="${show.image.url}" alt="Poster for ${show.title}" class="lazy w-28 h-40 object-cover rounded shadow-md flex-shrink-0 bg-gray-300">` 
                    : `<div class="w-28 h-40 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs text-center p-2">No Poster</div>`;
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
                    await deleteDoc(doc(db, "users", currentUser.uid, "lists", listName));
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
        if (showsUnsubscribe) showsUnsubscribe();
        if (listsUnsubscribe) listsUnsubscribe();
        signOut(auth).catch((error) => console.error('Sign out error', error));
    });

    addShowForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        addShowBtn.disabled = true;
        addShowBtn.textContent = "Adding...";

        try {
            const title = document.getElementById('showTitle').value.trim();
            const status = document.getElementById('showStatus').value;
            if (!title || !status) {
                showNotification('Please fill in the show title and status.', 'error');
                return;
            }
            if (shows.some(s => s && s.title && s.title.toLowerCase() === title.toLowerCase())) {
                showNotification('A show with this title has already been added.', 'error');
                return;
            }

            const posterFile = document.getElementById('showPoster').files[0];
            let image = null;
            if (posterFile) {
                image = await uploadImage(posterFile);
                if (!image) return; // Stop if upload failed
            }

            const newShow = {
                title, status, image,
                rating: parseInt(document.getElementById('showRating').value) || null,
                genre: document.getElementById('showGenre').value.trim(),
                notes: document.getElementById('showNotes').value.trim(),
                createdAt: Date.now()
            };

            await addDoc(collection(db, "users", currentUser.uid, "shows"), newShow);
            addShowForm.reset();
            showNotification('Show added successfully!', 'success');
        } catch (error) {
            console.error("Error adding show:", error);
            showNotification("Could not add show. Please try again.", "error");
        } finally {
            addShowBtn.disabled = false;
            addShowBtn.textContent = "Add Show to Tracker";
        }
    });

    createListForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const listName = document.getElementById('listName').value.trim();
        if (listName && !lists[listName]) {
            await setDoc(doc(db, "users", currentUser.uid, "lists", listName), { showIds: [] });
            document.getElementById('listName').value = '';
        } else {
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
        const showId = target.dataset.id;

        if (target.classList.contains('delete-btn')) {
            showConfirmation('Are you sure you want to remove this show?', async () => {
                const showToDelete = shows.find(s => s.id === showId);
                if (showToDelete && showToDelete.image && showToDelete.image.path) {
                    await deleteObject(ref(storage, showToDelete.image.path));
                }
                await deleteDoc(doc(db, "users", currentUser.uid, "shows", showId));

                for (const listName in lists) {
                    if (lists[listName].includes(showId)) {
                        const updatedIds = lists[listName].filter(id => id !== showId);
                        await updateDoc(doc(db, "users", currentUser.uid, "lists", listName), { showIds: updatedIds });
                    }
                }
            });
        } else if (target.classList.contains('edit-btn')) {
            openEditModal(showId);
        } else if (target.classList.contains('add-to-list-btn')) {
            openAddToListModal(showId);
        }
    });

    addToListForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedListInput = document.querySelector('input[name="listSelection"]:checked');
        if (!selectedListInput) {
            closeAddToListModal();
            return showNotification("Please select a list.", 'error');
        }
        const listName = selectedListInput.value;
        if (showIdToAdd && lists[listName]) {
            if (!lists[listName].includes(showIdToAdd)) {
                const updatedIds = [...lists[listName], showIdToAdd];
                await updateDoc(doc(db, "users", currentUser.uid, "lists", listName), { showIds: updatedIds });
                showNotification(`Show added to "${listName}"`, 'success');
            } else {
                showNotification("This show is already in that list.", 'error');
            }
            closeAddToListModal();
        }
    });

    async function handleEditSave(e) {
        e.preventDefault();
        if (!editingShowId) return;

        const saveBtn = editShowForm.querySelector('button[type="submit"]');
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {
            const showRef = doc(db, "users", currentUser.uid, "shows", editingShowId);
            const oldShowData = shows.find(s => s.id === editingShowId);

            const posterFile = document.getElementById('editShowPoster').files[0];
            let newImage = oldShowData.image;

            if (posterFile) {
                if (oldShowData.image && oldShowData.image.path) {
                    await deleteObject(ref(storage, oldShowData.image.path));
                }
                newImage = await uploadImage(posterFile);
                if (!newImage) return; // Stop if upload failed
            } else if (document.getElementById('editImagePreview').classList.contains('hidden')) {
                if (oldShowData.image && oldShowData.image.path) {
                    await deleteObject(ref(storage, oldShowData.image.path));
                }
                newImage = null;
            }

            const updatedShowData = {
                title: document.getElementById('editShowTitle').value.trim(),
                status: document.getElementById('editShowStatus').value,
                rating: parseInt(document.getElementById('editShowRating').value) || null,
                genre: document.getElementById('editShowGenre').value.trim(),
                notes: document.getElementById('editShowNotes').value.trim(),
                image: newImage 
            };

            await updateDoc(showRef, updatedShowData);
            closeEditModal();
        } catch (error) {
            console.error("Error saving changes:", error);
            showNotification("Could not save changes. Please try again.", "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
        }
    }

    editShowForm.addEventListener('submit', handleEditSave);
    cancelAddToListBtn.addEventListener('click', () => closeAddToListModal());
    cancelEditBtn.addEventListener('click', () => closeEditModal());
    removeImageBtn.addEventListener('click', () => {
        document.getElementById('editImagePreview').src = '';
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
        if (show.image && show.image.url) {
            preview.src = show.image.url;
            preview.classList.remove('hidden');
            removeImageBtn.classList.remove('hidden');
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            removeImageBtn.classList.add('hidden');
        }
        editModal.classList.remove('hidden');
    }
    function closeEditModal() { editModal.classList.add('hidden'); }

    function getStatusColor(status) {
        const colors = { watching: 'bg-green-100 text-green-800 border-green-200', completed: 'bg-blue-100 text-blue-800 border-blue-200', 'plan-to-watch': 'bg-yellow-100 text-yellow-800 border-yellow-200', dropped: 'bg-red-100 text-red-800 border-red-200' };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    }

    function getStatusText(status) {
        return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}
