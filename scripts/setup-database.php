<?php
// Creates only the dedicated Nexo databases; never drops or replaces existing data.
require __DIR__.'/../vendor/autoload.php';
Dotenv\Dotenv::createImmutable(dirname(__DIR__))->safeLoad();
$database = in_array('--testing', $argv, true) ? 'nexo_commerce_testing' : 'nexo_commerce';
$pdo = new PDO('mysql:host='.($_ENV['DB_HOST'] ?? '127.0.0.1').';port='.($_ENV['DB_PORT'] ?? '3306'), $_ENV['DB_USERNAME'] ?? 'root', $_ENV['DB_PASSWORD'] ?? '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
echo "Database {$database} is ready.\n";
