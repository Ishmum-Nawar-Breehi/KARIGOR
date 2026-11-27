/*
# Phase 3: Order Status Events, Demo Status Updates, and Seeded Demo Orders

1. New Tables
- `order_status_events`: Records every status change for every order.
  - id (uuid PK)
  - order_id (uuid FK -> orders ON DELETE CASCADE)
  - status_code (text NOT NULL)
  - changed_at (timestamptz NOT NULL DEFAULT now())
  - changed_by (text NOT NULL DEFAULT 'system')
  - note (text, nullable)

2. Modified Tables
- `orders.return_address`: ALTER from NOT NULL to NULLABLE so manual-measurement
  customers who choose shop collection are not forced to provide one. Existing
  values are preserved.

3. New Functions (SECURITY DEFINER)
- `update_order_status(p_order_id uuid, p_expected_status text, p_new_status text,
   p_changed_by text, p_note text)`: Atomically validates the requested
   transition, updates orders.order_status + orders.updated_at, and inserts a
   corresponding order_status_events row. Returns the updated order.

4. Backfill
- For every existing order that has no order_status_events row, insert one initial
  event with its current order_status and created_at timestamp. Idempotent.

5. Demo Orders
- Seeds 5 fictional demo orders (is_demo = true) spread across sample tailors.
  Idempotent via fixed UUIDs and ON CONFLICT DO NOTHING.

6. Security
- RLS enabled on order_status_events.
- GRANT SELECT, INSERT to anon, authenticated.
- No UPDATE/DELETE on events (immutable history).
- update_order_status RPC: REVOKE from PUBLIC/anon, GRANT to anon, authenticated.
- Index on (order_id, changed_at).
*/

-- 1. Make return_address nullable
ALTER TABLE public.orders ALTER COLUMN return_address DROP NOT NULL;

-- 2. Create order_status_events table
CREATE TABLE IF NOT EXISTS public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status_code text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text NOT NULL DEFAULT 'system',
  note text
);

CREATE INDEX IF NOT EXISTS order_status_events_order_id_changed_at_idx
  ON public.order_status_events(order_id, changed_at);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.order_status_events TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_order_status_events" ON public.order_status_events;
CREATE POLICY "public_read_order_status_events" ON public.order_status_events
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_order_status_events" ON public.order_status_events;
CREATE POLICY "public_insert_order_status_events" ON public.order_status_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. Backfill initial events for existing orders
INSERT INTO public.order_status_events (order_id, status_code, changed_at, changed_by)
SELECT o.id, o.order_status, o.created_at, 'system'
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_status_events e WHERE e.order_id = o.id
);

-- 4. update_order_status RPC
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid,
  p_expected_status text,
  p_new_status text,
  p_changed_by text DEFAULT 'tailor_demo',
  p_note text DEFAULT NULL
) RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_allowed text;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.order_status <> p_expected_status THEN
    RAISE EXCEPTION 'Stale update: current status is %, expected %',
      v_order.order_status, p_expected_status;
  END IF;

  IF v_order.order_status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Order is in terminal state %', v_order.order_status;
  END IF;

  IF p_new_status = 'cancelled' AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'Cancellation requires a reason note';
  END IF;

  v_allowed := CASE v_order.order_status
    WHEN 'pending_pickup' THEN 'fabric_in_transit,fabric_received,cancelled'
    WHEN 'fabric_in_transit' THEN 'fabric_received,cancelled'
    WHEN 'fabric_received' THEN 'stitching_in_progress,cancelled'
    WHEN 'pending_confirmation' THEN 'measurements_confirmed,cancelled'
    WHEN 'measurements_confirmed' THEN 'stitching_in_progress,cancelled'
    WHEN 'stitching_in_progress' THEN 'out_for_delivery'
    WHEN 'out_for_delivery' THEN 'completed'
    ELSE ''
  END;

  IF position(',' || p_new_status || ',' in ',' || v_allowed || ',') = 0 THEN
    RAISE EXCEPTION 'Invalid transition from % to %', v_order.order_status, p_new_status;
  END IF;

  UPDATE public.orders
    SET order_status = p_new_status, updated_at = now()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

  INSERT INTO public.order_status_events (order_id, status_code, changed_by, note)
    VALUES (p_order_id, p_new_status, p_changed_by, p_note);

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.update_order_status(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text, text, text, text) TO anon, authenticated;

-- 5. Demo customers (fixed UUIDs, idempotent)
INSERT INTO public.users (id, name, phone)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'Demo Customer Amina', '01000000011'),
  ('30000000-0000-4000-8000-000000000002', 'Demo Customer Karim', '01000000012'),
  ('30000000-0000-4000-8000-000000000003', 'Demo Customer Sara', '01000000013')
ON CONFLICT (id) DO NOTHING;

