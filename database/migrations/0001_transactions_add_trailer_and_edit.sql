-- Run manually in the Supabase SQL editor for this project.
-- Adds a free-text trailer registration field to transactions, and opens a
-- narrow, column-level UPDATE exception so driver/truck/trailer can be added
-- to operations retroactively, without weakening the append-only guarantee
-- on financial fields (date, type, amount, litres, etc).

-- New field: trailer / trela registration, free text, optional
ALTER TABLE public.transactions ADD COLUMN trailer_reg text;

-- Column-level grant: even a hand-crafted API/SQL request cannot update any
-- column other than these three, regardless of RLS policy.
GRANT UPDATE (driver_id, truck_id, trailer_reg) ON public.transactions TO authenticated;

-- Row-level policy: any authenticated user (bakers or fuellink) can update
-- driver/truck/trailer on logistics or diesel rows. Settlement and void rows
-- don't carry these fields, so they're excluded.
CREATE POLICY "update_driver_truck_trailer_on_operations"
ON public.transactions
FOR UPDATE
TO authenticated
USING (type IN ('logistics', 'diesel'))
WITH CHECK (type IN ('logistics', 'diesel'));
