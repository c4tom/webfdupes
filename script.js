// Dark mode detection and toggling
function updateDarkMode() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
        document.getElementById('dark-mode-toggle').checked = true;
    }
}

updateDarkMode();

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark');
        document.getElementById('dark-mode-toggle').checked = true;
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('dark-mode-toggle').checked = false;
    }
});

// Global variables
let photoGroups = [];
let markedPhotos = new Set();
let totalDuplicates = 0;
let selectedPhotoElement = null;
let viewMode = 'list';
let currentScanId = null;
let statusCheckInterval = null;
let currentDirectoryPath = '/';
let breadcrumbPaths = []; // Para navegação em migalhas

// Variáveis globais para paginação
let currentPage = 1;
let itemsPerPage = 25;

// DOM Elements
const photoGroupsContainer = document.getElementById('photo-groups-container');
const photoGroupsElement = document.getElementById('photo-groups');
const emptyState = document.getElementById('empty-state');
const loadingState = document.getElementById('loading-state');
const startScanBtn = document.getElementById('start-scan-btn');
const selectFolderBtn = document.getElementById('select-folder-btn');
const deleteMarkedBtn = document.getElementById('delete-marked-btn');
const unmarkAllBtn = document.getElementById('unmark-all-btn');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const settingsBtn = document.getElementById('settings-btn');
const helpBtn = document.getElementById('help-btn');
const settingsModal = document.getElementById('settings-modal');
const helpModal = document.getElementById('help-modal');
const confirmModal = document.getElementById('confirm-modal');
const previewPanel = document.getElementById('preview-panel');
const previewImage = document.getElementById('preview-image');
const metadataContainer = document.getElementById('metadata-container');
const duplicateCountElement = document.getElementById('duplicate-count');
const spaceSavedElement = document.getElementById('space-saved');
const totalStatsElement = document.getElementById('total-stats');
const markedCountElement = document.getElementById('marked-count');
const markedFilesCountElement = document.getElementById('marked-files-count');
const searchInput = document.getElementById('search-input');
const messageBox = document.getElementById('message-box');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// Folder Browser Elements
const folderBrowserModal = document.getElementById('folder-browser-modal');
const closeFolderBrowser = document.getElementById('close-folder-browser');
const cancelFolderSelect = document.getElementById('cancel-folder-select');
const selectFolderConfirm = document.getElementById('select-folder-confirm');
const currentPathElement = document.getElementById('current-path');
const directoryContent = document.getElementById('directory-content');
const directoryLoader = document.getElementById('directory-loader');
const breadcrumbContainer = document.getElementById('breadcrumb-container');

// Modals
const closeSettings = document.getElementById('close-settings');
const closeHelp = document.getElementById('close-help');
const settingsCancel = document.getElementById('settings-cancel');
const settingsSave = document.getElementById('settings-save');
const helpCloseBtn = document.getElementById('help-close-btn');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Event listeners
startScanBtn.addEventListener('click', startScan);
selectFolderBtn.addEventListener('click', startScan);
deleteMarkedBtn.addEventListener('click', showDeleteConfirmation);
unmarkAllBtn.addEventListener('click', unmarkAll);
gridViewBtn.addEventListener('click', () => changeViewMode('grid'));
listViewBtn.addEventListener('click', () => changeViewMode('list'));
settingsBtn.addEventListener('click', showSettings);
helpBtn.addEventListener('click', showHelp);
closeSettings.addEventListener('click', closeSettingsModal);
closeHelp.addEventListener('click', closeHelpModal);
settingsSave.addEventListener('click', saveSettings);
settingsCancel.addEventListener('click', closeSettingsModal);
helpCloseBtn.addEventListener('click', closeHelpModal);
darkModeToggle.addEventListener('change', toggleDarkMode);
confirmDelete.addEventListener('click', deleteMarkedPhotos);
cancelDelete.addEventListener('click', closeConfirmModal);
searchInput.addEventListener('input', filterPhotoGroups);

// Folder Browser Event Listeners
closeFolderBrowser.addEventListener('click', hideFolderBrowser);
cancelFolderSelect.addEventListener('click', hideFolderBrowser);
selectFolderConfirm.addEventListener('click', confirmFolderSelection);

