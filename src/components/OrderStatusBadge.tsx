import type { OrderStatusCode } from '@/types/order';
import { statusBadgeClass, statusLabel } from '@/lib/orders';

export function OrderStatusBadge({ status }: { status: OrderStatusCode }) {
  return <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>;
}
