-- Run manually in the Supabase SQL editor for this project, after 0004.
-- Bug fix, found 2026-08-24 while testing the new PATCH /api/users/{id}
-- endpoint: the first-ever UPDATE against user_roles failed with
-- "record \"new\" has no field \"id\"" (Supabase error 400). See
-- database/migrations/context.md for the full story.

-- ---------------------------------------------------------------------------
-- log_audit() (0003) hardcoded NEW.id::text as the audited record_id. That's
-- correct for transactions/routes/trucks/drivers (all have an `id` column),
-- but user_roles' key is `user_id`, not `id` — the audit_user_roles trigger
-- (0004) never actually fired successfully until now, because nothing had
-- ever UPDATEd user_roles before this endpoint existed. Any future table
-- with a differently-named key hits the same failure; this fix is generic
-- rather than a user_roles-specific special case.
--
-- Reads the id straight out of the already-computed new_json instead of
-- referencing NEW.id directly — a jsonb key lookup on a missing key returns
-- NULL instead of erroring, unlike a direct field reference on the row type.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  record_id text := COALESCE(new_json ->> 'id', new_json ->> 'user_id');
  key text;
BEGIN
  FOR key IN SELECT jsonb_object_keys(new_json) LOOP
    IF old_json -> key IS DISTINCT FROM new_json -> key THEN
      INSERT INTO public.audit_log (changed_by, changed_by_role, table_name, record_id, field, old_value, new_value)
      VALUES (
        auth.uid(), public.current_user_role(), TG_TABLE_NAME, record_id, key,
        old_json ->> key, new_json ->> key
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
