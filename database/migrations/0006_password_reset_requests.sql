-- Run manually in the Supabase SQL editor for this project, after 0005.
-- "Forgot password" is deliberately NOT self-service (overrides the
-- 16/08/2026 decision in docs/API_CONTRACT.md Section 1, at the user's
-- explicit request 2026-08-24): the account holder can't reset their own
-- password directly. Instead POST /api/forgot-password logs a pending
-- request here for an admin to review and action manually — "desta forma
-- sempre haverá conhecimento sobre quem tenta aceder à conta." No email
-- server is configured yet, so there is no automated notification step
-- yet either — an admin checks this table directly via Supabase (RLS
-- below already scopes SELECT to admins) until that's built.

CREATE TABLE public.password_reset_requests (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Same append-only-except-service pattern as audit_log/user_permissions:
-- no INSERT/UPDATE/DELETE policy for anyone — every write goes through
-- PHP with the service key (POST /api/forgot-password inserts; a future
-- "mark resolved" action would also be service-mode, not built yet).
CREATE POLICY "select_password_reset_requests_admin_only"
ON public.password_reset_requests
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());
