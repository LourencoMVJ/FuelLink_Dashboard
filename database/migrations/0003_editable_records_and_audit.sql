-- Run manually in the Supabase SQL editor for this project, after 0001 and 0002.
-- Adds editing to every table in the dashboard (transactions, routes, trucks,
-- drivers), replacing the narrow driver/truck/trailer-only UPDATE exception
-- from migration 0001 with a full but still tightly-scoped one, and records
-- every change in an audit_log table via triggers.

-- ---------------------------------------------------------------------------
-- 1. Helper: role of the currently authenticated user (bakers / fuellink)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 2. transactions.unit_rate — the R/L rate applied when the entry was made
--    (route total rate, or diesel price). Without freezing this, editing the
--    litres on an old entry would reprice it at *today's* rate.
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ADD COLUMN unit_rate numeric;

-- ---------------------------------------------------------------------------
-- 3. Replace the driver/truck/trailer-only UPDATE grant from migration 0001
--    with a full column set, still excluding type, entered_by, voids_id,
--    voids_type, id and created_at — those stay permanently immutable, even
--    to a hand-crafted API call.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "update_driver_truck_trailer_on_operations" ON public.transactions;
REVOKE UPDATE ON public.transactions FROM authenticated;

GRANT UPDATE (
  date, litres, route_id, amount, balance_delta, unit_rate, detail, note,
  truck_id, truck_text, driver_id, driver_text, trailer_reg,
  delivery_note_path, delivery_note_name
) ON public.transactions TO authenticated;

CREATE POLICY "update_own_operations"
ON public.transactions
FOR UPDATE
TO authenticated
USING (type <> 'void' AND entered_by = public.current_user_role())
WITH CHECK (type <> 'void' AND entered_by = public.current_user_role());

-- ---------------------------------------------------------------------------
-- 4. routes — only Bakers edits; id stays immutable (referenced by transactions)
-- ---------------------------------------------------------------------------
GRANT UPDATE (from_point, to_point, cargo, payload, adj_may, adj_june, adj_july, base_rate)
ON public.routes TO authenticated;

CREATE POLICY "update_routes_bakers_only"
ON public.routes
FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'bakers')
WITH CHECK (public.current_user_role() = 'bakers');

-- ---------------------------------------------------------------------------
-- 5. trucks / drivers — either party can correct Fleet details
-- ---------------------------------------------------------------------------
GRANT UPDATE (reg_number, description) ON public.trucks TO authenticated;

CREATE POLICY "update_trucks_either_party"
ON public.trucks
FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('bakers', 'fuellink'))
WITH CHECK (public.current_user_role() IN ('bakers', 'fuellink'));

GRANT UPDATE (name, license_number, phone) ON public.drivers TO authenticated;

CREATE POLICY "update_drivers_either_party"
ON public.drivers
FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('bakers', 'fuellink'))
WITH CHECK (public.current_user_role() IN ('bakers', 'fuellink'));

-- ---------------------------------------------------------------------------
-- 6. Audit log — one row per changed field, written only by triggers.
--    Not surfaced in the UI; query directly in Supabase when needed.
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  changed_by_role text,
  table_name text NOT NULL,
  record_id text NOT NULL,
  field text NOT NULL,
  old_value text,
  new_value text
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_authenticated"
ON public.audit_log
FOR SELECT
TO authenticated
USING (true);
-- No INSERT/UPDATE/DELETE policy for any role: only the SECURITY DEFINER
-- trigger function below (which bypasses RLS) can write to this table.

CREATE OR REPLACE FUNCTION public.log_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  key text;
BEGIN
  FOR key IN SELECT jsonb_object_keys(new_json) LOOP
    IF old_json -> key IS DISTINCT FROM new_json -> key THEN
      INSERT INTO public.audit_log (changed_by, changed_by_role, table_name, record_id, field, old_value, new_value)
      VALUES (
        auth.uid(), public.current_user_role(), TG_TABLE_NAME, NEW.id::text, key,
        old_json ->> key, new_json ->> key
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_transactions AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_routes AFTER UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_trucks AFTER UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER audit_drivers AFTER UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();
