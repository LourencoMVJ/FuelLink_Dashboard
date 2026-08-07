# public_html/api

Front-controller entry point for privileged PHP endpoints. Nothing here yet
— the current app (`Antigo dashboard/`) talks to Supabase directly from the
browser for everything, which is correct for unprivileged reads/writes
under RLS, but has no PHP layer at all yet.

## Route map

`/api/<recurso>/<ação>.php` → Controller in
[private/app/Controllers/](../../private/app/Controllers/context.md)

_(no routes yet)_

## Fixed rule

Every file here is a thin door: parse the request, call the matching
Controller method, return JSON. No business logic directly in this
directory.
