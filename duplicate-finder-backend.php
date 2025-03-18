<?php
/**
 * Duplicate Photos Finder - Backend completo
 * 
 * Funcionalidades:
 * - Navegação remota de diretórios do servidor
 * - Escaneamento de fotos duplicadas usando fdupes
 * - Exibição de status de escaneamento em tempo real
 * - Movimentação de arquivos selecionados para a lixeira
 * - Processamento de imagens e metadados
 */

// Definir cabeçalho de resposta como JSON
header('Content-Type: application/json');

// Configurações
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'];
$maxImageWidth = 800;
$maxImageHeight = 600;
$maxThumbnailWidth = 300;
$maxThumbnailHeight = 200;

$allowedDirectories = ['/mnt/backup/DCIM/'];
$initialDirectory = '/mnt/backup/DCIM/';

// Função para verificar se um caminho está em um diretório permitido
function isPathAllowed($path)
{
    global $allowedDirectories;
    error_log("Verificando se o caminho está permitido: " . $path);

    // Se não há restrições, permite tudo
    if (empty($allowedDirectories)) {
        return true;
    }

    // Verificar se o caminho está dentro de um diretório permitido
    foreach ($allowedDirectories as $dir) {
        if (strpos($path, $dir) === 0) {
            error_log("Caminho permitido: " . $path);
            return true;
        }
    }

    error_log("Caminho não permitido: " . $path);
    return false;
}

// Função para validar diretório
function validateDirectory($directory) {
    if (empty($directory)) {
        error_log("Nenhum diretório especificado");
        return ['success' => false, 'error' => 'Nenhum diretório especificado'];
    }

    if (!file_exists($directory) || !is_dir($directory)) {
        error_log("Diretório não encontrado: " . $directory);
        return ['success' => false, 'error' => 'Diretório não encontrado'];
    }

    if (!is_readable($directory)) {
        error_log("Diretório não pode ser lido. Verifique as permissões: " . $directory);
        return ['success' => false, 'error' => 'Diretório não pode ser lido. Verifique as permissões.'];
    }

    return ['success' => true];
}

// 1. ENDPOINT DE NAVEGAÇÃO DE DIRETÓRIOS
// -------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'listDirectories') {
    $path = isset($_GET['path']) ? $_GET['path'] : $initialDirectory;
    error_log("Solicitação para listar diretórios: " . $path);

    // Validar e sanitizar o caminho para segurança
    if ($path === '/') {
        $path = $initialDirectory; // Raiz inicial
    } else {
        // Verificar uso de caminhos relativos para evitar ataques
        if (strpos($path, '..') !== false) {
            error_log("Caminho inválido: uso de caminhos relativos não permitido");
            echo json_encode(['success' => false, 'error' => 'Caminho inválido: uso de caminhos relativos não permitido']);
            exit;
        }

        $path = realpath($path);
    }

    // Verificar se é um diretório válido e permitido
    if (!$path || !is_dir($path) || !isPathAllowed($path)) {
        error_log("Caminho inválido ou inacessível: " . $path);
        echo json_encode(['success' => false, 'error' => 'Caminho inválido ou inacessível']);
        exit;
    }

    // Lista para armazenar diretórios e arquivos
    $directories = [];
    $files = [];
    $parentDir = dirname($path);

    // Verificar se o usuário tem permissões
    $validationResult = validateDirectory($path);
    if (!$validationResult['success']) {
        error_log("Diretório não pode ser lido. Verifique as permissões: " . $path);
        echo json_encode($validationResult);
        exit;
    }

    // Adicionar diretório pai, exceto se estiver na raiz
    if ($path !== '/' && $path !== dirname($path)) {
        $directories[] = [
            'name' => '..',
            'path' => $parentDir,
            'type' => 'dir'
        ];
    }

    // Listar conteúdo do diretório
    try {
        $items = new DirectoryIterator($path);
        foreach ($items as $item) {
            if ($item->isDot())
                continue;

            $itemPath = $item->getPathname();
            $itemName = $item->getFilename();

            if ($item->isDir()) {
                $directories[] = [
                    'name' => $itemName,
                    'path' => $itemPath,
                    'type' => 'dir'
                ];
            } else if ($item->isFile()) {
                // Listar apenas arquivos de imagem
                $extension = strtolower($item->getExtension());

                if (in_array($extension, $allowedExtensions)) {
                    $files[] = [
                        'name' => $itemName,
                        'path' => $itemPath,
                        'type' => 'file',
                        'size' => $item->getSize(),
                        'extension' => $extension
                    ];
                }
            }
        }
    } catch (Exception $e) {
        error_log("Erro ao listar diretório: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'Erro ao listar diretório: ' . $e->getMessage()]);
        exit;
    }

    // Ordenar diretórios e arquivos por nome
    usort($directories, function ($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });

    usort($files, function ($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });

    // Preparar resposta
    echo json_encode([
        'success' => true,
        'currentPath' => $path,
        'items' => array_merge($directories, $files)
    ]);
    exit;
}

