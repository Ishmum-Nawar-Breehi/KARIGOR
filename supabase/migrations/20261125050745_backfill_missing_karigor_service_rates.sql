/*
# Backfill missing service rates for existing shops

1. Scope
- Find existing tailor records whose service arrays do not yet have matching structured rate rows.
- Insert one illustrative estimated rate for each missing offered service.

2. Preservation
- No tailor, review, UUID, service array, or existing rate is deleted or overwritten.
- Existing rates are protected by the unique tailor/service constraint.
- Prices are derived from each shop's existing starting price and service specialty only when a rate is missing.

3. Compatibility
- This makes older user-created listings compatible with the new directory and profile pricing views.
- Automatically generated rows are labeled estimated and should be confirmed directly with the tailor.
*/

INSERT INTO public.tailor_service_rates (tailor_id, service_name, price_bdt, turnaround_min_days, turnaround_max_days, is_estimated)
SELECT
  t.id,
  offered.service_name,
  GREATEST(1, round(t.starting_price * CASE offered.service_name
    WHEN 'Alteration' THEN 0.85
    WHEN 'Blouse' THEN 1.10
    WHEN 'Panjabi' THEN 1.15
    WHEN 'Salwar Kameez' THEN 1.20
    WHEN 'Shirt & Pant' THEN 1.30
    WHEN 'Suit & Blazer' THEN 2.25
    WHEN 'Bridal/Lehenga' THEN 2.75
    ELSE 1.00
  END)::integer),
  CASE offered.service_name
    WHEN 'Alteration' THEN 1
    WHEN 'Blouse' THEN 3
    WHEN 'Panjabi' THEN 4
    WHEN 'Salwar Kameez' THEN 5
    WHEN 'Shirt & Pant' THEN 5
    WHEN 'Suit & Blazer' THEN 8
    WHEN 'Bridal/Lehenga' THEN 10
    ELSE 3
  END,
  CASE offered.service_name
    WHEN 'Alteration' THEN 3
    WHEN 'Blouse' THEN 5
    WHEN 'Panjabi' THEN 6
    WHEN 'Salwar Kameez' THEN 7
    WHEN 'Shirt & Pant' THEN 7
    WHEN 'Suit & Blazer' THEN 12
    WHEN 'Bridal/Lehenga' THEN 14
    ELSE 5
  END,
  true
FROM public.tailors t
CROSS JOIN LATERAL unnest(t.services) AS offered(service_name)
LEFT JOIN public.tailor_service_rates existing
  ON existing.tailor_id = t.id AND existing.service_name = offered.service_name
WHERE existing.id IS NULL
ON CONFLICT (tailor_id, service_name) DO NOTHING;