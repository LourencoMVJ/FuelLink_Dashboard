-- Run manually in the Supabase SQL editor for this project.
-- Truck and Driver on operations become free-text inputs (with suggestions
-- from the existing Fleet), instead of a dropdown forcing a pre-registered
-- truck/driver. When the typed text matches an existing Fleet record,
-- truck_id/driver_id is still set as before; when it doesn't match, the
-- typed text is kept as-is in these new columns, with no automatic creation
-- of a new Fleet record.

ALTER TABLE public.transactions ADD COLUMN truck_text text;
ALTER TABLE public.transactions ADD COLUMN driver_text text;

-- Extend the existing column-level UPDATE grant (see migration 0001) to
-- also cover these two new columns, so the Edit modal can save them too.
GRANT UPDATE (truck_text, driver_text) ON public.transactions TO authenticated;