// 2. INICIAR ESCANEAMENTO COM FDUPES
// --------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'startScan') {
    $directory = isset($_POST['directory']) ? $_POST['directory'] : '';
    $matchingLevel = isset($_POST['matchingLevel']) ? intval($_POST['matchingLevel']) : 90;

    // Validar diretório
    $validationResult = validateDirectory($directory);
    if (!$validationResult['success']) {
        error_log("Diretório não encontrado ou não pode ser lido: " . $directory);
        echo json_encode($validationResult);
        exit;
    }

    // Gerar um ID único para este escaneamento
    $scanId = uniqid('scan_');
    $statusFile = sys_get_temp_dir() . "/{$scanId}_status.txt";
    $outputFile = sys_get_temp_dir() . "/{$scanId}_output.txt";

    // Criar comando para encontrar apenas arquivos de imagem com fdupes
    $command = 'fdupes -r "' . $directory . '" 2>&1';

    // Iniciar processo em segundo plano que salva o progresso e a saída
    $bgProcessCmd = "touch {$statusFile}; echo 'Iniciando busca por duplicatas...' > {$statusFile}; " .
        "echo 'Escaneando: {$directory}' >> {$statusFile}; " .
        "{$command} | tee {$outputFile} | while read line; do " .
        "echo \$(date '+%H:%M:%S') - \$line >> {$statusFile}; " .
        "done; " .
        "echo 'Escaneamento completo!' >> {$statusFile}";

    // Executar em segundo plano
    error_log('Executando comando: ' . $command . "\n");
    exec("nohup bash -c \"{$bgProcessCmd}\" > /dev/null 2>&1 &");

    // Retornar o ID para que o frontend possa consultar o status
    echo json_encode([
        'success' => true,
        'scanId' => $scanId,
        'message' => 'Escaneamento iniciado em ' . $directory
    ]);
    exit;
}

