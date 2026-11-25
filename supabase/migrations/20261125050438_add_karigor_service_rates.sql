/*
# Add structured Karigor service rates

1. New Table
- `tailor_service_rates` stores one price and estimated turnaround range per offered garment and tailor.
- `id` is a UUID primary key.
- `tailor_id` references the existing `tailors` record and cascades when a tailor is removed.
- `service_name`, `price_bdt`, `turnaround_min_days`, `turnaround_max_days`, `is_estimated`, `created_at`, and `updated_at` describe the rate.

2. Data Migration
- Existing tailor service arrays are converted into idempotent illustrative rate rows.
- Seed/demo rates are marked as estimates and use each shop's existing starting price as an anchor.
- Existing tailor UUIDs, reviews, service arrays, and other records are preserved.

3. Security
- RLS is enabled for the new public prototype table.
- Anonymous and authenticated visitors can read and insert rates; no update or delete privileges are granted.
- The public registration RPC validates and inserts a tailor with all of its rates atomically, using a fixed search path and no client-side service role key.

4. Compatibility
- The existing `tailors.starting_price` column remains in place.
- Registration derives it from the minimum submitted service rate.
- The existing array-based service column remains available for current filters and display compatibility.
*/

CREATE TABLE IF NOT EXISTS public.tailor_service_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  service_name text NOT NULL CHECK (service_name IN ('Panjabi', 'Salwar Kameez', 'Blouse', 'Suit & Blazer', 'Shirt & Pant', 'Alteration', 'Bridal/Lehenga')),
  price_bdt integer NOT NULL CHECK (price_bdt > 0),
  turnaround_min_days integer NOT NULL CHECK (turnaround_min_days >= 1),
  turnaround_max_days integer NOT NULL CHECK (turnaround_max_days >= turnaround_min_days),
  is_estimated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tailor_id, service_name)
);

CREATE INDEX IF NOT EXISTS tailor_service_rates_tailor_id_idx ON public.tailor_service_rates(tailor_id);
CREATE INDEX IF NOT EXISTS tailor_service_rates_service_name_idx ON public.tailor_service_rates(service_name);
CREATE INDEX IF NOT EXISTS tailor_service_rates_price_idx ON public.tailor_service_rates(price_bdt);

ALTER TABLE public.tailor_service_rates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.tailor_service_rates TO anon, authenticated;
DROP POLICY IF EXISTS "public_read_tailor_service_rates" ON public.tailor_service_rates;
CREATE POLICY "public_read_tailor_service_rates" ON public.tailor_service_rates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_tailor_service_rates" ON public.tailor_service_rates;
CREATE POLICY "public_insert_tailor_service_rates" ON public.tailor_service_rates FOR INSERT TO anon, authenticated WITH CHECK (true);

INSERT INTO public.tailor_service_rates (tailor_id, service_name, price_bdt, turnaround_min_days, turnaround_max_days, is_estimated)
VALUES
('10000000-0000-4000-8000-000000000001','Salwar Kameez',650,5,7,true),
('10000000-0000-4000-8000-000000000001','Blouse',450,3,4,true),
('10000000-0000-4000-8000-000000000001','Alteration',450,1,3,true),
('10000000-0000-4000-8000-000000000002','Panjabi',650,4,6,true),
('10000000-0000-4000-8000-000000000002','Shirt & Pant',850,5,7,true),
('10000000-0000-4000-8000-000000000002','Alteration',350,1,3,true),
('10000000-0000-4000-8000-000000000003','Bridal/Lehenga',2200,10,14,true),
('10000000-0000-4000-8000-000000000003','Salwar Kameez',1400,6,8,true),
('10000000-0000-4000-8000-000000000003','Blouse',1200,4,6,true),
('10000000-0000-4000-8000-000000000004','Shirt & Pant',850,5,7,true),
('10000000-0000-4000-8000-000000000004','Panjabi',950,4,6,true),
('10000000-0000-4000-8000-000000000004','Suit & Blazer',2200,8,12,true),
('10000000-0000-4000-8000-000000000005','Suit & Blazer',2500,8,12,true),
('10000000-0000-4000-8000-000000000005','Shirt & Pant',1500,5,7,true),
('10000000-0000-4000-8000-000000000005','Panjabi',1100,4,6,true),
('10000000-0000-4000-8000-000000000006','Alteration',350,1,3,true),
('10000000-0000-4000-8000-000000000006','Shirt & Pant',550,3,5,true),
('10000000-0000-4000-8000-000000000006','Blouse',450,2,4,true),
('10000000-0000-4000-8000-000000000007','Salwar Kameez',900,5,7,true),
('10000000-0000-4000-8000-000000000007','Blouse',750,3,5,true),
('10000000-0000-4000-8000-000000000007','Bridal/Lehenga',1800,9,13,true),
('10000000-0000-4000-8000-000000000008','Panjabi',950,4,6,true),
('10000000-0000-4000-8000-000000000008','Salwar Kameez',1100,5,7,true),
('10000000-0000-4000-8000-000000000008','Shirt & Pant',1250,5,7,true),
('10000000-0000-4000-8000-000000000008','Alteration',450,1,3,true)
ON CONFLICT (tailor_id, service_name) DO NOTHING;

UPDATE public.tailors t
SET starting_price = rates.minimum_price
FROM (
  SELECT tailor_id, min(price_bdt) AS minimum_price
  FROM public.tailor_service_rates
  GROUP BY tailor_id
) rates
WHERE t.id = rates.tailor_id;

CREATE OR REPLACE FUNCTION public.register_tailor_with_rates(
  p_shop_name text,
  p_owner_name text,
  p_area text,
  p_address text,
  p_phone text,
  p_category text,
  p_services text[],
  p_bio text,
  p_portfolio_images text[],
  p_rates jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tailor_id uuid;
  rate_count integer;
  service_count integer;
BEGIN
  service_count := cardinality(p_services);
  SELECT count(*)::integer INTO rate_count FROM jsonb_to_recordset(p_rates) AS rates(service_name text, price_bdt integer, turnaround_min_days integer, turnaround_max_days integer);
  IF service_count IS NULL OR service_count < 1 OR rate_count <> service_count THEN
    RAISE EXCEPTION 'Every selected service requires one rate';
  END IF;

  INSERT INTO public.tailors (shop_name, owner_name, area, address, phone, starting_price, services, category, bio, portfolio_images, rating, review_count, is_new)
  VALUES (
    trim(p_shop_name), trim(p_owner_name), trim(p_area), trim(p_address), p_phone,
    (SELECT min(rate.price_bdt) FROM jsonb_to_recordset(p_rates) AS rate(service_name text, price_bdt integer, turnaround_min_days integer, turnaround_max_days integer)),
    p_services, p_category, trim(p_bio), p_portfolio_images, 5.0, 0, true
  )
  RETURNING id INTO new_tailor_id;

  INSERT INTO public.tailor_service_rates (tailor_id, service_name, price_bdt, turnaround_min_days, turnaround_max_days, is_estimated)
  SELECT new_tailor_id, rate.service_name, rate.price_bdt, rate.turnaround_min_days, rate.turnaround_max_days, false
  FROM jsonb_to_recordset(p_rates) AS rate(service_name text, price_bdt integer, turnaround_min_days integer, turnaround_max_days integer);

  RETURN new_tailor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_tailor_with_rates(text, text, text, text, text, text, text[], text, text[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_tailor_with_rates(text, text, text, text, text, text, text[], text, text[], jsonb) TO anon, authenticated;