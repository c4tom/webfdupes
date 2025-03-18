<?php
// Inicia um servidor web PHP simples na porta 8000
// Executar: php server.php

$host = '0.0.0.0';
$port = 8000;
$root = __DIR__;

echo "Iniciando servidor PHP em http://$host:$port\n";
echo "Diretório raiz: $root\n";
echo "Pressione Ctrl+C para sair.\n\n";

// Iniciar o servidor PHP embutido
exec("php -S $host:$port -t $root");
?>