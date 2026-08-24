<?php

declare(strict_types=1);

namespace App\Core;

use App\Controllers\HealthController;
use App\Controllers\MeController;
use App\Controllers\OperationController;
use App\Controllers\UserController;
use App\Models\BakersSettingsModel;
use App\Models\DriverModel;
use App\Models\FuellinkSettingsModel;
use App\Models\RouteModel;
use App\Models\TransactionModel;
use App\Models\TruckModel;
use App\Models\UserRoleModel;
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
        ['GET', '#^operations/summary$#', OperationController::class, 'summary'],
        ['POST', '#^operations$#', OperationController::class, 'create'],
        ['PATCH', '#^operations/([0-9a-fA-F-]+)$#', OperationController::class, 'edit'],
        ['POST', '#^operations/([0-9a-fA-F-]+)/void$#', OperationController::class, 'void'],
        ['POST', '#^users$#', UserController::class, 'create'],
        ['PATCH', '#^users/([0-9a-fA-F-]+)$#', UserController::class, 'update'],
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

        // Strips everything through the LAST "/api/" segment, not just a
        // literal leading "/api/". In production (cPanel), public_html IS
        // the document root, so REQUEST_URI is already exactly "/api/...".
        // Under a plain XAMPP htdocs checkout (no vhost pointing straight
        // at public_html), it's "/<project-folder>/public_html/api/..." —
        // the anchored version only matched the former, 404ing every local
        // request. This matches both without requiring a local vhost.
        $path = preg_replace('#^.*/api/#', '', $path, 1) ?? $path;

        return trim($path, '/');
    }

    private static function build(string $controllerClass): object
    {
        return match ($controllerClass) {
            HealthController::class => new HealthController(new AuthMiddleware(SupabaseClient::forService())),
            MeController::class => new MeController(new AuthMiddleware(SupabaseClient::forService())),
            OperationController::class => self::buildOperationController(),
            UserController::class => self::buildUserController(),
            default => throw new RuntimeException("No factory registered for {$controllerClass}."),
        };
    }

    /**
     * Everything here is privileged (creating an Auth user, writing
     * user_roles) — no RLS-scoped client involved, unlike
     * buildOperationController(). One forService() instance covers both
     * the Auth Admin API call and the user_roles insert.
     */
    private static function buildUserController(): UserController
    {
        $serviceClient = SupabaseClient::forService();

        return new UserController(
            new AuthMiddleware($serviceClient),
            $serviceClient,
            new UserRoleModel($serviceClient),
        );
    }

    /**
     * Models here run under the caller's own JWT (forUser), so RLS —
     * migration 0004's company-scoped SELECT/INSERT on `transactions` —
     * applies as a second, DB-level enforcement layer underneath the
     * permission check OperationController does itself. AuthMiddleware
     * still gets its own forService() client, same as every other
     * Controller: its role/permission lookups are privileged reads, not
     * RLS-scoped ones.
     *
     * `bearerToken() ?? ''` builds a client with an empty Authorization
     * even when the header is missing/malformed — safe only because every
     * OperationController method calls requireAuth() (which re-parses the
     * same header and exits 401 on failure) before this client is ever
     * used for a Model call.
     */
    private static function buildOperationController(): OperationController
    {
        $userClient = SupabaseClient::forUser(AuthMiddleware::bearerToken() ?? '');

        return new OperationController(
            new AuthMiddleware(SupabaseClient::forService()),
            new TransactionModel($userClient),
            new RouteModel($userClient),
            new TruckModel($userClient),
            new DriverModel($userClient),
            new FuellinkSettingsModel($userClient),
            new BakersSettingsModel($userClient),
        );
    }
}