-- 6. Demo orders (idempotent via fixed UUIDs)
-- Order 1: tailor 001, Salwar Kameez (Full Set), sample mode, pending_pickup
INSERT INTO public.orders (
  id, order_reference, customer_id, tailor_id, service_rate_id, service_name,
  garment_price_bdt, turnaround_min_days, turnaround_max_days,
  measurement_mode, manual_measurements, fabric_arrangement,
  courier_provider, pickup_address, return_address,
  pickup_delivery_fee_bdt, return_delivery_fee_bdt,
  estimated_total_bdt, estimated_cod_on_return_bdt,
  order_status, customer_notes, fabric_shortage_resolution, is_demo, created_at, updated_at
)
SELECT
  '40000000-0000-4000-8000-000000000001', 'KRG-DEMO-0001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  tsr.id, 'Salwar Kameez (Full Set)', 850, 5, 7,
  'sample', NULL, NULL, 'pathao',
  'House 12, Road 5, Dhanmondi, Dhaka', 'House 12, Road 5, Dhanmondi, Dhaka',
  80, 80, 1010, 930, 'pending_pickup',
  'Please handle the fabric carefully.', 'send_additional_fabric',
  true, now() - interval '2 days', now() - interval '2 days'
FROM public.tailor_service_rates tsr
WHERE tsr.tailor_id = '10000000-0000-4000-8000-000000000001' AND tsr.service_name = 'Salwar Kameez (Full Set)'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Order 2: tailor 002, Panjabi, sample mode, fabric_in_transit
INSERT INTO public.orders (
  id, order_reference, customer_id, tailor_id, service_rate_id, service_name,
  garment_price_bdt, turnaround_min_days, turnaround_max_days,
  measurement_mode, manual_measurements, fabric_arrangement,
  courier_provider, pickup_address, return_address,
  pickup_delivery_fee_bdt, return_delivery_fee_bdt,
  estimated_total_bdt, estimated_cod_on_return_bdt,
  order_status, customer_notes, fabric_shortage_resolution, is_demo, created_at, updated_at
)
SELECT
  '40000000-0000-4000-8000-000000000002', 'KRG-DEMO-0002',
  '30000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  tsr.id, 'Panjabi', 650, 4, 6,
  'sample', NULL, NULL, 'steadfast',
  'Flat B3, Gulshan 2, Dhaka', 'Flat B3, Gulshan 2, Dhaka',
  90, 90, 830, 740, 'fabric_in_transit',
  NULL, 'contact_tailor',
  true, now() - interval '3 days', now() - interval '1 day'
FROM public.tailor_service_rates tsr
WHERE tsr.tailor_id = '10000000-0000-4000-8000-000000000002' AND tsr.service_name = 'Panjabi'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Order 3: tailor 005, Suit, manual mode, pending_confirmation
INSERT INTO public.orders (
  id, order_reference, customer_id, tailor_id, service_rate_id, service_name,
  garment_price_bdt, turnaround_min_days, turnaround_max_days,
  measurement_mode, manual_measurements, fabric_arrangement,
  courier_provider, pickup_address, return_address,
  pickup_delivery_fee_bdt, return_delivery_fee_bdt,
  estimated_total_bdt, estimated_cod_on_return_bdt,
  order_status, customer_notes, fabric_shortage_resolution, is_demo, created_at, updated_at
)
SELECT
  '40000000-0000-4000-8000-000000000003', 'KRG-DEMO-0003',
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000005',
  tsr.id, 'Suit', 2500, 10, 14,
  'manual',
  '{"unit":"inches","chest":40,"waist":34,"hip":40,"length":30,"shoulder":18,"sleeve":25,"notes":"Slim fit preferred"}'::jsonb,
  'ask_tailor', 'steadfast', NULL, 'House 45, Banani, Dhaka',
  0, 90, 2590, 2590, 'pending_confirmation',
  'Looking forward to the fitting.', 'tailor_adjust',
  true, now() - interval '1 day', now() - interval '1 day'
FROM public.tailor_service_rates tsr
WHERE tsr.tailor_id = '10000000-0000-4000-8000-000000000005' AND tsr.service_name = 'Suit'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Order 4: tailor 006, Shirt/Top Alteration, sample mode, stitching_in_progress
INSERT INTO public.orders (
  id, order_reference, customer_id, tailor_id, service_rate_id, service_name,
  garment_price_bdt, turnaround_min_days, turnaround_max_days,
  measurement_mode, manual_measurements, fabric_arrangement,
  courier_provider, pickup_address, return_address,
  pickup_delivery_fee_bdt, return_delivery_fee_bdt,
  estimated_total_bdt, estimated_cod_on_return_bdt,
  order_status, customer_notes, fabric_shortage_resolution, is_demo, created_at, updated_at
)
SELECT
  '40000000-0000-4000-8000-000000000004', 'KRG-DEMO-0004',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000006',
  tsr.id, 'Shirt/Top Alteration', 350, 2, 3,
  'sample', NULL, NULL, 'pathao',
  'Road 7, Mohammadpur, Dhaka', 'Road 7, Mohammadpur, Dhaka',
  80, 80, 510, 430, 'stitching_in_progress',
  'Needs to be ready by weekend.', 'tailor_adjust',
  true, now() - interval '5 days', now() - interval '12 hours'
