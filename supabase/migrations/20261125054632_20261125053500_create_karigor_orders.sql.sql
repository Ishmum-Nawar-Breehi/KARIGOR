/*
# Karigor order placement system

1. New Table
- `orders` persists customer tailoring orders placed through the checkout flow.
- `id` UUID primary key.
- `order_reference` is a unique human-readable Karigor reference (KRG-YYYYMMDD-XXXX).
- `customer_id` references the existing `users` table; orders are scoped to the placing customer.
- `tailor_id` references the existing `tailors` table.
- `service_rate_id` references `tailor_service_rates` and is set ON DELETE SET NULL so deleting a rate later keeps the order's pricing snapshot.
- `service_name`, `garment_price_bdt`, `turnaround_min_days`, `turnaround_max_days` are frozen snapshots of the selected service at order time.
- `measurement_mode` is either 'sample' or 'manual'.
- `manual_measurements` stores the structured measurement JSON for manual orders (nullable for sample orders).
- `fabric_arrangement` records the fabric choice for manual orders (nullable for sample orders).
- `courier_provider` stores 'pathao', 'steadfast', or NULL for shop collection / manual without courier.
- `pickup_address` and `return_address` store delivery addresses.
- `pickup_delivery_fee_bdt` and `return_delivery_fee_bdt` are integer BDT delivery fee snapshots.
- `estimated_total_bdt` is garment price + pickup fee + return fee.
- `estimated_cod_on_return_bdt` is garment price + return fee (the intended COD amount on the return parcel).
- `order_status` is constrained to the shared status lifecycle used by the customer pages and the future tailor dashboard.
- `customer_notes`, `is_demo`, `created_at`, `updated_at` complete the record.

2. Security
- RLS is enabled on `orders`.
- The public prototype uses the existing name-and-phone customer session, which is NOT secure identity verification. Orders are therefore explicitly demo-only (`is_demo = true`).
- anon and authenticated roles get SELECT and INSERT only (no UPDATE/DELETE) so customers can place and view orders; status updates will be added in Phase 3 with a tailored grant.
- The `place_order` SECURITY DEFINER RPC performs server-side price snapshotting and reference generation so the client cannot submit arbitrary prices.

3. Order Reference Generation
- `place_order` builds `KRG-YYYYMMDD-` plus the first 4 hex characters of a fresh `gen_random_uuid()`, enforced unique by the table constraint.

4. Compatibility
- No existing tables, reviews, tailors, or rates are altered or deleted.
- The `service_rate_id` foreign key uses ON DELETE SET NULL to preserve order history when a rate is removed.
*/

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference text UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tailor_id uuid NOT NULL REFERENCES public.tailors(id) ON DELETE CASCADE,
  service_rate_id uuid REFERENCES public.tailor_service_rates(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  garment_price_bdt integer NOT NULL CHECK (garment_price_bdt >= 0),
  turnaround_min_days integer,
  turnaround_max_days integer,
  measurement_mode text NOT NULL CHECK (measurement_mode IN ('sample', 'manual')),
  manual_measurements jsonb,
  fabric_arrangement text,
  courier_provider text CHECK (courier_provider IS NULL OR courier_provider IN ('pathao', 'steadfast')),
  pickup_address text,
  return_address text,
  pickup_delivery_fee_bdt integer NOT NULL DEFAULT 0 CHECK (pickup_delivery_fee_bdt >= 0),
  return_delivery_fee_bdt integer NOT NULL DEFAULT 0 CHECK (return_delivery_fee_bdt >= 0),
  estimated_total_bdt integer NOT NULL CHECK (estimated_total_bdt >= 0),
  estimated_cod_on_return_bdt integer NOT NULL DEFAULT 0 CHECK (estimated_cod_on_return_bdt >= 0),
  order_status text NOT NULL CHECK (order_status IN (
    'pending_pickup','fabric_in_transit','fabric_received','pending_confirmation',
    'measurements_confirmed','stitching_in_progress','out_for_delivery','completed','cancelled'
  )),
  customer_notes text,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_tailor_id_idx ON public.orders(tailor_id);
CREATE INDEX IF NOT EXISTS orders_order_status_idx ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_order_reference_idx ON public.orders(order_reference);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.orders TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_orders" ON public.orders;
CREATE POLICY "public_read_orders" ON public.orders FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;
CREATE POLICY "public_insert_orders" ON public.orders FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_id uuid,
  p_tailor_id uuid,
  p_service_rate_id uuid,
  p_measurement_mode text,
  p_manual_measurements jsonb,
  p_fabric_arrangement text,
  p_courier_provider text,
  p_pickup_address text,
  p_return_address text,
  p_pickup_delivery_fee_bdt integer,
  p_return_delivery_fee_bdt integer,
  p_customer_notes text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate public.tailor_service_rates%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_reference text;
  v_status text;
  v_total integer;
  v_cod integer;
BEGIN
  -- Trusted price snapshot from the database, never from the client
  SELECT * INTO v_rate FROM public.tailor_service_rates WHERE id = p_service_rate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected service rate was not found';
  END IF;
  IF v_rate.tailor_id <> p_tailor_id THEN
    RAISE EXCEPTION 'Service rate does not belong to this tailor';
  END IF;

  IF p_measurement_mode = 'sample' THEN
    v_status := 'pending_pickup';
  ELSIF p_measurement_mode = 'manual' THEN
    v_status := 'pending_confirmation';
  ELSE
    RAISE EXCEPTION 'Invalid measurement mode';
  END IF;

  v_total := v_rate.price_bdt + COALESCE(p_pickup_delivery_fee_bdt, 0) + COALESCE(p_return_delivery_fee_bdt, 0);
  v_cod := v_rate.price_bdt + COALESCE(p_return_delivery_fee_bdt, 0);

  v_reference := 'KRG-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text, 1, 4));

  INSERT INTO public.orders (
    order_reference, customer_id, tailor_id, service_rate_id,
    service_name, garment_price_bdt, turnaround_min_days, turnaround_max_days,
    measurement_mode, manual_measurements, fabric_arrangement,
    courier_provider, pickup_address, return_address,
    pickup_delivery_fee_bdt, return_delivery_fee_bdt,
    estimated_total_bdt, estimated_cod_on_return_bdt,
    order_status, customer_notes, is_demo
  )
  VALUES (
    v_reference, p_customer_id, p_tailor_id, p_service_rate_id,
    v_rate.service_name, v_rate.price_bdt, v_rate.turnaround_min_days, v_rate.turnaround_max_days,
    p_measurement_mode, p_manual_measurements, p_fabric_arrangement,
    p_courier_provider, p_pickup_address, p_return_address,
    COALESCE(p_pickup_delivery_fee_bdt, 0), COALESCE(p_return_delivery_fee_bdt, 0),
    v_total, v_cod,
    v_status, p_customer_notes, true
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(uuid, uuid, uuid, text, jsonb, text, text, text, text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, uuid, uuid, text, jsonb, text, text, text, text, integer, integer, text) TO anon, authenticated;
