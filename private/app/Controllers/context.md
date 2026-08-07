# private/app/Controllers

PHP request handlers for privileged operations only (things that need the
Supabase secret key, or logic that must never run in the browser — creating
users, generating sequentially-numbered PDFs, etc.). Nothing here yet — no
Month-1 work has started.

## Existing Controllers

_(none yet)_

## Fixed rules

- A Controller never talks to the Supabase REST API directly — always via a
  Model in [private/app/Models/](../Models/).
- Every Controller starts with `AuthMiddleware::requireAuth()`
  (see [private/app/Core/context.md](../Core/context.md)), and — once
  `user_permissions` exists — checks the exact permission needed before
  acting. Never gate on "is this user an admin?" alone.
- Unprivileged reads don't belong here — the frontend should query Supabase
  directly (see [public_html/assets/js/models/context.md](../../../public_html/assets/js/models/context.md)).
  Only add a Controller when there's a real reason the browser can't do it
  safely.
