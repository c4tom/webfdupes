<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buscador de Fotos Duplicadas</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>

<body class="font-sans min-h-screen">
    <div id="message-box" class="message-box"></div>

    <div class="app-container flex flex-col h-screen">
        <!-- Header -->
        <header class="header text-white p-3 flex justify-between items-center">
            <div class="flex items-center">
                <i class="fas fa-clone text-2xl mr-3"></i>
                <h1 class="text-xl font-bold">Buscador de Fotos Duplicadas</h1>
            </div>
            <div class="flex items-center space-x-3">
                <button id="settings-btn" class="px-3 py-1 rounded hover:bg-opacity-80 transition">
                    <i class="fas fa-cog mr-1"></i> Configurações
                </button>
                <button id="help-btn" class="px-3 py-1 rounded hover:bg-opacity-80 transition">
                    <i class="fas fa-question-circle mr-1"></i> Ajuda
                </button>
            </div>
        </header>

        <!-- Toolbar -->
        <div class="toolbar p-3 bg-gray-100 dark:bg-gray-800 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center space-x-2">
                <button id="select-folder-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition flex items-center">
                    <i class="fas fa-folder-open mr-1"></i> Selecionar Pasta
                </button>
                <button id="unmark-all-btn" class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded transition flex items-center">
                    <i class="fas fa-minus-circle mr-1"></i> Desmarcar Tudo
                </button>
                <div class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded flex items-center">
                    <i class="fas fa-search mr-1"></i>
                    <input id="search-input" type="text" placeholder="Pesquisar..." class="bg-transparent outline-none w-32">
                </div>
            </div>

            <div class="text-blue-600 dark:text-blue-400 font-medium flex items-center">
                <div class="mr-4">
                    <i class="fas fa-image mr-1"></i>
                    Fotos Duplicadas: <span id="duplicate-count">0</span>
                </div>
                <div>
                    <i class="fas fa-save mr-1"></i>
                    Espaço a Economizar: <span id="space-saved">0 MB</span>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <div class="flex space-x-1">
                    <button id="grid-view-btn" class="p-1 rounded bg-blue-500 text-white">
                        <i class="fas fa-th"></i>
                    </button>
                    <button id="list-view-btn" class="p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        <i class="fas fa-list"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-grow flex overflow-hidden">
            <!-- Photo Groups List -->
            <div class="flex-grow overflow-y-auto p-4" id="photo-groups-container">
                <div id="empty-state" class="flex flex-col items-center justify-center h-full text-gray-400">
                    <i class="fas fa-images text-6xl mb-4"></i>
                    <p class="text-xl">Selecione uma pasta para encontrar fotos duplicadas</p>
                    <button id="start-scan-btn" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition">
                        <i class="fas fa-folder-open mr-2"></i> Selecionar Pasta
                    </button>
                </div>

                <div id="loading-state" class="hidden flex flex-col items-center justify-center h-full">
                    <div class="spinner mb-4"></div>
                    <p class="text-xl mb-2" id="loading-text">Escaneando fotos...</p>
                    <div id="progress-container" class="w-64 mb-4 hidden">
                        <div class="progress-bar">
                            <div id="progress-fill" class="progress-fill"></div>
                        </div>
                        <div class="text-xs text-center mt-1" id="progress-text">0%</div>
                    </div>
                </div>

                <div id="photo-groups" class="hidden space-y-6"></div>
                <div id="pagination-controls" class="flex items-center justify-between mt-4">
                    <select id="items-per-page" class="p-2 border rounded">
                        <option value="25">25 por página</option>
                        <option value="50">50 por página</option>
                        <option value="100">100 por página</option>
                    </select>
                    <button id="prev-page" class="p-2 border rounded" disabled>Anterior</button>
                    <span id="page-info" class="mx-2"></span>
                    <button id="next-page" class="p-2 border rounded">Próxima</button>
                </div>
            </div>

            <!-- Preview Panel -->
            <div class="preview-panel w-80 p-4 hidden md:block overflow-y-auto" id="preview-panel">
                <div class="mb-4">
                    <h3 class="text-lg font-medium mb-2">Pré-visualização</h3>
                    <div class="bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden h-48 image-preview-container">
                        <img id="preview-image" class="w-full h-full object-contain" src="" alt="Pré-visualização">
                    </div>
                </div>

                <div class="mb-4">
                    <h3 class="text-lg font-medium mb-2">Metadados</h3>
                    <table class="w-full text-sm metadata-table">
                        <tbody id="metadata-container">
                            <tr>
                                <td class="py-1 px-2 font-medium">Nome do Arquivo:</td>
                                <td class="py-1 px-2">-</td>
                            </tr>
                            <tr>
                                <td class="py-1 px-2 font-medium">Tamanho:</td>
                                <td class="py-1 px-2">-</td>
                            </tr>
                            <tr>
                                <td class="py-1 px-2 font-medium">Dimensões:</td>
                                <td class="py-1 px-2">-</td>
                            </tr>
                            <tr>
                                <td class="py-1 px-2 font-medium">Criado em:</td>
                                <td class="py-1 px-2">-</td>
                            </tr>
                            <tr>
                                <td class="py-1 px-2 font-medium">Modificado em:</td>
                                <td class="py-1 px-2">-</td>
                            </tr>
                            <tr>
                                <td class="py-1 px-2 font-medium">Caminho:</td>
                                <td class="py-1 px-2">-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer class="p-3 bg-gray-100 dark:bg-gray-800 flex justify-between items-center">
            <div class="text-sm">
                <span id="total-stats">0 fotos duplicadas em 0 grupos</span>
                <span id="marked-count" class="ml-4">0 Marcadas</span>
            </div>
            <div>
                <button id="delete-marked-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    Excluir Marcadas
                </button>
            </div>
        </footer>
    </div>

    <!-- Folder Browser Modal -->
    <div id="folder-browser-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-3xl p-6 h-3/4 flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">Selecionar Pasta</h3>
                <button id="close-folder-browser" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Breadcrumb Navigation -->
            <div class="mb-4 overflow-x-auto whitespace-nowrap py-3 px-2 bg-gray-100 dark:bg-gray-700 rounded">
                <div id="breadcrumb-container" class="flex items-center">
                    <span class="breadcrumb-item" data-path="/mnt/backup/DCIM">
                        <i class="fas fa-home"></i>
                    </span>
                    <span class="mx-1">/</span>
                    <!-- Dynamic breadcrumbs will be added here -->
                </div>
            </div>

            <!-- Current Path -->
            <div class="mb-4 flex items-center bg-gray-100 dark:bg-gray-700 p-2 rounded">
                <i class="fas fa-folder-open text-yellow-500 mr-2"></i>
                <div id="current-path" class="text-sm flex-grow truncate">/</div>
            </div>

            <!-- Directory content -->
            <div id="directory-content" class="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-2">
                <div class="flex justify-center py-10 hidden" id="directory-loader">
                    <div class="spinner"></div>
                </div>
                <div class="directory-items"></div>
            </div>

            <!-- Action buttons -->
            <div class="mt-4 flex justify-end space-x-3">
                <button id="cancel-folder-select" class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                    Cancelar
                </button>
                <button id="select-folder-confirm" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">
                    Selecionar esta pasta
                </button>
            </div>
        </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">Configurações</h3>
                <button id="close-settings" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <label class="font-medium">Modo Escuro</label>
                    <div class="relative inline-block w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-600">
                    <input type="checkbox" id="dark-mode-toggle" class="sr-only">
                        <span class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform dark:transform dark:translate-x-6"></span>
                   </div>
                </div>

                <div>
                    <label class="block mb-2 font-medium">Visualização Padrão</label>
                    <div class="flex space-x-2">
                        <button id="settings-grid-view" class="flex-1 py-2 rounded bg-blue-500 text-white">Grade</button>
                        <button id="settings-list-view" class="flex-1 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Lista</button>
                    </div>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-3">
                <button id="settings-cancel" class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                    Cancelar
                </button>
                <button id="settings-save" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">
                    Salvar
                </button>
            </div>
        </div>
    </div>

    <!-- Help Modal -->
    <div id="help-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-screen overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">Ajuda</h3>
                <button id="close-help" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="space-y-4">
                <div>
                    <h4 class="font-bold text-lg mb-2">Como Usar</h4>
                    <ol class="list-decimal list-inside space-y-2">
                        <li>Clique em "Selecionar Pasta" para escolher um diretório para escanear.</li>
                        <li>O aplicativo analisará todas as fotos e agrupará imagens semelhantes.</li>
                        <li>Revise cada grupo e selecione as fotos que deseja excluir clicando nelas.</li>
                        <li>Clique em "Excluir Marcadas" para mover as fotos selecionadas para a lixeira.</li>
                    </ol>
                </div>

                <div>
                    <h4 class="font-bold text-lg mb-2">Funcionalidades</h4>
                    <ul class="list-disc list-inside space-y-2">
                        <li><strong>Painel de Pré-visualização:</strong> Mostra detalhes da imagem selecionada e metadados.</li>
                        <li><strong>Visualizações Múltiplas:</strong> Alterne entre visualizações em grade e lista.</li>
                        <li><strong>Espaço Economizado:</strong> Veja quanto espaço em disco você recuperará excluindo as fotos marcadas.</li>
                    </ul>
                </div>

                <div>
                    <h4 class="font-bold text-lg mb-2">Dicas</h4>
                    <ul class="list-disc list-inside space-y-2">
                        <li>O aplicativo usa o fdupes (uma ferramenta de linha de comando do Linux) para encontrar fotos duplicadas de forma rápida e precisa.</li>
                        <li>Os arquivos são movidos para a lixeira, não excluídos permanentemente, para que você possa restaurá-los se necessário.</li>
                    </ul>
                </div>
            </div>

            <div class="mt-6 flex justify-end">
                <button id="help-close-btn" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">
                    Fechar
                </button>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="confirm-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
            <div class="mb-4">
                <h3 class="text-xl font-bold text-red-500">Confirmar Exclusão</h3>
            </div>

            <p>Tem certeza que deseja mover <span id="marked-files-count" class="font-bold">0</span> arquivos para a lixeira?</p>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Esta ação moverá os arquivos para a pasta de lixeira do sistema.</p>

            <div class="mt-6 flex justify-end space-x-3">
                <button id="cancel-delete" class="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                    Cancelar
                </button>
                <button id="confirm-delete" class="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white">
                    Excluir
                </button>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>

</html>