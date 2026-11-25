import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Phone, RefreshCw, SearchX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatServicePrice } from '@/lib/formatting';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { COURIER_CONFIG, ORDER_STATUS_FLOW, statusLabel } from '@/lib/orders';
import { formatMeasurementValue } from '@/lib/measurements';
import type { Order, OrderStatusCode } from '@/types/order';

type OrderDetail = Order & { tailors: { shop_name: string; area: string; address: string; phone: string } | null };

export function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, tailors:tailor_id(shop_name, area, address, phone)')
      .eq('id', id)
      .maybeSingle();
    if (err || !data) { setError('Order not found.'); setLoading(false); return; }
    setOrder(data as unknown as OrderDetail);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <main className="order-page"><div className="container empty-state"><div className="spinner" /><p>Loading order details...</p></div></main>;
  if (error || !order) return <main className="order-page"><div className="container empty-state"><SearchX /><h2>Order not found</h2><p>{error || 'We could not find this order.'}</p><Link className="button button-primary" to="/my-orders">Back to My Orders</Link></div></main>;

  const tailor = order.tailors;
  const isSample = order.measurement_mode === 'sample';
  const courierLabel = order.courier_provider ? COURIER_CONFIG[order.courier_provider]?.label : 'Not selected';
  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.order_status as OrderStatusCode);

  return <main className="order-page">
    <div className="container">
      <button className="back-link" onClick={() => navigate('/my-orders')}><ArrowLeft size={16} />Back to My Orders</button>
      <div className="order-detail-header">
        <div><h1>{order.order_reference}</h1><p>Placed on {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
        <button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} />Refresh</button>
      </div>

      <div className="order-status-section">
        <h2>Order Progress</h2>
        <div className="order-progress">
          {ORDER_STATUS_FLOW.map((step, index) => {
            const isCurrent = step === order.order_status;
            const isPast = index < currentStepIndex;
            const isCancelled = order.order_status === 'cancelled';
            return (
              <div key={step} className={`progress-step ${isCurrent ? 'current' : ''} ${isPast && !isCancelled ? 'past' : ''} ${isCancelled && step !== order.order_status ? 'dimmed' : ''}`}>
                <span className="progress-dot" />
                <span className="progress-label">{statusLabel(step)}</span>
              </div>
            );
          })}
        </div>
        <div className="current-status-row"><span>Current Status: </span><OrderStatusBadge status={order.order_status as OrderStatusCode} /></div>
      </div>

      <div className="order-detail-grid">
        <section className="order-detail-card">
          <h3>Tailor Information</h3>
          {tailor ? (
            <>
              <p><strong>{tailor.shop_name}</strong></p>
              <p className="detail-line"><MapPin size={15} />{tailor.area} · {tailor.address}</p>
              <p className="detail-line"><Phone size={15} />{tailor.phone}</p>
              <Link className="button button-outline detail-link" to={`/tailor/${order.tailor_id}`}>View Tailor Profile <ArrowRight size={14} /></Link>
            </>
          ) : <p>Tailor information unavailable.</p>}
        </section>

        <section className="order-detail-card">
          <h3>Garment & Pricing</h3>
          <div className="detail-row"><span>Service</span><strong>{order.service_name}</strong></div>
          <div className="detail-row"><span>Tailoring Price (frozen)</span><strong>{formatServicePrice(order.garment_price_bdt)}</strong></div>
          <div className="detail-row"><span>Estimated Turnaround</span><strong>{order.turnaround_min_days}–{order.turnaround_max_days} days</strong></div>
          <div className="detail-row"><span>Outbound Delivery</span><strong>{formatServicePrice(order.pickup_delivery_fee_bdt)}</strong></div>
          <div className="detail-row"><span>Return Delivery</span><strong>{formatServicePrice(order.return_delivery_fee_bdt)}</strong></div>
          <div className="detail-row total"><span>Estimated Total</span><strong>{formatServicePrice(order.estimated_total_bdt)}</strong></div>
          {order.estimated_cod_on_return_bdt > 0 && <div className="detail-row"><span>Est. COD on Return</span><strong>{formatServicePrice(order.estimated_cod_on_return_bdt)}</strong></div>}
        </section>

        <section className="order-detail-card">
          <h3>Measurement & Delivery</h3>
          <div className="detail-row"><span>Method</span><strong>{isSample ? 'Sample + Cloth' : 'Manual Measurements'}</strong></div>
          <div className="detail-row"><span>Courier</span><strong>{courierLabel}</strong></div>
          {order.pickup_address && <div className="detail-row"><span>Pickup Address</span><strong>{order.pickup_address}</strong></div>}
          {order.return_address && <div className="detail-row"><span>Return Address</span><strong>{order.return_address}</strong></div>}
          {order.fabric_arrangement && <div className="detail-row"><span>Fabric Arrangement</span><strong>{order.fabric_arrangement === 'ask_tailor' ? 'Ask tailor about fabric' : 'Self-arranged'}</strong></div>}
        </section>

        {order.manual_measurements && (
          <section className="order-detail-card">
            <h3>Manual Measurements</h3>
            <div className="detail-row"><span>Unit</span><strong>{order.manual_measurements.unit === 'inches' ? 'Inches' : 'Centimeters'}</strong></div>
            {(['chest', 'waist', 'hip', 'length', 'shoulder', 'sleeve'] as const).map((key) => {
              const val = order.manual_measurements?.[key];
              if (val === null || val === undefined) return null;
              const labels: Record<string, string> = { chest: 'Chest', waist: 'Waist', hip: 'Hip', length: 'Length', shoulder: 'Shoulder', sleeve: 'Sleeve' };
              return <div className="detail-row" key={key}><span>{labels[key]}</span><strong>{formatMeasurementValue(val, order.manual_measurements!.unit)}</strong></div>;
            })}
            {order.manual_measurements.notes && <div className="detail-row"><span>Notes</span><strong>{order.manual_measurements.notes}</strong></div>}
          </section>
        )}

        {order.customer_notes && (
          <section className="order-detail-card span-two">
            <h3>Customer Notes</h3>
            <p>{order.customer_notes}</p>
          </section>
        )}
      </div>

      {order.is_demo && <p className="prototype-note">This is a demonstration order. No real courier booking, payment, or tailoring arrangement has been made.</p>}
    </div>
  </main>;
}
