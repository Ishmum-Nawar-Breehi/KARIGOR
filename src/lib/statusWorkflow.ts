import type { OrderStatusCode, MeasurementMode } from '@/types/order';

export type OrderStatusEvent = {
  id: string;
  order_id: string;
  status_code: OrderStatusCode;
  changed_at: string;
  changed_by: string;
  note: string | null;
};

export const SAMPLE_WORKFLOW: OrderStatusCode[] = [
  'pending_pickup',
  'fabric_in_transit',
  'fabric_received',
  'stitching_in_progress',
  'out_for_delivery',
  'completed',
];

export const MANUAL_WORKFLOW: OrderStatusCode[] = [
  'pending_confirmation',
  'measurements_confirmed',
  'stitching_in_progress',
  'out_for_delivery',
  'completed',
];

export function workflowFor(mode: MeasurementMode): OrderStatusCode[] {
  return mode === 'sample' ? SAMPLE_WORKFLOW : MANUAL_WORKFLOW;
}

export const STATUS_MESSAGES: Record<OrderStatusCode, string> = {
  pending_pickup: 'Your order is saved. Coordinate with the tailor to arrange fabric pickup.',
  fabric_in_transit: 'Your fabric has been marked as in transit to the tailor.',
  fabric_received: 'The tailor has confirmed receiving your fabric.',
  pending_confirmation: 'Your tailor needs to confirm your measurements and fabric arrangement.',
  measurements_confirmed: 'Your measurements have been confirmed by the tailor.',
  stitching_in_progress: 'Your tailor has started working on your garment.',
  fabric_short: 'The provided fabric was insufficient. Please check the resolution preference.',
  out_for_delivery: 'Your tailor has marked the completed garment as dispatched for delivery.',
  completed: 'Your tailoring order has been marked as completed.',
  cancelled: 'This order has been cancelled. Contact the tailor for further details.',
};

export type StatusTransition = {
  label: string;
  target: OrderStatusCode;
  variant: 'primary' | 'outline';
};

export const STATUS_ACTIONS: Record<OrderStatusCode, StatusTransition[]> = {
  pending_pickup: [
    { label: 'Mark Fabric In Transit', target: 'fabric_in_transit', variant: 'primary' },
    { label: 'Confirm Fabric Received', target: 'fabric_received', variant: 'outline' },
  ],
  fabric_in_transit: [
    { label: 'Confirm Fabric Received', target: 'fabric_received', variant: 'primary' },
  ],
  fabric_received: [
    { label: 'Start Stitching', target: 'stitching_in_progress', variant: 'primary' },
  ],
  pending_confirmation: [
    { label: 'Confirm Measurements', target: 'measurements_confirmed', variant: 'primary' },
  ],
  measurements_confirmed: [
    { label: 'Start Stitching', target: 'stitching_in_progress', variant: 'primary' },
  ],
  stitching_in_progress: [
    { label: 'Mark Out for Delivery', target: 'out_for_delivery', variant: 'primary' },
  ],
  out_for_delivery: [
    { label: 'Mark Completed', target: 'completed', variant: 'primary' },
  ],
  completed: [],
  cancelled: [],
  fabric_short: [],
};

export const CANCELLABLE_STATUSES: OrderStatusCode[] = [
  'pending_pickup',
  'fabric_in_transit',
  'fabric_received',
  'pending_confirmation',
  'measurements_confirmed',
];

export function canCancel(status: OrderStatusCode): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export function isTerminal(status: OrderStatusCode): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function formatDhakaTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export type DashboardTab = 'overview' | 'orders' | 'profile';
