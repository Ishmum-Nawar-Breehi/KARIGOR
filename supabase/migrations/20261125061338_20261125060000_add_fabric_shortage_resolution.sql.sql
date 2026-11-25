/*
# Add fabric shortage resolution to orders

1. New Column
- `fabric_shortage_resolution` stores the customer's preferred resolution if the provided fabric is short for the garment.
- Values: 'send_additional_fabric', 'contact_tailor', 'tailor_adjust'.
- Nullable: only set when the customer selects a preference at order time; the tailor may update it in Phase 3.

2. New Status
- Adds `fabric_short` to the order_status CHECK constraint so the tailor dashboard can mark an order where the fabric is insufficient.
- This status sits outside the normal linear flow — it is a side-branch that returns to `stitching_in_progress` or another active status once resolved.

3. Updated RPC
- `place_order` gains a `p_fabric_shortage_resolution` parameter that is stored on insert.

4. Compatibility
- No existing columns are dropped or renamed.
- No existing orders are affected (the new column defaults to NULL).
- RLS policies and grants are unchanged.
*/

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fabric_shortage_resolution text
  CHECK (fabric_shortage_resolution IS NULL OR fabric_shortage_resolution IN ('send_additional_fabric', 'contact_tailor', 'tailor_adjust'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check CHECK (order_status IN (
  'pending_pickup','fabric_in_transit','fabric_received','pending_confirmation',
  'measurements_confirmed','stitching_in_progress','fabric_short',
  'out_for_delivery','completed','cancelled'
));

DROP FUNCTION IF EXISTS public.place_order(uuid, uuid, uuid, text, jsonb, text, text, text, text, integer, integer, text);

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
  p_customer_notes text,
  p_fabric_shortage_resolution text
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
    order_status, customer_notes, is_demo, fabric_shortage_resolution
  )
  VALUES (
    v_reference, p_customer_id, p_tailor_id, p_service_rate_id,
    v_rate.service_name, v_rate.price_bdt, v_rate.turnaround_min_days, v_rate.turnaround_max_days,
    p_measurement_mode, p_manual_measurements, p_fabric_arrangement,
    p_courier_provider, p_pickup_address, p_return_address,
    COALESCE(p_pickup_delivery_fee_bdt, 0), COALESCE(p_return_delivery_fee_bdt, 0),
    v_total, v_cod,
    v_status, p_customer_notes, true, p_fabric_shortage_resolution
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(uuid, uuid, uuid, text, jsonb, text, text, text, text, integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, uuid, uuid, text, jsonb, text, text, text, text, integer, integer, text, text) TO anon, authenticated;
