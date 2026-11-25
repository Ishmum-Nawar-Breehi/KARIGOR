/*
# Restrict structured service-rate grants

1. Security correction
- Remove public UPDATE and DELETE privileges from `tailor_service_rates`.
- Keep only SELECT and INSERT for anonymous and authenticated prototype visitors.

2. Existing behavior
- Public read access remains available for directory and profile pricing.
- Registration continues to create rates through the validated atomic RPC.
*/

REVOKE UPDATE, DELETE ON public.tailor_service_rates FROM anon, authenticated;