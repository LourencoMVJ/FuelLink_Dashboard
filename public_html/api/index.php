<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/vendor/autoload.php';

use App\Core\Bootstrap;
use App\Core\Router;

Bootstrap::init();
Router::dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
