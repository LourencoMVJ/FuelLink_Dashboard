<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\AuthMiddleware;
use App\Core\Response;

final class HealthController
{
    public function __construct(private readonly AuthMiddleware $auth)
    {
    }

    public function get(): void
    {
        $caller = $this->auth->requireAuth();

        Response::json([
            'user_id' => $caller['user_id'],
            'role' => $caller['role'],
        ]);
    }
}
