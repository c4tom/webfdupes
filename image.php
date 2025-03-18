<?php
/**
 * Gerenciador de imagens para Duplicate Photos Finder
 * 
 * Este script gera miniaturas e versões redimensionadas de imagens
 * Uso: image.php?path=/caminho/para/imagem.jpg&width=300&height=200
 */

// Obter parâmetros
$path = isset($_GET['path']) ? $_GET['path'] : '';
$width = isset($_GET['width']) ? intval($_GET['width']) : 300;
$height = isset($_GET['height']) ? intval($_GET['height']) : 200;

// Validar parâmetros
if (empty($path)) {
    showErrorImage('Caminho não especificado', $width, $height);
    exit;
}

// Verificar segurança do caminho (evitar directory traversal)
$realPath = realpath($path);
if (!$realPath || !file_exists($realPath) || !is_file($realPath)) {
    showErrorImage('Arquivo não encontrado', $width, $height);
    exit;
}

// Verificar permissões
if (!is_readable($realPath)) {
    showErrorImage('Sem permissão para ler arquivo', $width, $height);
    exit;
}

// Verificar extensão de arquivo
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
$extension = strtolower(pathinfo($realPath, PATHINFO_EXTENSION));
if (!in_array($extension, $allowedExtensions)) {
    showErrorImage('Tipo de arquivo não suportado', $width, $height);
    exit;
}

// Verificar tamanho máximo de saída para evitar uso excessivo de memória
$maxOutputWidth = 1200;
$maxOutputHeight = 1200;
$width = min($width, $maxOutputWidth);
$height = min($height, $maxOutputHeight);

// Obter informações da imagem
$imgInfo = @getimagesize($realPath);
if (!$imgInfo) {
    showErrorImage('Formato de imagem inválido', $width, $height);
    exit;
}

// Carregar imagem baseado no tipo
$sourceImg = null;
switch ($imgInfo[2]) {
    case IMAGETYPE_JPEG:
        header('Content-Type: image/jpeg');
        $sourceImg = @imagecreatefromjpeg($realPath);
        break;
    case IMAGETYPE_PNG:
        header('Content-Type: image/png');
        $sourceImg = @imagecreatefrompng($realPath);
        break;
    case IMAGETYPE_GIF:
        header('Content-Type: image/gif');
        $sourceImg = @imagecreatefromgif($realPath);
        break;
    case IMAGETYPE_BMP:
        header('Content-Type: image/bmp');
        $sourceImg = @imagecreatefrombmp($realPath);
        break;
    case IMAGETYPE_WEBP:
        header('Content-Type: image/webp');
        $sourceImg = @imagecreatefromwebp($realPath);
        break;
    default:
        header('Content-Type: image/jpeg');
        showErrorImage('Formato não suportado', $width, $height);
        exit;
}

if (!$sourceImg) {
    showErrorImage('Falha ao processar imagem', $width, $height);
    exit;
}

// Redimensionar imagem preservando proporção
$sourceWidth = imagesx($sourceImg);
$sourceHeight = imagesy($sourceImg);

// Calcular novas dimensões mantendo proporção
$ratio = $sourceWidth / $sourceHeight;
$targetRatio = $width / $height;

if ($ratio > $targetRatio) {
    // Imagem original é mais larga
    $newWidth = $width;
    $newHeight = $width / $ratio;
    $offsetX = 0;
    $offsetY = ($height - $newHeight) / 2;
} else {
    // Imagem original é mais alta
    $newHeight = $height;
    $newWidth = $height * $ratio;
    $offsetX = ($width - $newWidth) / 2;
    $offsetY = 0;
}

// Criar imagem de destino
$targetImg = imagecreatetruecolor($width, $height);

// Manter transparência para PNG e GIF
if ($imgInfo[2] == IMAGETYPE_PNG || $imgInfo[2] == IMAGETYPE_GIF) {
    imagealphablending($targetImg, false);
    imagesavealpha($targetImg, true);
    $transparent = imagecolorallocatealpha($targetImg, 255, 255, 255, 127);
    imagefilledrectangle($targetImg, 0, 0, $width, $height, $transparent);
} else {
    // Fundo preto para imagens não transparentes
    $black = imagecolorallocate($targetImg, 0, 0, 0);
    imagefilledrectangle($targetImg, 0, 0, $width, $height, $black);
}

// Copiar e redimensionar
imagecopyresampled(
    $targetImg, $sourceImg,
    $offsetX, $offsetY, 0, 0,
    $newWidth, $newHeight, $sourceWidth, $sourceHeight
);

// Saída da imagem de acordo com o formato
switch ($imgInfo[2]) {
    case IMAGETYPE_JPEG:
        imagejpeg($targetImg, null, 85); // Qualidade 85%
        break;
    case IMAGETYPE_PNG:
        imagepng($targetImg, null, 6); // Compressão 6 (0-9)
        break;
    case IMAGETYPE_GIF:
        imagegif($targetImg);
        break;
    case IMAGETYPE_BMP:
        imagebmp($targetImg);
        break;
    case IMAGETYPE_WEBP:
        imagewebp($targetImg, null, 85); // Qualidade 85%
        break;
    default:
        imagejpeg($targetImg, null, 85);
}

// Limpar memória
imagedestroy($sourceImg);
imagedestroy($targetImg);

// Função para mostrar uma imagem de erro
function showErrorImage($message, $width, $height) {
    header('Content-Type: image/jpeg');
    
    // Criar imagem com mensagem de erro
    $img = imagecreatetruecolor($width, $height);
    $bgColor = imagecolorallocate($img, 240, 240, 240);
    $textColor = imagecolorallocate($img, 200, 30, 30);
    $borderColor = imagecolorallocate($img, 200, 200, 200);
    
    // Preencher fundo
    imagefill($img, 0, 0, $bgColor);
    
    // Adicionar borda
    imagerectangle($img, 0, 0, $width-1, $height-1, $borderColor);
    
    // Centralizar texto de erro
    $fontSize = 4; // Tamanho de fonte (1-5)
    $fontWidth = imagefontwidth($fontSize);
    $fontHeight = imagefontheight($fontSize);
    $textWidth = $fontWidth * strlen($message);
    
    $centerX = ($width - $textWidth) / 2;
    $centerY = ($height - $fontHeight) / 2;
    
    // Escrever mensagem de erro
    imagestring($img, $fontSize, $centerX, $centerY, $message, $textColor);
    
    // Escrever mensagem adicional
    $additionalMessage = "Erro de imagem";
    $additionalTextWidth = $fontWidth * strlen($additionalMessage);
    imagestring($img, 2, ($width - $additionalTextWidth) / 2, $centerY + $fontHeight + 5, $additionalMessage, $textColor);
    
    // Enviar imagem
    imagejpeg($img, null, 90);
    
    // Limpar memória
    imagedestroy($img);
}
