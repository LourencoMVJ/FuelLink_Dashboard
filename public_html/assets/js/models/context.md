# public_html/assets/js/models

Frontend data-access modules — simple reads and non-privileged writes,
protected by Supabase RLS. Nothing here yet as standalone modules; the
Antigo dashboard does this inline (see its `sb.from('...')` calls covering
`user_roles`, `routes`, `fuellink_settings`, `bakers_settings`,
`transactions`, `trucks`, `drivers`, plus the `delivery-notes` storage
bucket).

## Table coverage (once split out)

Mirrors [private/app/Models/context.md](../../../../private/app/Models/context.md)
— same real tables, same reconciliation notes apply.

## Fixed rule

A file here only does simple reads / non-privileged operations. Anything
privileged (new user, sequential PDF numbering, secret-key operations)
calls the PHP API instead — never the Supabase secret key from the browser.
