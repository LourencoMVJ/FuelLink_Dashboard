-- Run manually in the Supabase SQL editor for this project, after 0007.
-- Bankers delivery tracking (2026-08-27, user request): 3 litres
-- quantities per logistics operation (order/loaded/offloaded), a proof
-- upload slot for each, and 2 server-computed columns (difference,
-- delivery value). Decisions closed with the user before writing this:
--   - order_amount/loaded_amount/offloaded_amount are NEW columns,
--     independent of the existing `litres` column (which keeps its
--     current role driving amount/unit_rate — untouched here).
--   - loaded_offloaded_diff / delivery_value are computed server-side
--     (OperationController) and STORED (not purely derived on read) —
--     null until their inputs exist, recalculated whenever
--     loaded_amount/offloaded_amount change.
--   - delivery_value = offloaded_amount * unit_rate — same frozen rate
--     already used for the operation's own amount/balance_delta, not a
--     separate price.
--   - 3 separate proof uploads (order/loaded/offloaded), not the single
--     shared delivery_note_path/name pair — expands the M3 roadmap's
--     original "1 file, closed decision" (docs/ROADMAP_BACKEND.md Month 3)
--     at the user's explicit request 2026-08-27.

ALTER TABLE public.transactions
  ADD COLUMN order_amount numeric,
  ADD COLUMN loaded_amount numeric,
  ADD COLUMN offloaded_amount numeric,
  ADD COLUMN loaded_offloaded_diff numeric,
  ADD COLUMN delivery_value numeric,
  ADD COLUMN order_proof_path text,
  ADD COLUMN order_proof_name text,
  ADD COLUMN loaded_proof_path text,
  ADD COLUMN loaded_proof_name text,
  ADD COLUMN offloaded_proof_path text,
  ADD COLUMN offloaded_proof_name text;

-- Extends the column-scoped UPDATE grant from 0003 (which only listed the
-- columns that existed then) to cover the 11 new ones — PostgREST PATCH
-- requests fail with a permission error on any column not explicitly
-- granted, regardless of RLS. Re-issuing GRANT UPDATE with the full
-- column list is additive/idempotent, not a reset of prior grants.
GRANT UPDATE (
  date, litres, route_id, amount, balance_delta, unit_rate, detail, note,
  truck_id, truck_text, driver_id, driver_text, trailer_reg,
  delivery_note_path, delivery_note_name,
  order_amount, loaded_amount, offloaded_amount, loaded_offloaded_diff,
  delivery_value, order_proof_path, order_proof_name, loaded_proof_path,
  loaded_proof_name, offloaded_proof_path, offloaded_proof_name
) ON public.transactions TO authenticated;