// 3. VERIFICAR STATUS DO ESCANEAMENTO
// --------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'checkStatus') {
    $scanId = isset($_GET['scanId']) ? $_GET['scanId'] : '';

    if (empty($scanId) || !preg_match('/^scan_[a-f0-9]+$/', $scanId)) {
        error_log("ID de escaneamento inválido");
        echo json_encode(['success' => false, 'error' => 'ID de escaneamento inválido']);
        exit;
    }

    $statusFile = sys_get_temp_dir() . "/{$scanId}_status.txt";
    $outputFile = sys_get_temp_dir() . "/{$scanId}_output.txt";

    if (!file_exists($statusFile)) {
        error_log("Escaneamento não encontrado");
        echo json_encode(['success' => false, 'error' => 'Escaneamento não encontrado']);
        exit;
    }

    // Ler últimas 15 linhas do arquivo de status
    $statusOutput = [];
    exec("tail -n 15 {$statusFile}", $statusOutput);

    // Verificar se o escaneamento está completo
    $isComplete = false;
    $lastLine = end($statusOutput);
    if (strpos($lastLine, 'Escaneamento completo!') !== false) {
        $isComplete = true;
    }

    // Verificar se o fdupes ainda está em execução
    $fdupesRunning = false;
    exec("ps aux | grep 'fdupes.*{$scanId}' | grep -v grep", $psOutput);
    if (!empty($psOutput)) {
        $fdupesRunning = true;
    }

    // Se o escaneamento estiver completo, processar o resultado do fdupes
    $results = [];
    if ($isComplete && file_exists($outputFile)) {
        $output = file($outputFile, FILE_IGNORE_NEW_LINES);

        // Processar a saída do fdupes para extrair grupos
        $duplicateGroups = [];
        $currentGroup = [];
        $groupId = 1;
        $photoId = 1;

        foreach ($output as $line) {
            $line = trim($line);

            if (empty($line)) {
                // Linha vazia marca o fim de um grupo
                if (!empty($currentGroup)) {
                    $duplicateGroups[] = [
                        'id' => $groupId++,
                        'photos' => $currentGroup
                    ];
                    $currentGroup = [];
                }
            } else {
                // Este é um caminho de arquivo
                $filePath = $line;

                if (file_exists($filePath) && is_file($filePath)) {
                    // Obter informações básicas do arquivo
                    $fileInfo = pathinfo($filePath);
                    $fileSize = filesize($filePath);
                    $fileCreated = date('Y-m-d\TH:i:s', filectime($filePath));
                    $fileModified = date('Y-m-d\TH:i:s', filemtime($filePath));

                    // Obter metadados da imagem
                    $metadata = getImageMetadata($filePath);

                    // Criar objeto de imagem com URLs para thumbnails
                    $photo = [
                        'id' => $photoId++,
                        'name' => $fileInfo['basename'],
                        'path' => $filePath,
                        'size' => $fileSize,
                        'created' => $fileCreated,
                        'modified' => $fileModified,
                        'width' => isset($metadata['width']) ? $metadata['width'] : 0,
                        'height' => isset($metadata['height']) ? $metadata['height'] : 0,
                        'thumbnail' => 'image.php?path=' . urlencode($filePath) . "&width={$maxThumbnailWidth}&height={$maxThumbnailHeight}",
                        'url' => 'image.php?path=' . urlencode($filePath) . "&width={$maxImageWidth}&height={$maxImageHeight}"
                    ];

                    $currentGroup[] = $photo;
                }
            }
        }

        // Adicionar o último grupo, se houver
        if (!empty($currentGroup)) {
            $duplicateGroups[] = [
                'id' => $groupId++,
                'photos' => $currentGroup
            ];
        }

        // Filtrar grupos com apenas um arquivo (não são duplicados)
        $duplicateGroups = array_filter($duplicateGroups, function ($group) {
            return count($group['photos']) > 1;
        });

        // Reindexar chaves de array
        $duplicateGroups = array_values($duplicateGroups);

        // Contar total de arquivos duplicados
        $totalDuplicates = 0;
        $totalSpace = 0;
        foreach ($duplicateGroups as $group) {
            $totalDuplicates += count($group['photos']);
            foreach ($group['photos'] as $photo) {
                $totalSpace += $photo['size'];
            }
        }

        $results = [
            'groups' => $duplicateGroups,
            'totalDuplicates' => $totalDuplicates,
            'totalSpace' => $totalSpace,
            'groupCount' => count($duplicateGroups)
        ];
    }

    echo json_encode([
        'success' => true,
        'status' => $statusOutput,
        'isComplete' => $isComplete,
        'isRunning' => $fdupesRunning,
        'results' => $isComplete ? $results : []
    ]);
    exit;
}

