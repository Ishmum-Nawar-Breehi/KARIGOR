import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, RefreshCw, SearchX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatServicePrice } from '@/lib/formatting';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { COURIER_CONFIG } from '@/lib/orders';
import type { Order, OrderStatusCode } from '@/types/order';

type Props = {
  customer: { id: string; name: string } | null;
  onLoginRequest: () => void;
};

type OrderRow = Order & { tailors: { shop_name: string; area: string } | null };

export function MyOrdersPage({ customer, onLoginRequest }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!customer) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, tailors:tailor_id(shop_name, area)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    if (err) setError('We could not load your orders right now.');
    else setOrders((data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  }, [customer]);

  useEffect(() => { void load(); }, [load]);

  // Polling for auto-refresh when tab is visible
  useEffect(() => {
    if (!customer) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 12000);
    return () => window.clearInterval(interval);
  }, [customer, load]);

  if (!customer) return <main className="order-page"><div className="container empty-state"><Package size={36} /><h2>Log in to view your orders</h2><p>Use your name and phone number to see your placed orders.</p><button className="button button-primary" onClick={onLoginRequest}>Customer Login</button></div></main>;
  if (loading) return <main className="order-page"><div className="container empty-state"><div className="spinner" /><p>Loading your orders...</p></div></main>;
  if (error) return <main className="order-page"><div className="container empty-state"><SearchX /><h2>Something went wrong</h2><p>{error}</p><button className="button button-primary" onClick={() => void load()}>Retry</button></div></main>;

  return <main className="order-page">
    <div className="container">
      <div className="my-orders-header">
        <div><h1>My Orders</h1><p>Track your tailoring orders and their current status.</p></div>
        <button className="button button-outline" onClick={() => void load()}><RefreshCw size={15} />Refresh</button>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <Package size={36} />
          <h3>You haven't placed any orders yet.</h3>
          <Link className="button button-primary" to="/">Find Tailors <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="order-card-list">
          {orders.map((order) => (
            <article className="order-list-card" key={order.id}>
              <div className="order-list-ref">{order.order_reference}</div>
              <div className="order-list-body">
                <h3>{order.tailors?.shop_name ?? 'Unknown Tailor'}</h3>
                <p className="order-list-service">{order.service_name}</p>
                <div className="order-list-meta">
                  <span>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>Measurement: {order.measurement_mode === 'sample' ? 'Sample + Cloth' : 'Manual'}</span>
                  {order.courier_provider && <span>Courier: {COURIER_CONFIG[order.courier_provider]?.label ?? order.courier_provider}</span>}
                  <span>Estimated Total: {formatServicePrice(order.estimated_total_bdt)}</span>
                </div>
                <div className="order-list-status-row">
                  <span>Status: </span><OrderStatusBadge status={order.order_status as OrderStatusCode} />
                </div>
              </div>
              <Link className="button button-outline" to={`/order/${order.id}`}>View Details <ArrowRight size={15} /></Link>
            </article>
          ))}
        </div>
      )}
    </div>
  </main>;
}