// Folder Browser Functions
function showFolderBrowser() {
    // Show the modal
    folderBrowserModal.classList.remove('hidden');

    // Load initial directories
    loadDirectoryContents('/');

    // Reset breadcrumbs
    breadcrumbPaths = [];
    updateBreadcrumbs();
}

function hideFolderBrowser() {
    folderBrowserModal.classList.add('hidden');
}

function loadDirectoryContents(path) {
    // Show loading indicator
    directoryLoader.classList.remove('hidden');
    directoryContent.querySelector('.directory-items').innerHTML = '';

    // Make request to list directories
    fetch(`duplicate-finder-backend.php?action=listDirectories&path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            // Hide loading indicator
            directoryLoader.classList.add('hidden');

            if (data.success) {
                // Update current path
                currentDirectoryPath = data.currentPath;
                currentPathElement.textContent = currentDirectoryPath;

                // Update breadcrumbs (if not navigating with breadcrumbs)
                if (path !== '/' && !breadcrumbPaths.includes(path)) {
                    updateBreadcrumbsOnDirectoryChange(path);
                }

                const itemsContainer = directoryContent.querySelector('.directory-items');

                // Clear existing content
                itemsContainer.innerHTML = '';

                // Add items
                data.items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'directory-item py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex items-center';

                    const iconClass = item.type === 'dir' ? 'fas fa-folder text-yellow-500' :
                        (item.extension === 'jpg' || item.extension === 'jpeg' || item.extension === 'png') ? 'fas fa-file-image text-blue-400' :
                            'fas fa-file text-gray-400';

                    itemElement.innerHTML = `
                        <i class="${iconClass} mr-3"></i>
                        <span class="flex-grow truncate">${item.name}</span>
                        ${item.type === 'file' ? `<span class="text-xs text-gray-500">${formatSize(item.size)}</span>` : ''}
                    `;

                    // Add click event
                    if (item.type === 'dir') {
                        itemElement.addEventListener('click', () => loadDirectoryContents(item.path));
                    }

                    itemsContainer.appendChild(itemElement);
                });
            } else {
                // Show error
                showMessage('Erro ao listar diretório: ' + data.error, 'error');
                directoryContent.querySelector('.directory-items').innerHTML = `
                    <div class="py-4 text-center text-red-500">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        Erro ao carregar o diretório
                    </div>
                `;
            }
        })
        .catch(error => {
            directoryLoader.classList.add('hidden');
            directoryContent.querySelector('.directory-items').innerHTML = `
                <div class="py-4 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Erro de conexão ao servidor
                </div>
            `;
            console.error('Erro ao listar diretório:', error);
        });
}

function updateBreadcrumbsOnDirectoryChange(path) {
    // Split path into components
    const pathParts = path.split('/').filter(part => part !== '');

    // Reset breadcrumbs
    breadcrumbPaths = [];

    // Build breadcrumb paths
    let currentPath = '/';
    breadcrumbPaths.push(currentPath);

    for (let i = 0; i < pathParts.length; i++) {
        currentPath += pathParts[i] + '/';
        breadcrumbPaths.push(currentPath);
    }

    // Update breadcrumb UI
    updateBreadcrumbs();
}

function updateBreadcrumbs() {
    // Clear existing breadcrumbs except home
    while (breadcrumbContainer.children.length > 2) {
        breadcrumbContainer.removeChild(breadcrumbContainer.lastChild);
    }

    // Add new breadcrumbs
    for (let i = 1; i < breadcrumbPaths.length; i++) {
        const path = breadcrumbPaths[i];
        const name = path.split('/').filter(part => part !== '').pop() || '/';

        // Add separator
        const separator = document.createElement('span');
        separator.className = 'mx-1';
        separator.textContent = '/';
        breadcrumbContainer.appendChild(separator);

        // Add breadcrumb item
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.textContent = name;
        item.dataset.path = path;
        item.addEventListener('click', () => loadDirectoryContents(path));
        breadcrumbContainer.appendChild(item);
    }
}

function confirmFolderSelection() {
    // Hide the modal
    hideFolderBrowser();

    // Show loading state
    emptyState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    photoGroupsElement.classList.add('hidden');
    progressContainer.classList.add('hidden');

    document.getElementById('loading-text').textContent = 'Iniciando busca por duplicatas...';

    // Start scan with selected path
    fetch('duplicate-finder-backend.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'startScan',
            directory: currentDirectoryPath
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Store scan ID
                currentScanId = data.scanId;

                // Start periodic status checks
                statusCheckInterval = setInterval(checkScanStatus, 1000);

                // Update UI to show scan started
                document.getElementById('loading-text').innerHTML = 'Escaneando diretório...<br><small>Atualizações aparecerão aqui</small>';

                // Add element to show real-time updates
                if (!document.getElementById('status-updates')) {
                    const statusUpdates = document.createElement('div');
                    statusUpdates.id = 'status-updates';
                    statusUpdates.className = 'mt-4 p-3 text-left bg-gray-100 dark:bg-gray-700 rounded max-h-40 overflow-y-auto text-xs font-mono';
                    document.getElementById('loading-state').appendChild(statusUpdates);
                }

                // Show progress bar
                progressContainer.classList.remove('hidden');

                showMessage(data.message, 'info');
            } else {
                showMessage('Erro ao iniciar escaneamento: ' + data.error, 'error');
                loadingState.classList.add('hidden');
                emptyState.classList.remove('hidden');
            }
        })
        .catch(error => {
            showMessage('Erro na conexão com o servidor: ' + error, 'error');
            loadingState.classList.add('hidden');
            emptyState.classList.remove('hidden');

            // For demo, use mock data with a simulated delay
            simulateFdupesProgress();
        });
}

// Check scan status function
function checkScanStatus() {
    if (!currentScanId) return;

    fetch(`duplicate-finder-backend.php?action=checkStatus&scanId=${currentScanId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update status display
                updateStatusDisplay(data.status);

                // Update progress (simulate progress based on status lines)
                updateProgressBar(data.status);

                // Check if scan is complete
                if (data.isComplete) {
                    clearInterval(statusCheckInterval);

                    if (data.results && data.results.groups && data.results.groups.length > 0) {
                        // Process results
                        photoGroups = data.results.groups;
                        totalDuplicates = data.results.totalDuplicates;

                        // Update UI
                        loadingState.classList.add('hidden');
                        photoGroupsElement.classList.remove('hidden');
                        updatePhotoGroupsDisplay();
                        updateStats();

                        showMessage(`Escaneamento completo: Encontradas ${totalDuplicates} fotos duplicadas em ${photoGroups.length} grupos`, 'success');
                    } else {
                        // No duplicates found
                        loadingState.classList.add('hidden');
                        emptyState.classList.remove('hidden');
                        document.querySelector('#empty-state p').textContent = 'Nenhuma foto duplicada encontrada';

                        showMessage('Escaneamento completo: Nenhuma foto duplicada encontrada', 'info');
                    }
                }
            } else {
                showMessage('Erro ao verificar status: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('Erro ao verificar status:', error);
        });
}

function updateStatusDisplay(statusLines) {
    const statusContainer = document.getElementById('status-updates');
    if (!statusContainer) return;

    // Clear existing content
    statusContainer.innerHTML = '';

    // Add each status line
    statusLines.forEach(line => {
        const lineElement = document.createElement('div');
        lineElement.className = 'mb-1';
        lineElement.textContent = line;
        statusContainer.appendChild(lineElement);
    });

    // Scroll to the end to show most recent updates
    statusContainer.scrollTop = statusContainer.scrollHeight;
}

function updateProgressBar(statusLines) {
    // Try to estimate progress based on status lines
    let progress = 0;

    if (statusLines.length > 0) {
        const lastLine = statusLines[statusLines.length - 1];

        if (lastLine.includes('Escaneamento completo')) {
            progress = 100;
        } else if (lastLine.includes('comparando conteúdo')) {
            progress = 75;
        } else if (lastLine.includes('comparando hashes')) {
            progress = 50;
        } else if (lastLine.includes('comparando tamanhos')) {
            progress = 25;
        } else {
            // Estimate progress based on lines processed
            progress = Math.min(90, Math.max(5, statusLines.length * 3));
        }
    }

    // Update progress bar
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;
}

// Main Functions
function startScan() {
    // Show folder browser instead of using native file input
    showFolderBrowser();
}

function updatePhotoGroupsDisplay() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedGroups = photoGroups.slice(startIndex, endIndex);

    // Limpar a lista atual
    const photoGroupsList = document.getElementById('photo-groups');
    photoGroupsList.innerHTML = '';

    // Adicionar os grupos de fotos paginados
    paginatedGroups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'photo-group p-4 rounded';

        // Group header
        const groupHeader = document.createElement('div');
        groupHeader.className = 'flex justify-between items-center mb-3';
        groupHeader.innerHTML = `
            <h3 class="font-medium">Grupo ${group.id} | ${group.photos.length} Fotos</h3>
            <div class="text-sm">
                <button class="mark-all-btn text-blue-500 hover:underline" data-group="${group.id}">
                    Marcar Todas
                </button>
            </div>
        `;
        groupElement.appendChild(groupHeader);

        // Photos container
        const photosContainer = document.createElement('div');
        photosContainer.className = viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2';

        group.photos.forEach(photo => {
            const photoElement = document.createElement('div');

            if (viewMode === 'grid') {
                photoElement.className = 'photo-item rounded overflow-hidden cursor-pointer transition shadow-sm hover:shadow-md';
                photoElement.innerHTML = `
                    <div class="relative">
                        <img src="${photo.thumbnail}" alt="${photo.name}" class="w-full h-32 object-cover">
                        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-1 text-xs">
                            ${photo.name}
                        </div>
                        <div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-white bg-opacity-80 check-icon hidden flex items-center justify-center">
                            <i class="fas fa-check text-green-500 text-xs"></i>
                        </div>
                    </div>
                    <div class="p-2 text-xs dark:bg-gray-700">
                        <div>${formatDate(photo.created)}</div>
                        <div>${formatSize(photo.size)}</div>
                    </div>
                `;
            } else {
                photoElement.className = 'photo-item flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition';
                photoElement.innerHTML = `
                    <div class="w-16 h-16 flex-shrink-0 mr-3">
                        <img src="${photo.thumbnail}" alt="${photo.name}" class="w-full h-full object-cover rounded">
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="text-sm font-medium truncate">${photo.name}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            ${formatDate(photo.created)} • ${formatSize(photo.size)}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                            ${photo.path}
                        </div>
                    </div>
                    <div class="ml-2 w-5 h-5 rounded-full bg-white bg-opacity-80 check-icon hidden flex-shrink-0 flex items-center justify-center">
                        <i class="fas fa-check text-green-500 text-xs"></i>
                    </div>
                `;
            }

            photoElement.dataset.id = photo.id;
            photoElement.dataset.groupId = group.id;

            // Add event listeners
            photoElement.addEventListener('click', () => toggleMarkPhoto(photoElement, photo));

            photosContainer.appendChild(photoElement);
        });

        groupElement.appendChild(photosContainer);
        photoGroupsList.appendChild(groupElement);
    });

    // Add event listeners to "Mark All" buttons
    document.querySelectorAll('.mark-all-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const groupId = parseInt(e.target.dataset.group);
            markAllInGroup(groupId);
        });
    });

    // Atualizar os controles de paginação
    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(photoGroups.length / itemsPerPage);
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.querySelector('#page-info').textContent = `Página ${currentPage} de ${totalPages}`;
    
    // Habilitar/Desabilitar botões
    paginationControls.querySelector('#prev-page').disabled = currentPage === 1;
    paginationControls.querySelector('#next-page').disabled = currentPage === totalPages;

    // Adicionar event listeners para os controles de paginação
    paginationControls.querySelector('#items-per-page').addEventListener('change', function() {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // Resetar para a primeira página
        updatePhotoGroupsDisplay();
    });

    paginationControls.querySelector('#prev-page').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            updatePhotoGroupsDisplay();
        }
    });

    paginationControls.querySelector('#next-page').addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            updatePhotoGroupsDisplay();
        }
    });
}

