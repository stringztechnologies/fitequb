-- Keep trigger function name resolution deterministic in production.
-- These functions do not query application tables, so pg_catalog is sufficient.
ALTER FUNCTION public.pilot_reject_ledger_change() SET search_path = pg_catalog;
ALTER FUNCTION public.pilot_receipt_guard() SET search_path = pg_catalog;
ALTER FUNCTION public.pilot_enrollment_guard() SET search_path = pg_catalog;
