export type OrderStatusCode =
  | 'pending_pickup'
  | 'fabric_in_transit'
  | 'fabric_received'
  | 'pending_confirmation'
  | 'measurements_confirmed'
  | 'stitching_in_progress'
  | 'fabric_short'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type FabricShortageResolution = 'send_additional_fabric' | 'contact_tailor' | 'tailor_adjust';

export type MeasurementMode = 'sample' | 'manual';

export type CourierProvider = 'pathao' | 'steadfast';

export type MeasurementUnit = 'inches' | 'cm';

export type ManualMeasurements = {
  unit: MeasurementUnit;
  chest?: number | null;
  waist?: number | null;
  hip?: number | null;
  length?: number | null;
  shoulder?: number | null;
  sleeve?: number | null;
  notes?: string | null;
};

export type Order = {
  id: string;
  order_reference: string;
  customer_id: string;
  tailor_id: string;
  service_rate_id: string | null;
  service_name: string;
  garment_price_bdt: number;
  turnaround_min_days: number | null;
  turnaround_max_days: number | null;
  measurement_mode: MeasurementMode;
  manual_measurements: ManualMeasurements | null;
  fabric_arrangement: string | null;
  courier_provider: CourierProvider | null;
  pickup_address: string | null;
  return_address: string | null;
  pickup_delivery_fee_bdt: number;
  return_delivery_fee_bdt: number;
  estimated_total_bdt: number;
  estimated_cod_on_return_bdt: number;
  order_status: OrderStatusCode;
  customer_notes: string | null;
  fabric_shortage_resolution: FabricShortageResolution | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderWithTailor = Order & {
  tailor?: { shop_name: string; area: string; phone: string; address: string };
};
