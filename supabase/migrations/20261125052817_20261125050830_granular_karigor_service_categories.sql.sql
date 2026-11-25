/*
# Granular service categories and alteration sub-options

1. Vocabulary Change
- Replaces the seven broad service labels with fifteen granular garment/service categories.
- Garments available separately and in sets: Salwar, Kameez, Salwar Kameez (Full Set), Suit, Blazer, Panjabi, Blouse, Shirt, Pant/Trouser, Bridal / Lehenga.
- Alteration is broken into specific sub-options: Dress Alteration, Shirt/Top Alteration, Pant/Trouser Hemming, Zipper/Stitching Repair, Size Fitting/Resizing.

2. Constraint Handling
- The old service_name CHECK constraint is dropped FIRST so existing rows can be renamed without being blocked.
- The new fifteen-value allowlist is added AFTER all data migration completes.

3. Data Migration
- Existing rate rows are renamed to the closest new label (e.g. "Salwar Kameez" → "Salwar Kameez (Full Set)", "Bridal/Lehenga" → "Bridal / Lehenga", "Alteration" → "Size Fitting/Resizing").
- Compound services "Suit & Blazer" and "Shirt & Pant" are split into separate "Suit"/"Blazer" and "Shirt"/"Pant/Trouser" rate rows with realistic individual prices.
- New granular rate rows (Salwar, Kameez, alteration variants) are inserted for seeded shops so every service in each shop's services array has its own structured rate.
- All tailor UUIDs, reviews, and the user-created shop are preserved. Only rate names, prices, and services arrays change.

4. Compatibility
- tailors.starting_price is recomputed from the minimum structured rate per shop.
- The register_tailor_with_rates RPC is unchanged (it does not validate service names; the table CHECK constraint enforces the allowlist).
- RLS policies and grants are unchanged.
*/

-- 1. Drop the old service_name CHECK constraint so rows can be renamed
ALTER TABLE public.tailor_service_rates DROP CONSTRAINT IF EXISTS tailor_service_rates_service_name_check;

-- 2. Global renames for simple 1:1 mappings (no price changes)
UPDATE public.tailor_service_rates SET service_name = 'Salwar Kameez (Full Set)' WHERE service_name = 'Salwar Kameez';
UPDATE public.tailor_service_rates SET service_name = 'Bridal / Lehenga' WHERE service_name = 'Bridal/Lehenga';
UPDATE public.tailor_service_rates SET service_name = 'Size Fitting/Resizing' WHERE service_name = 'Alteration';

-- 3. Split compound services per-tailor (rename to first component, adjust price)
UPDATE public.tailor_service_rates SET service_name = 'Suit'
  WHERE tailor_id = '10000000-0000-4000-8000-000000000004' AND service_name = 'Suit & Blazer';
UPDATE public.tailor_service_rates SET service_name = 'Suit'
  WHERE tailor_id = '10000000-0000-4000-8000-000000000005' AND service_name = 'Suit & Blazer';

UPDATE public.tailor_service_rates SET service_name = 'Shirt', price_bdt = 600
  WHERE tailor_id = '10000000-0000-4000-8000-000000000002' AND service_name = 'Shirt & Pant';
UPDATE public.tailor_service_rates SET service_name = 'Shirt', price_bdt = 650
  WHERE tailor_id = '10000000-0000-4000-8000-000000000004' AND service_name = 'Shirt & Pant';
UPDATE public.tailor_service_rates SET service_name = 'Shirt', price_bdt = 1000
  WHERE tailor_id = '10000000-0000-4000-8000-000000000005' AND service_name = 'Shirt & Pant';
UPDATE public.tailor_service_rates SET service_name = 'Shirt', price_bdt = 550
  WHERE tailor_id = '10000000-0000-4000-8000-000000000006' AND service_name = 'Shirt & Pant';
UPDATE public.tailor_service_rates SET service_name = 'Shirt', price_bdt = 800
  WHERE tailor_id = '10000000-0000-4000-8000-000000000008' AND service_name = 'Shirt & Pant';

