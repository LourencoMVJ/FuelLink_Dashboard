<?php

declare(strict_types=1);

namespace App\Core;

use App\Controllers\HealthController;
use App\Controllers\MeController;
use RuntimeException;

/**
 * Maps /api/<resource>/<action> requests to a Controller method. Routes are
 * an explicit whitelist — never instantiate a Controller class from
 * request-supplied input.
 */
final class Router
{
    /** @var list<array{0: string, 1: string, 2: class-string, 3: string}> */
    private const ROUTES = [
        ['GET', '#^health$#', HealthController::class, 'get'],
        ['GET', '#^me$#', MeController::class, 'get'],
    ];

    public static function dispatch(string $method, string $uri): void
    {
        $path = self::normalizedPath($uri);
        $pathMatchedAnyMethod = false;

        foreach (self::ROUTES as [$routeMethod, $pattern, $controllerClass, $action]) {
            if (!preg_match($pattern, $path, $matches)) {
                continue;
            }

            $pathMatchedAnyMethod = true;

            if ($routeMethod !== $method) {
                continue;
            }

            $controller = self::build($controllerClass);
            $controller->{$action}(...array_slice($matches, 1));

            return;
        }

        Response::error(
            $pathMatchedAnyMethod ? 'Method not allowed.' : 'Not found.',
            $pathMatchedAnyMethod ? 405 : 404,
        );
    }

    private static function normalizedPath(string $uri): string
    {
        $path = parse_url($uri, PHP_URL_PATH);
        $path = is_string($path) ? $path : '/';
        $path = preg_replace('#^/api/#', '', $path) ?? $path;

        return trim($path, '/');
    }

    private static function build(string $controllerClass): object
    {
        return match ($controllerClass) {
            HealthController::class => new HealthController(new AuthMiddleware(SupabaseClient::forService())),
            MeController::class => new MeController(new AuthMiddleware(SupabaseClient::forService())),
            default => throw new RuntimeException("No factory registered for {$controllerClass}."),
        };
    }
}
