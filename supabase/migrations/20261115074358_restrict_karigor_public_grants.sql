/*
# Restrict Karigor public table grants

1. Security correction
- Remove public UPDATE and DELETE table privileges from `users`, `tailors`, and `reviews`.
- Keep only SELECT and INSERT privileges for anon and authenticated roles, matching the intentionally public prototype flows.

2. Row-level policies
- Existing public SELECT and INSERT RLS policies remain unchanged.
- No application flow requires public updates or deletes.
*/

REVOKE UPDATE, DELETE ON public.users FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.tailors FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.reviews FROM anon, authenticated;