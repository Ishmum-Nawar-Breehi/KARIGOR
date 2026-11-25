import type { CourierProvider, FabricShortageResolution, OrderStatusCode } from '@/types/order';

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  pending_pickup: 'Pending Pickup',
  fabric_in_transit: 'Fabric In Transit',
  fabric_received: 'Fabric Received',
  pending_confirmation: 'Pending Confirmation',
  measurements_confirmed: 'Measurements Confirmed',
  stitching_in_progress: 'Stitching in Progress',
  fabric_short: 'Fabric Short',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_FLOW: OrderStatusCode[] = [
  'pending_pickup',
  'fabric_in_transit',
  'fabric_received',
  'pending_confirmation',
  'measurements_confirmed',
  'stitching_in_progress',
  'fabric_short',
  'out_for_delivery',
  'completed',
];

export function statusLabel(code: OrderStatusCode): string {
  return ORDER_STATUS_LABELS[code] ?? code;
}

export function statusBadgeClass(code: OrderStatusCode): string {
  if (code === 'completed') return 'order-status-badge completed';
  if (code === 'cancelled') return 'order-status-badge cancelled';
  if (code === 'out_for_delivery') return 'order-status-badge active';
  if (code === 'fabric_short') return 'order-status-badge cancelled';
  if (code === 'stitching_in_progress' || code === 'measurements_confirmed' || code === 'fabric_received')
    return 'order-status-badge progress';
  return 'order-status-badge pending';
}

export const COURIER_CONFIG: Record<
  CourierProvider,
  { label: string; outboundFee: number; returnFee: number; infoUrl: string }
> = {
  pathao: {
    label: 'Pathao Courier',
    outboundFee: 80,
    returnFee: 80,
    infoUrl: 'https://help.pathao.com/what-is-the-delivery-charge-inside-or-outside-the-city/',
  },
  steadfast: {
    label: 'Steadfast Courier',
    outboundFee: 90,
    returnFee: 90,
    infoUrl: 'https://steadfast.com.bd/pricing',
  },
};

export const FABRIC_SHORTAGE_LABELS: Record<FabricShortageResolution, string> = {
  send_additional_fabric: 'Customer sends additional fabric',
  contact_tailor: 'Customer contacts tailor',
  tailor_adjust: 'Tailor adjusts order details and price',
};

export function courierFee(provider: CourierProvider, direction: 'outbound' | 'return'): number {
  const config = COURIER_CONFIG[provider];
  return direction === 'outbound' ? config.outboundFee : config.returnFee;
}

export function calculateOrderTotal(garmentPrice: number, pickupFee: number, returnFee: number): number {
  return garmentPrice + pickupFee + returnFee;
}

export function calculateCodOnReturn(garmentPrice: number, returnFee: number): number {
  return garmentPrice + returnFee;
}