-- 4. Insert new granular rate rows for seeded shops
INSERT INTO public.tailor_service_rates (tailor_id, service_name, price_bdt, turnaround_min_days, turnaround_max_days, is_estimated)
VALUES
  ('10000000-0000-4000-8000-000000000001','Salwar',350,3,5,true),
  ('10000000-0000-4000-8000-000000000001','Kameez',400,4,6,true),
  ('10000000-0000-4000-8000-000000000001','Dress Alteration',400,1,3,true),
  ('10000000-0000-4000-8000-000000000002','Pant/Trouser',450,3,5,true),
  ('10000000-0000-4000-8000-000000000002','Pant/Trouser Hemming',250,1,2,true),
  ('10000000-0000-4000-8000-000000000003','Salwar',700,4,6,true),
  ('10000000-0000-4000-8000-000000000003','Kameez',800,5,7,true),
  ('10000000-0000-4000-8000-000000000004','Pant/Trouser',500,3,5,true),
  ('10000000-0000-4000-8000-000000000004','Blazer',1800,7,10,true),
  ('10000000-0000-4000-8000-000000000005','Blazer',2000,7,10,true),
  ('10000000-0000-4000-8000-000000000005','Pant/Trouser',700,3,5,true),
  ('10000000-0000-4000-8000-000000000006','Shirt/Top Alteration',300,1,2,true),
  ('10000000-0000-4000-8000-000000000006','Pant/Trouser Hemming',250,1,2,true),
  ('10000000-0000-4000-8000-000000000006','Zipper/Stitching Repair',200,1,2,true),
  ('10000000-0000-4000-8000-000000000006','Size Fitting/Resizing',400,1,3,true),
  ('10000000-0000-4000-8000-000000000006','Pant/Trouser',400,3,5,true),
  ('10000000-0000-4000-8000-000000000007','Salwar',450,3,5,true),
  ('10000000-0000-4000-8000-000000000007','Kameez',550,4,6,true),
  ('10000000-0000-4000-8000-000000000008','Salwar',550,3,5,true),
  ('10000000-0000-4000-8000-000000000008','Kameez',650,4,6,true),
  ('10000000-0000-4000-8000-000000000008','Pant/Trouser',600,3,5,true),
  ('10000000-0000-4000-8000-000000000008','Dress Alteration',400,1,3,true)
ON CONFLICT (tailor_id, service_name) DO UPDATE SET
  price_bdt = EXCLUDED.price_bdt,
  turnaround_min_days = EXCLUDED.turnaround_min_days,
  turnaround_max_days = EXCLUDED.turnaround_max_days;

-- 5. Update seeded tailors' services arrays to the new granular vocabulary
UPDATE public.tailors SET services = ARRAY['Salwar Kameez (Full Set)','Salwar','Kameez','Blouse','Dress Alteration','Size Fitting/Resizing']
  WHERE id = '10000000-0000-4000-8000-000000000001';
UPDATE public.tailors SET services = ARRAY['Panjabi','Shirt','Pant/Trouser','Pant/Trouser Hemming','Size Fitting/Resizing']
  WHERE id = '10000000-0000-4000-8000-000000000002';
UPDATE public.tailors SET services = ARRAY['Bridal / Lehenga','Salwar Kameez (Full Set)','Salwar','Kameez','Blouse']
  WHERE id = '10000000-0000-4000-8000-000000000003';
UPDATE public.tailors SET services = ARRAY['Shirt','Pant/Trouser','Panjabi','Suit','Blazer']
  WHERE id = '10000000-0000-4000-8000-000000000004';
UPDATE public.tailors SET services = ARRAY['Suit','Blazer','Shirt','Pant/Trouser','Panjabi']
  WHERE id = '10000000-0000-4000-8000-000000000005';
UPDATE public.tailors SET services = ARRAY['Dress Alteration','Shirt/Top Alteration','Pant/Trouser Hemming','Zipper/Stitching Repair','Size Fitting/Resizing','Shirt','Blouse']
  WHERE id = '10000000-0000-4000-8000-000000000006';
UPDATE public.tailors SET services = ARRAY['Salwar Kameez (Full Set)','Salwar','Kameez','Blouse','Bridal / Lehenga']
  WHERE id = '10000000-0000-4000-8000-000000000007';
UPDATE public.tailors SET services = ARRAY['Panjabi','Salwar Kameez (Full Set)','Salwar','Kameez','Shirt','Pant/Trouser','Dress Alteration','Size Fitting/Resizing']
  WHERE id = '10000000-0000-4000-8000-000000000008';

-- 5b. Generic catch-all: rename any remaining old vocabulary in services arrays
UPDATE public.tailors
SET services = ARRAY(
  SELECT CASE
    WHEN s = 'Salwar Kameez' THEN 'Salwar Kameez (Full Set)'
    WHEN s = 'Bridal/Lehenga' THEN 'Bridal / Lehenga'
    WHEN s = 'Alteration' THEN 'Size Fitting/Resizing'
    WHEN s = 'Suit & Blazer' THEN 'Suit'
    WHEN s = 'Shirt & Pant' THEN 'Shirt'
    ELSE s
  END
  FROM unnest(services) AS s
)
WHERE services && ARRAY['Salwar Kameez','Bridal/Lehenga','Alteration','Suit & Blazer','Shirt & Pant'];

-- 6. Recompute starting_price from the minimum structured rate per shop
UPDATE public.tailors t
SET starting_price = rates.minimum_price
FROM (
  SELECT tailor_id, min(price_bdt) AS minimum_price
  FROM public.tailor_service_rates
  GROUP BY tailor_id
) rates
WHERE t.id = rates.tailor_id;

-- 7. Add the new granular service_name CHECK constraint after all rows are migrated
ALTER TABLE public.tailor_service_rates ADD CONSTRAINT tailor_service_rates_service_name_check
  CHECK (service_name IN (
    'Salwar','Kameez','Salwar Kameez (Full Set)','Suit','Blazer',
    'Panjabi','Blouse','Shirt','Pant/Trouser','Bridal / Lehenga',
    'Dress Alteration','Shirt/Top Alteration','Pant/Trouser Hemming',
    'Zipper/Stitching Repair','Size Fitting/Resizing'
  ));
