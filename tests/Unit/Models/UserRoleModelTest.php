<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Core\FakeSupabaseClient;
use App\Models\UserRoleModel;
use PHPUnit\Framework\TestCase;

final class UserRoleModelTest extends TestCase
{
    public function test_create_inserts_and_returns_the_new_row(): void
    {
        $client = new FakeSupabaseClient();
        $model = new UserRoleModel($client);

        $row = $model->create([
            'user_id' => 'new-user-uuid',
            'role' => 'bakers',
            'is_admin' => false,
            'full_name' => 'New User',
            'phone' => null,
            'is_active' => true,
            'created_by' => 'admin-uuid',
        ]);

        $this->assertSame('bakers', $row['role']);
        $this->assertSame('New User', $row['full_name']);

        $stored = $client->get('user_roles', ['user_id' => 'eq.new-user-uuid']);
        $this->assertCount(1, $stored);
    }
}