FROM public.tailor_service_rates tsr
WHERE tsr.tailor_id = '10000000-0000-4000-8000-000000000006' AND tsr.service_name = 'Shirt/Top Alteration'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Order 5: tailor 003, Bridal / Lehenga, manual mode, measurements_confirmed
INSERT INTO public.orders (
  id, order_reference, customer_id, tailor_id, service_rate_id, service_name,
  garment_price_bdt, turnaround_min_days, turnaround_max_days,
  measurement_mode, manual_measurements, fabric_arrangement,
  courier_provider, pickup_address, return_address,
  pickup_delivery_fee_bdt, return_delivery_fee_bdt,
  estimated_total_bdt, estimated_cod_on_return_bdt,
  order_status, customer_notes, fabric_shortage_resolution, is_demo, created_at, updated_at
)
SELECT
  '40000000-0000-4000-8000-000000000005', 'KRG-DEMO-0005',
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000003',
  tsr.id, 'Bridal / Lehenga', 1200, 14, 21,
  'manual',
  '{"unit":"cm","chest":92,"waist":72,"hip":96,"length":110,"shoulder":40,"sleeve":58,"notes":"Bridal outfit with embellishments"}'::jsonb,
  'self_arrange', 'pathao', NULL, 'House 8, Bashundhara, Dhaka',
  0, 80, 1280, 1280, 'measurements_confirmed',
  'Please add gold embroidery as discussed.', 'send_additional_fabric',
  true, now() - interval '4 days', now() - interval '6 hours'
FROM public.tailor_service_rates tsr
WHERE tsr.tailor_id = '10000000-0000-4000-8000-000000000003' AND tsr.service_name = 'Bridal / Lehenga'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 7. Insert initial + progression status events for demo orders (idempotent)
INSERT INTO public.order_status_events (order_id, status_code, changed_at, changed_by)
SELECT o.id, o.order_status, o.created_at, 'system'
FROM public.orders o
WHERE o.is_demo = true
  AND NOT EXISTS (SELECT 1 FROM public.order_status_events e WHERE e.order_id = o.id);

-- Order 2: add fabric_in_transit event
INSERT INTO public.order_status_events (order_id, status_code, changed_at, changed_by)
SELECT '40000000-0000-4000-8000-000000000002', 'fabric_in_transit', now() - interval '1 day', 'tailor_demo'
WHERE EXISTS (SELECT 1 FROM public.orders WHERE id = '40000000-0000-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM public.order_status_events WHERE order_id = '40000000-0000-4000-8000-000000000002' AND status_code = 'fabric_in_transit');

-- Order 4: add progression events
INSERT INTO public.order_status_events (order_id, status_code, changed_at, changed_by)
SELECT '40000000-0000-4000-8000-000000000004', 'fabric_in_transit', now() - interval '4 days', 'tailor_demo'
WHERE EXISTS (SELECT 1 FROM public.orders WHERE id = '40000000-0000-4000-8000-000000000004')
  AND NOT EXISTS (SELECT 1 FROM public.order_status_events WHERE order_id = '40000000-0000-4000-8000-000000000004' AND status_code = 'fabric_in_transit');
INSERT INTO public.order_status_events (order_id, status_code, changed_at, changed_by)
SELECT '40000000-0000-4000-8000-000000000004', 'fabric_received', now() - interval '3 days', 'tailor_demo'
WHERE EXISTS (SELECT 1 FROM public.orders WHERE id = '40000000-0000-4000-8000-000000000004')
  AND NOT EXISTS (SELECT 1 FROM public.order_status_events WHERE order_id = '40000000-0000-4000-8000-000000000004' AND status_code = 'fabric_received');
INSERT INTO public.order_status_events (order_id, status_code, changed_at, changed_by)
SELECT '40000000-0000-4000-8000-000000000004', 'stitching_in_progress', now() - interval '12 hours', 'tailor_demo'
WHERE EXISTS (SELECT 1 FROM public.orders WHERE id = '40000000-0000-4000-8000-000000000004')
  AND NOT EXISTS (SELECT 1 FROM public.order_status_events WHERE order_id = '40000000-0000-4000-8000-000000000004' AND status_code = 'stitching_in_progress');

-- Order 5: add measurements_confirmed event
INSERT INTO public.order_status_events (order_id, status_code, changed_at, changed_by)
SELECT '40000000-0000-4000-8000-000000000005', 'measurements_confirmed', now() - interval '6 hours', 'tailor_demo'
WHERE EXISTS (SELECT 1 FROM public.orders WHERE id = '40000000-0000-4000-8000-000000000005')
  AND NOT EXISTS (SELECT 1 FROM public.order_status_events WHERE order_id = '40000000-0000-4000-8000-000000000005' AND status_code = 'measurements_confirmed');