// 4. MOVER ARQUIVOS PARA A LIXEIRA
// ------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'moveToTrash') {
    // Obter a lista de arquivos para mover
    $files = isset($_POST['files']) ? json_decode($_POST['files'], true) : [];
    $response = ['success' => false, 'message' => '', 'moved' => []];

    if (empty($files)) {
        error_log("Nenhum arquivo especificado");
        $response['message'] = 'Nenhum arquivo especificado';
        echo json_encode($response);
        exit;
    }

    $movedFiles = [];
    $errors = [];
    $totalSpaceSaved = 0;

    foreach ($files as $file) {
        $filePath = $file['path'];

        // Validar caminho do arquivo por segurança
        if (!file_exists($filePath) || !is_file($filePath)) {
            error_log("Arquivo não encontrado: " . basename($filePath));
            $errors[] = "Arquivo não encontrado: " . basename($filePath);
            continue;
        }

        // Verificar permissões
        if (!is_writable($filePath)) {
            error_log("Sem permissão para mover: " . basename($filePath));
            $errors[] = "Sem permissão para mover: " . basename($filePath);
            continue;
        }

        // Guardar tamanho para cálculo de espaço economizado
        $fileSize = filesize($filePath);

        // Mover arquivo para a lixeira usando trash-cli no Linux
        $command = 'trash-put "' . $filePath . '" 2>&1';
        $output = [];
        $returnVar = 0;

        // Executar o comando
        exec($command, $output, $returnVar);

        if ($returnVar === 0) {
            $movedFiles[] = [
                'name' => basename($filePath),
                'path' => $filePath,
                'size' => $fileSize
            ];
            $totalSpaceSaved += $fileSize;
        } else {
            error_log("Falha ao mover " . basename($filePath) . " para a lixeira: " . implode(" ", $output));
            $errors[] = "Falha ao mover " . basename($filePath) . " para a lixeira: " . implode(" ", $output);
        }
    }

    // Preparar resposta
    if (count($movedFiles) > 0) {
        $response['success'] = true;
        $response['message'] = count($movedFiles) . ' arquivos movidos para a lixeira';
        $response['moved'] = $movedFiles;
        $response['spaceSaved'] = $totalSpaceSaved;

        if (count($errors) > 0) {
            $response['message'] .= ' com ' . count($errors) . ' erros';
            $response['errors'] = $errors;
        }
    } else {
        $response['message'] = 'Falha ao mover arquivos para a lixeira';
        $response['errors'] = $errors;
    }

    echo json_encode($response);
    exit;
}

// 5. FUNÇÕES AUXILIARES
// ------------------

// Função para obter dimensões e metadados de imagem
function getImageMetadata($filePath)
{
    $metadata = [
        'width' => 0,
        'height' => 0
    ];

    if (function_exists('getimagesize')) {
        $imageInfo = @getimagesize($filePath);
        if ($imageInfo) {
            $metadata['width'] = $imageInfo[0];
            $metadata['height'] = $imageInfo[1];

            // Adicionar tipo de imagem
            $metadata['type'] = $imageInfo[2]; // IMAGETYPE_XXX constant

            // Adicionar bits e canais se disponíveis
            if (isset($imageInfo['bits'])) {
                $metadata['bits'] = $imageInfo['bits'];
            }

            if (isset($imageInfo['channels'])) {
                $metadata['channels'] = $imageInfo['channels'];
            }
        }
    }

    // Adicionar data EXIF se disponível
    if (function_exists('exif_read_data')) {
        try {
            $exif = @exif_read_data($filePath, 'ANY_TAG', true);
            if ($exif && is_array($exif)) {
                // Adicionar data de captura se disponível
                if (isset($exif['EXIF']['DateTimeOriginal'])) {
                    $metadata['dateTaken'] = $exif['EXIF']['DateTimeOriginal'];
                }

                // Adicionar informações da câmera
                if (isset($exif['IFD0']['Make'])) {
                    $metadata['cameraMake'] = $exif['IFD0']['Make'];
                }

                if (isset($exif['IFD0']['Model'])) {
                    $metadata['cameraModel'] = $exif['IFD0']['Model'];
                }
            }
        } catch (Exception $e) {
            // Ignorar erros de EXIF, pois nem todas as imagens têm esses dados
        }
    }

    return $metadata;
}

// Resposta padrão para acesso direto
echo json_encode(['error' => 'Requisição inválida']);
?>