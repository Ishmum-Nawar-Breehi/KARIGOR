import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CircleCheck, SearchX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatServicePrice } from '@/lib/formatting';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { COURIER_CONFIG } from '@/lib/orders';
import type { Order, OrderStatusCode } from '@/types/order';

export function OrderConfirmationPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [tailorName, setTailorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      const [orderRes, tailorRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).maybeSingle(),
        supabase.from('orders').select('tailor_id').eq('id', id).maybeSingle(),
      ]);
      if (orderRes.error || !orderRes.data) { setError('Order not found.'); setLoading(false); return; }
      const ord = orderRes.data as Order;
      setOrder(ord);
      if (ord.tailor_id) {
        const t = await supabase.from('tailors').select('shop_name').eq('id', ord.tailor_id).maybeSingle();
        if (t.data) setTailorName(t.data.shop_name);
      }
      void tailorRes;
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main className="order-page"><div className="container empty-state"><div className="spinner" /><p>Loading your order confirmation...</p></div></main>;
  if (error || !order) return <main className="order-page"><div className="container empty-state"><SearchX /><h2>Order not found</h2><p>{error || 'We could not find this order.'}</p><Link className="button button-primary" to="/">Back to Tailors</Link></div></main>;

  const courierLabel = order.courier_provider ? COURIER_CONFIG[order.courier_provider]?.label : null;
  const isSample = order.measurement_mode === 'sample';

  return <main className="order-page">
    <div className="container confirmation-page">
      <div className="confirmation-hero">
        <CircleCheck size={48} />
        <h1>Your Order Has Been Placed!</h1>
        <p>Your tailoring order has been saved successfully.</p>
      </div>
      <div className="confirmation-details">
        <div className="confirmation-ref">
          <span>Karigor Order Reference</span>
          <strong>{order.order_reference}</strong>
        </div>
        <div className="confirmation-grid">
          <div><span>Tailor</span><strong>{tailorName}</strong></div>
          <div><span>Garment / Service</span><strong>{order.service_name}</strong></div>
          <div><span>Estimated Total</span><strong>{formatServicePrice(order.estimated_total_bdt)}</strong></div>
          <div><span>Measurement Method</span><strong>{isSample ? 'Sample + Cloth' : 'Manual Measurements'}</strong></div>
          {courierLabel && <div><span>Selected Courier</span><strong>{courierLabel}</strong></div>}
          <div><span>Order Status</span><strong><OrderStatusBadge status={order.order_status as OrderStatusCode} /></strong></div>
          <div><span>Date Placed</span><strong>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
        </div>
      </div>
      <div className="confirmation-next-step">
        {isSample
          ? 'Next Step: Coordinate with the tailor to arrange the sample and fabric shipment.'
          : 'Next Step: Wait for the tailor to confirm your measurements and fabric arrangement.'}
      </div>
      <div className="confirmation-actions">
        <Link className="button button-primary" to="/my-orders">View My Orders <ArrowRight size={16} /></Link>
        <Link className="button button-outline" to="/">Back to Tailors</Link>
      </div>
    </div>
  </main>;
}
