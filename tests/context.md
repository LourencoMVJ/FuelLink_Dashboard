# tests

PHPUnit. `Unit/` — lógica de risco, test-first, nunca toca em Supabase real
(usa `App\Core\FakeSupabaseClient`). `Integration/` — vazio por agora
(depende de decidir a via de staging: 2º projecto Supabase na conta do
cliente, Docker+Supabase CLI local, ou Postgres+PostgREST num servidor sem
Docker — nenhuma escolhida ainda).

## Correr localmente (Windows/XAMPP)

```
composer install   # se vendor/autoload.php faltar
OPENSSL_CONF="C:\xampp2\php\extras\openssl\openssl.cnf" vendor/bin/phpunit
```

**Porquê a variável `OPENSSL_CONF`**: o `php.ini` deste XAMPP só define
`openssl.cafile` (bundle de CAs), nunca o ficheiro de configuração do
OpenSSL em si. Sem `OPENSSL_CONF` a apontar para um `openssl.cnf` válido,
`openssl_pkey_new()` falha a gerar chaves EC (erro
`configuration file routines::no such file`), e
`tests/Unit/Core/AuthMiddlewareTest.php` salta-se inteiro via
`markTestSkipped()` em vez de correr. Confirmado nesta máquina em
2026-08-19: `C:\xampp2\php\extras\openssl\openssl.cnf` existe e resolve o
problema. Isto é específico do ambiente local, não do código — não faz
sentido meter no `composer.json`/`phpunit.xml`.