function toggleMarkPhoto(element, photo) {
    // Toggle marked state
    if (markedPhotos.has(photo.id)) {
        markedPhotos.delete(photo.id);
        element.classList.remove('marked');
        const checkIcon = element.querySelector('.check-icon');
        if (checkIcon) checkIcon.classList.add('hidden');
    } else {
        markedPhotos.add(photo.id);
        element.classList.add('marked');
        const checkIcon = element.querySelector('.check-icon');
        if (checkIcon) checkIcon.classList.remove('hidden');
    }

    // Update selected photo in preview
    if (selectedPhotoElement) {
        selectedPhotoElement.classList.remove('ring-2', 'ring-blue-500');
    }
    element.classList.add('ring-2', 'ring-blue-500');
    selectedPhotoElement = element;

    // Update preview panel
    updatePreview(photo);

    // Update stats
    updateStats();
}

function updatePreview(photo) {
    if (!photo) return;

    // Show preview panel on mobile if it's hidden
    previewPanel.classList.remove('hidden');

    // Update image
    previewImage.src = photo.url;

    // Update metadata
    metadataContainer.innerHTML = `
        <tr><td class="py-1 px-2 font-medium">Nome do Arquivo:</td><td class="py-1 px-2">${photo.name}</td></tr>
        <tr><td class="py-1 px-2 font-medium">Tamanho:</td><td class="py-1 px-2">${formatSize(photo.size)}</td></tr>
        <tr><td class="py-1 px-2 font-medium">Dimensões:</td><td class="py-1 px-2">${photo.width} × ${photo.height}</td></tr>
        <tr><td class="py-1 px-2 font-medium">Criado em:</td><td class="py-1 px-2">${formatDate(photo.created, true)}</td></tr>
        <tr><td class="py-1 px-2 font-medium">Modificado em:</td><td class="py-1 px-2">${formatDate(photo.modified, true)}</td></tr>
        <tr><td class="py-1 px-2 font-medium">Caminho:</td><td class="py-1 px-2 text-xs break-all">${photo.path}</td></tr>
    `;

    // Add camera info if available
    if (photo.cameraMake || photo.cameraModel) {
        const cameraInfo = [photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ');
        metadataContainer.innerHTML += `
            <tr><td class="py-1 px-2 font-medium">Câmera:</td><td class="py-1 px-2">${cameraInfo}</td></tr>
        `;
    }

    // Add date taken if available
    if (photo.dateTaken) {
        metadataContainer.innerHTML += `
            <tr><td class="py-1 px-2 font-medium">Data da foto:</td><td class="py-1 px-2">${photo.dateTaken}</td></tr>
        `;
    }
}

function markAllInGroup(groupId) {
    const group = photoGroups.find(g => g.id === groupId);
    if (!group) return;

    // Mark all photos in group except the first one (assuming it's the original)
    const photosToMark = group.photos.slice(1);

    photosToMark.forEach(photo => {
        markedPhotos.add(photo.id);

        // Update UI
        const photoElement = document.querySelector(`.photo-item[data-id="${photo.id}"]`);
        if (photoElement) {
            photoElement.classList.add('marked');
            const checkIcon = photoElement.querySelector('.check-icon');
            if (checkIcon) checkIcon.classList.remove('hidden');
        }
    });

    // Update stats
    updateStats();

    // Show message
    showMessage(`${photosToMark.length} fotos marcadas no Grupo ${groupId}`, 'success');
}

function unmarkAll() {
    // Clear marked photos
    markedPhotos.clear();

    // Update UI
    document.querySelectorAll('.photo-item').forEach(item => {
        item.classList.remove('marked');
        const checkIcon = item.querySelector('.check-icon');
        if (checkIcon) checkIcon.classList.add('hidden');
    });

    // Update stats
    updateStats();

    // Show message
    showMessage('Todas as fotos desmarcadas', 'success');
}

function updateStats() {
    // Calculate space saved
    let spaceSaved = 0;
    let markedItems = [];

    photoGroups.forEach(group => {
        group.photos.forEach(photo => {
            if (markedPhotos.has(photo.id) && photo.size) {
                spaceSaved += photo.size;
                markedItems.push(photo);
            }
        });
    });

    // Update UI elements
    duplicateCountElement.textContent = totalDuplicates;
    spaceSavedElement.textContent = formatSize(spaceSaved);
    totalStatsElement.textContent = `${totalDuplicates} fotos duplicadas em ${photoGroups.length} grupos`;
    markedCountElement.textContent = `${markedPhotos.size} Marcadas`;

    // Enable/disable delete button
    deleteMarkedBtn.disabled = markedPhotos.size === 0;
}

function changeViewMode(mode) {
    viewMode = mode;

    // Update UI
    if (mode === 'grid') {
        gridViewBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
        gridViewBtn.classList.add('bg-blue-500', 'text-white');
        listViewBtn.classList.remove('bg-blue-500', 'text-white');
        listViewBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
    } else {
        listViewBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
        listViewBtn.classList.add('bg-blue-500', 'text-white');
        gridViewBtn.classList.remove('bg-blue-500', 'text-white');
        gridViewBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
    }

    // Re-render photo groups
    updatePhotoGroupsDisplay();
}

function showDeleteConfirmation() {
    if (markedPhotos.size === 0) return;

    markedFilesCountElement.textContent = markedPhotos.size;
    confirmModal.classList.remove('hidden');
}

function deleteMarkedPhotos() {
    // Get marked photos
    const photosToDelete = [];

    photoGroups.forEach(group => {
        group.photos.forEach(photo => {
            if (markedPhotos.has(photo.id)) {
                console.log("photo=", photo);
                photosToDelete.push(photo);
            }
        });
    });
    console.log("photosToDelete=", photosToDelete);

    // Close modal
    closeConfirmModal();

    // Show loading message
    showMessage('Movendo arquivos para a lixeira...', 'info');

    // Make AJAX request to move files to trash
    fetch('duplicate-finder-backend.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'moveToTrash',
            files: JSON.stringify(photosToDelete)
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Remove marked photos from groups
                photoGroups = photoGroups.map(group => {
                    return {
                        ...group,
                        photos: group.photos.filter(photo => !markedPhotos.has(photo.id))
                    };
                }).filter(group => group.photos.length > 1);

                // Clear marked photos
                markedPhotos.clear();

                // Update total duplicates
                totalDuplicates = photoGroups.reduce((total, group) => total + group.photos.length, 0);

                // Re-render UI
                updatePhotoGroupsDisplay();
                updateStats();

                // Show success message
                showMessage(data.message, 'success');
            } else {
                showMessage(`Erro: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            // For demo, simulate success response with a timeout
            setTimeout(() => {
                // Remove marked photos from groups
                photoGroups = photoGroups.map(group => {
                    return {
                        ...group,
                        photos: group.photos.filter(photo => !markedPhotos.has(photo.id))
                    };
                }).filter(group => group.photos.length > 1);

                // Clear marked photos
                markedPhotos.clear();

                // Update total duplicates
                totalDuplicates = photoGroups.reduce((total, group) => total + group.photos.length, 0);

                // Re-render UI
                updatePhotoGroupsDisplay();
                updateStats();

                // Show success message
                showMessage(`${photosToDelete.length} arquivos movidos para a lixeira`, 'success');
            }, 1500);

            console.error('Erro ao excluir arquivos:', error);
        });
}

function showSettings() {
    settingsModal.classList.remove('hidden');
}

function saveSettings() {
    // Close modal
    closeSettingsModal();

    // Show success message
    showMessage('Configurações salvas', 'success');
}

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}

function showHelp() {
    helpModal.classList.remove('hidden');
}

function closeHelpModal() {
    helpModal.classList.add('hidden');
}

function closeConfirmModal() {
    confirmModal.classList.add('hidden');
}

function toggleDarkMode() {
    console.log('Toggled dark mode:', darkModeToggle.checked);
    if (darkModeToggle.checked) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function filterPhotoGroups() {
    const searchTerm = searchInput.value.toLowerCase();

    if (!searchTerm) {
        // Show all groups
        document.querySelectorAll('.photo-group').forEach(group => {
            group.classList.remove('hidden');
        });
        return;
    }

    // Filter groups
    document.querySelectorAll('.photo-group').forEach((groupElement, index) => {
        const group = photoGroups[index];

        // Check if any photo in the group matches the search term
        const hasMatch = group.photos.some(photo =>
            photo.name.toLowerCase().includes(searchTerm) ||
            photo.path.toLowerCase().includes(searchTerm)
        );

        if (hasMatch) {
            groupElement.classList.remove('hidden');
        } else {
            groupElement.classList.add('hidden');
        }
    });
}

function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.classList.add('show');

    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 3000);
}

// Simulation functions for demo (when not connected to backend)
// These functions simulate the behavior when the backend is not available
let simulationStep = 0;
const maxSimulationSteps = 20;

function simulateFdupesProgress() {
    // Mock data for demo
    const mockPhotoGroups = [
        {
            id: 1,
            photos: [
                {
                    id: 1,
                    name: '2023_0609_0001_img.jpg',
                    path: '/Users/Admin/Fotos/2023_0609_0001_img.jpg',
                    size: 32.8 * 1024 * 1024,
                    created: '2023-01-05T14:09:23',
                    modified: '2023-01-05T14:09:23',
                    width: 6617,
                    height: 4419,
                    thumbnail: 'https://picsum.photos/id/237/300/200',
                    url: 'https://picsum.photos/id/237/800/600'
                },
                {
                    id: 2,
                    name: '2023_0609_0001_img_copia.jpg',
                    path: '/Users/Admin/Fotos/2023_0609_0001_img_copia.jpg',
                    size: 32.8 * 1024 * 1024,
                    created: '2023-01-05T14:09:24',
                    modified: '2023-01-05T14:09:24',
                    width: 6617,
                    height: 4419,
                    thumbnail: 'https://picsum.photos/id/237/300/200',
                    url: 'https://picsum.photos/id/237/800/600'
                }
            ]
        },
        {
            id: 2,
            photos: [
                {
                    id: 3,
                    name: 'ferias_praia.jpg',
                    path: '/Users/Admin/Fotos/ferias_praia.jpg',
                    size: 25.2 * 1024 * 1024,
                    created: '2023-02-15T10:30:12',
                    modified: '2023-02-15T10:30:12',
                    width: 5472,
                    height: 3648,
                    thumbnail: 'https://picsum.photos/id/1001/300/200',
                    url: 'https://picsum.photos/id/1001/800/600'
                },
                {
                    id: 4,
                    name: 'ferias_praia_editada.jpg',
                    path: '/Users/Admin/Fotos/ferias_praia_editada.jpg',
                    size: 26.1 * 1024 * 1024,
                    created: '2023-02-15T11:15:36',
                    modified: '2023-02-15T11:15:36',
                    width: 5472,
                    height: 3648,
                    thumbnail: 'https://picsum.photos/id/1001/300/200',
                    url: 'https://picsum.photos/id/1001/800/600'
                }
            ]
        },
        {
            id: 3,
            photos: [
                {
                    id: 5,
                    name: 'foto_familia.jpg',
                    path: '/Users/Admin/Fotos/foto_familia.jpg',
                    size: 18.5 * 1024 * 1024,
                    created: '2023-03-20T16:45:30',
                    modified: '2023-03-20T16:45:30',
                    width: 4256,
                    height: 2832,
                    thumbnail: 'https://picsum.photos/id/1025/300/200',
                    url: 'https://picsum.photos/id/1025/800/600'
                },
                {
                    id: 6,
                    name: 'foto_familia_copia.jpg',
                    path: '/Users/Admin/Fotos/foto_familia_copia.jpg',
                    size: 18.5 * 1024 * 1024,
                    created: '2023-03-20T16:45:32',
                    modified: '2023-03-20T16:45:32',
                    width: 4256,
                    height: 2832,
                    thumbnail: 'https://picsum.photos/id/1025/300/200',
                    url: 'https://picsum.photos/id/1025/800/600'
                },
                {
                    id: 7,
                    name: 'foto_familia_editada.jpg',
                    path: '/Users/Admin/Fotos/foto_familia_editada.jpg',
                    size: 19.1 * 1024 * 1024,
                    created: '2023-03-20T17:10:15',
                    modified: '2023-03-20T17:10:15',
                    width: 4256,
                    height: 2832,
                    thumbnail: 'https://picsum.photos/id/1025/300/200',
                    url: 'https://picsum.photos/id/1025/800/600'
                }
            ]
        }
    ];

    // Reset for demo environment
    photoGroups = [...mockPhotoGroups];
    totalDuplicates = photoGroups.reduce((total, group) => total + group.photos.length, 0);
    simulationStep = 0;

    // Create status container if it doesn't exist
    if (!document.getElementById('status-updates')) {
        const statusUpdates = document.createElement('div');
        statusUpdates.id = 'status-updates';
        statusUpdates.className = 'mt-4 p-3 text-left bg-gray-100 dark:bg-gray-700 rounded max-h-40 overflow-y-auto text-xs font-mono';
        document.getElementById('loading-state').appendChild(statusUpdates);
    }

    // Show progress bar
    progressContainer.classList.remove('hidden');

    // Start progress simulation
    simulateStatusUpdates();
    document.getElementById('loading-text').innerHTML = 'Escaneando diretório...<br><small>Atualizações aparecerão aqui</small>';

    // Set interval to update status every second
    const simulationInterval = setInterval(() => {
        simulationStep++;
        simulateStatusUpdates();

        // Update progress bar
        const progress = Math.min(100, (simulationStep / maxSimulationSteps) * 100);
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;

        if (simulationStep >= maxSimulationSteps) {
            clearInterval(simulationInterval);

            // Simulation complete - show results
            loadingState.classList.add('hidden');
            photoGroupsElement.classList.remove('hidden');
            updatePhotoGroupsDisplay();
            updateStats();

            showMessage(`Escaneamento completo: Encontradas ${totalDuplicates} fotos duplicadas em ${photoGroups.length} grupos`, 'success');
        }
    }, 1000);
}

function simulateStatusUpdates() {
    const statusContainer = document.getElementById('status-updates');
    const currentTime = new Date().toLocaleTimeString();

    // Different messages based on current simulation step
    let message = '';
    if (simulationStep < 3) {
        message = `${currentTime} - Iniciando busca no diretório...`;
    } else if (simulationStep < 5) {
        message = `${currentTime} - Listando arquivos de imagem...`;
    } else if (simulationStep < 8) {
        message = `${currentTime} - Comparando tamanhos de arquivo...`;
    } else if (simulationStep < 12) {
        message = `${currentTime} - Calculando hashes de arquivo...`;
    } else if (simulationStep < 16) {
        message = `${currentTime} - Comparando conteúdo de arquivos semelhantes...`;
    } else if (simulationStep < 19) {
        message = `${currentTime} - Agrupando duplicatas...`;
    } else {
        message = `${currentTime} - Escaneamento completo!`;
    }

    // Add message to container
    const lineElement = document.createElement('div');
    lineElement.className = 'mb-1';
    lineElement.textContent = message;
    statusContainer.appendChild(lineElement);

    // Limit number of lines (optional)
    const maxLines = 15;
    while (statusContainer.children.length > maxLines) {
        statusContainer.removeChild(statusContainer.firstChild);
    }

    // Scroll to the end
    statusContainer.scrollTop = statusContainer.scrollHeight;
}

// Helper functions
function formatSize(bytes) {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function formatDate(dateString, includeTime = false) {
    if (!dateString) return '-';

    const date = new Date(dateString);

    if (includeTime) {
        return date.toLocaleString();
    } else {
        return date.toLocaleDateString();
    }
}

// Initialize grid view buttons
gridViewBtn.addEventListener('click', () => {
    gridViewBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
    gridViewBtn.classList.add('bg-blue-500', 'text-white');
    listViewBtn.classList.remove('bg-blue-500', 'text-white');
    listViewBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
});

// Initialize list view buttons
listViewBtn.addEventListener('click', () => {
    listViewBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
    listViewBtn.classList.add('bg-blue-500', 'text-white');
    gridViewBtn.classList.remove('bg-blue-500', 'text-white');
    gridViewBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
});

// Inicializar a paginação
updatePhotoGroupsDisplay();
// Remover lógica relacionada à Sensibilidade de Correspondência
// Definir tema padrão como claro
document.documentElement.classList.remove('dark');

function selectAllVisiblePhotos() {
    const visiblePhotos = document.querySelectorAll('.photo-item:not(.hidden)');
    let markedCount = 0;

    visiblePhotos.forEach(photoElement => {
        const photoId = parseInt(photoElement.getAttribute('data-id')); // Convertendo para int
        if (photoId) {
            markedPhotos.add(photoId);
            photoElement.classList.add('marked');
            const checkIcon = photoElement.querySelector('.check-icon');
            if (checkIcon) checkIcon.classList.remove('hidden');

            // Atualizar a foto selecionada
            if (selectedPhotoElement) {
                selectedPhotoElement.classList.remove('ring-2', 'ring-blue-500');
            }
            photoElement.classList.add('ring-2', 'ring-blue-500');
            selectedPhotoElement = photoElement;

            // Atualizar o painel de visualização
            const groupId = photoElement.getAttribute('data-group-id');
            const group = photoGroups.find(g => g.id === groupId);
            if (group) {
                const photo = group.photos.find(p => p.id === photoId);
                if (photo) {
                    updatePreview(photo);
                }
            }

            markedCount++;
        }
    });

    // Update stats
    updateStats();

    // Show message
    showMessage(`${markedCount} fotos selecionadas`, 'success');
}

document.getElementById('select-all-btn').addEventListener('click', selectAllVisiblePhotos);