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

    public function test_patch_updates_and_returns_the_row(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('user_roles', [
            ['user_id' => 'user-1', 'role' => 'bakers', 'is_admin' => false, 'full_name' => 'Old Name'],
        ]);
        $model = new UserRoleModel($client);

        $row = $model->patch('user-1', ['full_name' => 'New Name', 'is_admin' => true]);

        $this->assertNotNull($row);
        $this->assertSame('New Name', $row['full_name']);
        $this->assertTrue($row['is_admin']);
        $this->assertSame('bakers', $row['role']); // untouched fields survive the patch
    }

    public function test_patch_returns_null_when_the_user_does_not_exist(): void
    {
        $client = new FakeSupabaseClient();
        $model = new UserRoleModel($client);

        $this->assertNull($model->patch('no-such-user', ['full_name' => 'Whoever']));
    }

    public function test_find_by_user_id_returns_the_matching_row(): void
    {
        $client = new FakeSupabaseClient();
        $client->seed('user_roles', [
            ['user_id' => 'user-1', 'role' => 'fuellink'],
            ['user_id' => 'user-2', 'role' => 'bakers'],
        ]);
        $model = new UserRoleModel($client);

        $row = $model->findByUserId('user-2');

        $this->assertNotNull($row);
        $this->assertSame('bakers', $row['role']);
    }

    public function test_find_by_user_id_returns_null_when_not_found(): void
    {
        $client = new FakeSupabaseClient();
        $model = new UserRoleModel($client);

        $this->assertNull($model->findByUserId('missing'));
    }
}
