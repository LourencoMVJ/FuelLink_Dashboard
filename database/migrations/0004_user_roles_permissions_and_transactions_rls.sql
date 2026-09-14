-- Run manually in the Supabase SQL editor for this project, after 0001-0003.
-- Month 1: extends user_roles with Admin/User + profile fields (reconciliation
-- point 1 — no parallel `profiles` table), introduces the fine-grained
-- user_permissions catalog (point 7), and closes a gap found during frontend
-- spec work: transactions has no SELECT RLS policy at all today, so any
-- authenticated user can read every row regardless of company. See
-- database/migrations/context.md for the full history of both.

-- ---------------------------------------------------------------------------
-- 1. user_roles — extend in place. The 2 real accounts (waseem@bakers.co.za,
--    info@fuelink.co.za) become Admins; nothing about how they authenticate
--    changes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN full_name text,
  ADD COLUMN phone text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN created_by uuid,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.user_roles SET is_admin = true;

-- ---------------------------------------------------------------------------
-- 2. Helpers — current_user_role() (from 0003) now also requires is_active,
--    so deactivating a user immediately blocks every RLS policy that uses
--    it (routes/trucks/drivers UPDATE from 0003, transactions below) without
--    touching those policies individually. current_user_is_admin() is new.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND is_active;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(is_admin, false) FROM public.user_roles WHERE user_id = auth.uid() AND is_active;
$$;

-- ---------------------------------------------------------------------------
-- 3. user_roles RLS — SELECT stays open (unchanged production behaviour:
--    no RLS was ever enabled on this table, and both companies already read
--    each other's role for the shared ledger to make sense). UPDATE is new
--    and admin-only: prevents a non-admin from granting themselves is_admin
--    via a hand-crafted Supabase call, even though the app's own
--    UserController always writes through the service key, bypassing this.
-- ---------------------------------------------------------------------------
GRANT UPDATE (full_name, phone, is_active, is_admin) ON public.user_roles TO authenticated;

CREATE POLICY "update_user_roles_admin_only"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER audit_user_roles AFTER UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- ---------------------------------------------------------------------------
-- 4. user_permissions — the fine-grained catalog from the handoff design
--    (Section 4). No CHECK on `permission`: it's a free-text catalog that
--    grows with each module, documented in code, not enforced in the schema.
--    SELECT is scoped to your own rows (the frontend reads this directly to
--    decide what to show/hide, per ROADMAP_FRONTEND.md Section 4). No
--    INSERT/UPDATE/DELETE policy for any role: grant/revoke is privileged,
--    always via PermissionController with the service key — same pattern as
--    audit_log in 0003.
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_permissions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.user_roles(user_id),
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER audit_user_permissions AFTER UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- ---------------------------------------------------------------------------
-- 5. transactions — close the SELECT gap AND add the matching INSERT check.
--    Enabling RLS with only a SELECT policy would silently break every
--    existing INSERT (Add transaction, Void) the moment this runs, since
--    RLS with no INSERT policy denies by default. The INSERT check also
--    closes a real spoofing gap: today entered_by is just whatever value
--    the client sends — nothing stops a Fuellink session from inserting a
--    row claiming entered_by='bakers'. WITH CHECK ties it to the caller's
--    real, server-known company.
--
--    The UPDATE policy from 0003 is untouched — it already scopes to
--    entered_by = current_user_role(), so it starts being enforced (it
--    existed but had no effect while RLS was off) with no changes needed.
--
--    Cross-company reads (future Ledger de Compensação screen, Dashboard
--    Zona 2b Net Position) do NOT get a policy here — they need a separate
--    privileged path (SECURITY DEFINER view or PHP endpoint via the service
--    key), not a SELECT policy that would defeat the isolation this
--    migration exists to add. Not designed yet.
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_company_transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (entered_by = public.current_user_role());

CREATE POLICY "insert_own_company_transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (entered_by = public.current_user_role());
