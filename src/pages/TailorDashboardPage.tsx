import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, ClipboardList, CircleCheck, RefreshCw,
  Scissors, Search, SearchX, ShoppingBag, Store, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatServicePrice } from '@/lib/formatting';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { COURIER_CONFIG, FABRIC_SHORTAGE_LABELS, statusLabel } from '@/lib/orders';
import { formatMeasurementValue } from '@/lib/measurements';
import {
  STATUS_ACTIONS, canCancel, formatDhakaTime, isTerminal,
  type DashboardTab,
} from '@/lib/statusWorkflow';
import type { Order, OrderStatusCode, OrderStatusEvent } from '@/types/order';

type Tailor = {
  id: string; shop_name: string; owner_name: string; area: string;
  address: string; phone: string; category: string; bio: string;
  starting_price: number; services: string[]; portfolio_images: string[];
  rating: number; review_count: number;
};

type OrderRow = Order & { users: { name: string; phone: string } | null };

const DEMO_TAILOR_IDS = [
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000008',
];

export function TailorDashboardPage() {
  const [tailor, setTailor] = useState<Tailor | null>(null);
  const [allTailors, setAllTailors] = useState<Tailor[]>([]);
  const [entryMode, setEntryMode] = useState<'select' | 'phone' | 'demo'>('select');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneMatches, setPhoneMatches] = useState<Tailor[]>([]);
  const [demoTailorId, setDemoTailorId] = useState('');
  const [loadingTailors, setLoadingTailors] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('tailors').select('*').order('shop_name');
      setAllTailors((data ?? []) as Tailor[]);
      setLoadingTailors(false);
    })();
  }, []);

  const selectTailor = (t: Tailor) => {
    setTailor(t);
    setEntryMode('select');
    setPhoneInput('');
    setPhoneError('');
    setPhoneMatches([]);
  };

  const handlePhoneLookup = async () => {
    const phone = phoneInput.trim();
    if (!/^01[0-9]{9}$/.test(phone)) {
      setPhoneError('Please enter a valid 11-digit phone number starting with 01.');
      setPhoneMatches([]);
      return;
    }
    const { data } = await supabase.from('tailors').select('*').eq('phone', phone);
    if (!data || data.length === 0) {
      setPhoneError('No shop found with that phone number.');
      setPhoneMatches([]);
      return;
    }
    setPhoneError('');
    setPhoneMatches(data as Tailor[]);
  };

  const handleDemoSelect = () => {
    const found = allTailors.find((t) => t.id === demoTailorId);
    if (found) selectTailor(found);
  };

  if (!tailor) {
    return (
      <main className="dashboard-page">
        <div className="container">
          <div className="dashboard-entry">
            <h1>Welcome to Your Tailor Dashboard</h1>
            <p>View incoming orders and manage your tailoring work.</p>

            {entryMode === 'select' && (
              <div className="dashboard-entry-grid">
                <button className="dashboard-entry-card" onClick={() => setEntryMode('phone')}>
                  <Store size={28} />
                  <h3>Continue with Shop Phone</h3>
                  <p>Look up your shop by its registered phone number.</p>
                </button>
                <button className="dashboard-entry-card" onClick={() => setEntryMode('demo')}>
                  <Scissors size={28} />
                  <h3>Explore Demo Dashboard</h3>
                  <p>Select a sample tailor shop to explore the dashboard.</p>
                </button>
              </div>
            )}

            {entryMode === 'phone' && (
              <div className="dashboard-entry-panel">
                <h3>Continue with Shop Phone</h3>
                <p className="muted">Enter the phone number registered with your shop listing.</p>
                <label className="dashboard-field">
                  Registered Shop Phone Number
                  <input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                  />
                </label>
                {phoneError && <p className="form-error">{phoneError}</p>}
                <div className="dashboard-entry-actions">
                  <button className="button button-primary" onClick={handlePhoneLookup}>
                    <Search size={15} />Look Up Shop
                  </button>
                  <button className="button button-outline" onClick={() => setEntryMode('select')}>
                    <ArrowLeft size={15} />Back
                  </button>
                </div>
                {phoneMatches.length > 0 && (
                  <div className="phone-matches">
                    <p className="muted">Matching shops found — select one to continue:</p>
                    {phoneMatches.map((t) => (
                      <button key={t.id} className="phone-match-card" onClick={() => selectTailor(t)}>
                        <div><strong>{t.shop_name}</strong><span>{t.area} · {t.category}</span></div>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                )}
                <p className="prototype-note">
                  Phone lookup alone does not verify shop ownership. This is prototype access, not secure authentication.
                </p>
              </div>
            )}

            {entryMode === 'demo' && (
              <div className="dashboard-entry-panel">
                <h3>Explore Demo Dashboard</h3>
                <p className="muted">Select a seeded fictional tailor shop for university demonstration.</p>
                {loadingTailors ? (
                  <div className="spinner" />
                ) : (
                  <label className="dashboard-field">
                    Demo Shop
                    <select value={demoTailorId} onChange={(e) => setDemoTailorId(e.target.value)}>
                      <option value="">Select a shop...</option>
                      {allTailors.filter((t) => DEMO_TAILOR_IDS.includes(t.id)).map((t) => (
                        <option key={t.id} value={t.id}>{t.shop_name} — {t.area}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="dashboard-entry-actions">
                  <button className="button button-primary" disabled={!demoTailorId} onClick={handleDemoSelect}>
                    Open Dashboard <ArrowRight size={15} />
                  </button>
                  <button className="button button-outline" onClick={() => setEntryMode('select')}>
                    <ArrowLeft size={15} />Back
                  </button>
                </div>
                <p className="prototype-note">
                  Demo Mode — Shop selection is not verified authentication. Do not use for real customer data.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return <DashboardContent tailor={tailor} onSwitchShop={() => { setTailor(null); setEntryMode('select'); }} />;
}

function DashboardContent({ tailor, onSwitchShop }: { tailor: Tailor; onSwitchShop: () => void }) {
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [statusEvents, setStatusEvents] = useState<OrderStatusEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [updateDialog, setUpdateDialog] = useState<{ order: OrderRow; target: OrderStatusCode } | null>(null);
  const [cancelDialog, setCancelDialog] = useState<OrderRow | null>(null);
  const [updateNote, setUpdateNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'completed' | 'cancelled'>('all');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, users:customer_id(name, phone)')
      .eq('tailor_id', tailor.id)
      .order('created_at', { ascending: false });
    if (err) setError('We could not load orders right now.');
    else setOrders((data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  }, [tailor.id]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  // Polling for auto-refresh
  useEffect(() => {
    const interval = window.setInterval(() => { void loadOrders(); }, 12000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  const loadEvents = useCallback(async (orderId: string) => {
    setEventsLoading(true);
    const { data } = await supabase
      .from('order_status_events')
      .select('*')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true });
    setStatusEvents((data ?? []) as OrderStatusEvent[]);
    setEventsLoading(false);
  }, []);

  const openOrderDetails = (order: OrderRow) => {
    setSelectedOrder(order);
    void loadEvents(order.id);
  };

  const handleStatusUpdate = async () => {
    if (!updateDialog) return;
    setUpdating(true);
    setUpdateError('');
    const { order, target } = updateDialog;
    const { data, error: err } = await supabase.rpc('update_order_status', {
      p_order_id: order.id,
      p_expected_status: order.order_status,
      p_new_status: target,
      p_changed_by: 'tailor_demo',
      p_note: updateNote.trim() || null,
    });
    if (err) {
      const msg = err.message.includes('Stale update')
        ? 'This order was updated elsewhere. Please refresh and try again.'
        : err.message.includes('terminal')
          ? 'This order can no longer be updated.'
          : err.message.includes('Invalid transition')
            ? 'This status change is not allowed.'
            : 'Could not update the order status. Please try again.';
      setUpdateError(msg);
      setUpdating(false);
      return;
    }
    const updated = data as unknown as Order;
    setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o));
    if (selectedOrder?.id === updated.id) {
      setSelectedOrder({ ...selectedOrder, ...updated });
      void loadEvents(updated.id);
    }
    setUpdateDialog(null);
    setUpdateNote('');
    setUpdating(false);
  };

  const handleCancel = async () => {
    if (!cancelDialog) return;
    setUpdating(true);
    setUpdateError('');
    const { data, error: err } = await supabase.rpc('update_order_status', {
      p_order_id: cancelDialog.id,
      p_expected_status: cancelDialog.order_status,
      p_new_status: 'cancelled',
      p_changed_by: 'tailor_demo',
      p_note: updateNote.trim(),
    });
    if (err) {
      setUpdateError('Could not cancel the order. ' + (err.message.includes('Stale') ? 'Please refresh.' : 'Please try again.'));
      setUpdating(false);
      return;
    }
    const updated = data as unknown as Order;
    setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o));
    if (selectedOrder?.id === updated.id) {
      setSelectedOrder({ ...selectedOrder, ...updated });
      void loadEvents(updated.id);
    }
    setCancelDialog(null);
    setUpdateNote('');
    setUpdating(false);
  };

  const counts = useMemo(() => {
    const total = orders.length;
    const newCount = orders.filter((o) => o.order_status === 'pending_pickup' || o.order_status === 'pending_confirmation').length;
    const inProgress = orders.filter((o) =>
      ['fabric_in_transit', 'fabric_received', 'measurements_confirmed', 'stitching_in_progress'].includes(o.order_status)
    ).length;
    const completed = orders.filter((o) => o.order_status === 'completed').length;
    return { total, newCount, inProgress, completed };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'new') return orders.filter((o) => o.order_status === 'pending_pickup' || o.order_status === 'pending_confirmation');
    if (filter === 'in_progress') return orders.filter((o) => ['fabric_in_transit', 'fabric_received', 'measurements_confirmed', 'stitching_in_progress'].includes(o.order_status));
    if (filter === 'completed') return orders.filter((o) => o.order_status === 'completed');
    if (filter === 'cancelled') return orders.filter((o) => o.order_status === 'cancelled');
    return orders;
  }, [orders, filter]);

  return (
    <main className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <Link to="/" className="back-link"><ArrowLeft size={16} />Back to Site</Link>
            <h1>Manage Your Orders</h1>
            <p>Review customer requests and keep customers updated on their tailoring progress.</p>
          </div>
          <div className="dashboard-header-right">
            <div className="dashboard-shop-badge">
              <Store size={18} />
              <div><strong>{tailor.shop_name}</strong><span>{tailor.area}</span></div>
            </div>
            <button className="button button-outline" onClick={onSwitchShop}>Switch Shop</button>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button className={`dashboard-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
          <button className={`dashboard-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders</button>
          <button className={`dashboard-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Shop Profile</button>
        </div>

        {error && <div className="dashboard-error"><SearchX size={18} /><p>{error}</p><button className="button button-outline" onClick={() => void loadOrders()}>Retry</button></div>}

        {(tab === 'overview' || tab === 'orders') && (
          <div className="summary-cards">
            <div className="summary-card"><div className="summary-icon"><ShoppingBag size={22} /></div><div><span>Total Orders</span><strong>{counts.total}</strong></div></div>
            <div className="summary-card"><div className="summary-icon"><ClipboardList size={22} /></div><div><span>New Orders</span><strong>{counts.newCount}</strong></div></div>
            <div className="summary-card"><div className="summary-icon"><Scissors size={22} /></div><div><span>In Progress</span><strong>{counts.inProgress}</strong></div></div>
            <div className="summary-card"><div className="summary-icon"><CircleCheck size={22} /></div><div><span>Completed</span><strong>{counts.completed}</strong></div></div>
          </div>
        )}

        {tab === 'overview' && (
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>Recent Orders</h2>
              <button className="button button-outline" onClick={() => void loadOrders()}><RefreshCw size={15} />Refresh</button>
            </div>
            {loading ? <div className="spinner" /> : orders.length === 0 ? (
              <div className="empty-state"><ShoppingBag size={32} /><h3>No orders yet</h3><p>When customers place orders with your shop, they will appear here.</p></div>
            ) : (
              <div className="order-table-wrapper">
                <OrderTable orders={orders.slice(0, 5)} onView={openOrderDetails} />
              </div>
            )}
          </section>
        )}

        {tab === 'orders' && (
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2>All Orders</h2>
              <button className="button button-outline" onClick={() => void loadOrders()}><RefreshCw size={15} />Refresh</button>
            </div>
            <div className="filter-chips">
              {(['all', 'new', 'in_progress', 'completed', 'cancelled'] as const).map((f) => (
                <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All Orders' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {loading ? <div className="spinner" /> : filteredOrders.length === 0 ? (
              <div className="empty-state"><SearchX size={32} /><h3>No orders in this category</h3></div>
            ) : (
              <div className="order-table-wrapper">
                <OrderTable orders={filteredOrders} onView={openOrderDetails} />
              </div>
            )}
          </section>
        )}

        {tab === 'profile' && <ShopProfileTab tailor={tailor} />}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          events={statusEvents}
          eventsLoading={eventsLoading}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={(target) => { setUpdateDialog({ order: selectedOrder, target }); setUpdateNote(''); setUpdateError(''); }}
          onCancel={() => { setCancelDialog(selectedOrder); setUpdateNote(''); setUpdateError(''); }}
        />
      )}

      {updateDialog && (
        <ConfirmDialog
          title="Update Order Status"
          orderRef={updateDialog.order.order_reference}
          fromStatus={updateDialog.order.order_status}
          toStatus={updateDialog.target}
          note={updateNote}
          setNote={setUpdateNote}
          error={updateError}
          loading={updating}
          onConfirm={handleStatusUpdate}
          onCancel={() => { setUpdateDialog(null); setUpdateNote(''); setUpdateError(''); }}
        />
      )}

      {cancelDialog && (
        <ConfirmDialog
          title="Cancel Order"
          orderRef={cancelDialog.order_reference}
          fromStatus={cancelDialog.order_status}
          toStatus="cancelled"
          note={updateNote}
          setNote={setUpdateNote}
          error={updateError}
          loading={updating}
          onConfirm={handleCancel}
          onCancel={() => { setCancelDialog(null); setUpdateNote(''); setUpdateError(''); }}
          requireNote
        />
      )}
    </main>
  );
}

function OrderTable({ orders, onView }: { orders: OrderRow[]; onView: (o: OrderRow) => void }) {
  return (
    <table className="order-table">
      <thead>
        <tr>
          <th>Order Ref</th>
          <th>Customer</th>
          <th>Service</th>
          <th>Status</th>
          <th>Date</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} onClick={() => onView(o)} className="order-table-row">
            <td className="order-table-ref">{o.order_reference}</td>
            <td>{o.users?.name ?? 'Unknown'}</td>
            <td>{o.service_name}</td>
            <td><OrderStatusBadge status={o.order_status as OrderStatusCode} /></td>
            <td className="order-table-date">{new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            <td className="order-table-price">{formatServicePrice(o.estimated_total_bdt)}</td>
            <td><button className="button button-outline" onClick={(e) => { e.stopPropagation(); onView(o); }}>View <ArrowRight size={14} /></button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrderDetailsModal({
  order, events, eventsLoading, onClose, onStatusUpdate, onCancel,
}: {
  order: OrderRow; events: OrderStatusEvent[]; eventsLoading: boolean;
  onClose: () => void; onStatusUpdate: (target: OrderStatusCode) => void; onCancel: () => void;
}) {
  const isSample = order.measurement_mode === 'sample';
  const courierLabel = order.courier_provider ? COURIER_CONFIG[order.courier_provider]?.label : 'Not selected';
  const actions = STATUS_ACTIONS[order.order_status as OrderStatusCode] ?? [];
  const isDone = isTerminal(order.order_status as OrderStatusCode);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide dashboard-order-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose}><X /></button>
        <h2>{order.order_reference}</h2>
        <p className="modal-lead">Placed on {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>

        <div className="dashboard-order-grid">
          <section className="order-detail-card">
            <h3>Basic Information</h3>
            <div className="detail-row"><span>Customer</span><strong>{order.users?.name ?? 'Unknown'}</strong></div>
            <div className="detail-row"><span>Phone</span><strong>{order.users?.phone ?? 'N/A'}</strong></div>
            <div className="detail-row"><span>Service</span><strong>{order.service_name}</strong></div>
            <div className="detail-row"><span>Tailoring Price</span><strong>{formatServicePrice(order.garment_price_bdt)}</strong></div>
            <div className="detail-row"><span>Est. Turnaround</span><strong>{order.turnaround_min_days}–{order.turnaround_max_days} days</strong></div>
            <div className="detail-row"><span>Current Status</span><strong><OrderStatusBadge status={order.order_status as OrderStatusCode} /></strong></div>
            {order.fabric_shortage_resolution && <div className="detail-row"><span>Short Fabric Preference</span><strong>{FABRIC_SHORTAGE_LABELS[order.fabric_shortage_resolution] ?? order.fabric_shortage_resolution}</strong></div>}
          </section>

          <section className="order-detail-card">
            <h3>Measurement & Delivery</h3>
            <div className="detail-row"><span>Method</span><strong>{isSample ? 'Sample + Cloth' : 'Manual Measurements'}</strong></div>
            <div className="detail-row"><span>Courier</span><strong>{courierLabel}</strong></div>
            {order.pickup_address && <div className="detail-row"><span>Pickup Address</span><strong>{order.pickup_address}</strong></div>}
            {order.return_address && <div className="detail-row"><span>Return Address</span><strong>{order.return_address}</strong></div>}
            {order.fabric_arrangement && <div className="detail-row"><span>Fabric Arrangement</span><strong>{order.fabric_arrangement === 'ask_tailor' ? 'Ask tailor' : 'Self-arranged'}</strong></div>}
            {order.customer_notes && <div className="detail-row"><span>Customer Notes</span><strong>{order.customer_notes}</strong></div>}
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

          <section className="order-detail-card">
            <h3>Price Summary</h3>
            <div className="detail-row"><span>Tailoring Price</span><strong>{formatServicePrice(order.garment_price_bdt)}</strong></div>
            <div className="detail-row"><span>Outbound Delivery</span><strong>{formatServicePrice(order.pickup_delivery_fee_bdt)}</strong></div>
            <div className="detail-row"><span>Return Delivery</span><strong>{formatServicePrice(order.return_delivery_fee_bdt)}</strong></div>
            <div className="detail-row total"><span>Estimated Total</span><strong>{formatServicePrice(order.estimated_total_bdt)}</strong></div>
            {order.estimated_cod_on_return_bdt > 0 && <div className="detail-row"><span>Est. COD on Return</span><strong>{formatServicePrice(order.estimated_cod_on_return_bdt)}</strong></div>}
          </section>

          <section className="order-detail-card span-two">
            <h3>Status Management</h3>
            {isDone ? (
              <p className="dashboard-status-done">This order is <strong>{statusLabel(order.order_status as OrderStatusCode)}</strong> — no further actions available.</p>
            ) : (
              <div className="status-action-buttons">
                {actions.map((action) => (
                  <button key={action.target} className={`button ${action.variant === 'primary' ? 'button-primary' : 'button-outline'}`} onClick={() => onStatusUpdate(action.target)}>
                    {action.label}
                  </button>
                ))}
                {canCancel(order.order_status as OrderStatusCode) && (
                  <button className="button button-outline cancel-btn" onClick={onCancel}>Cancel Order</button>
                )}
              </div>
            )}
          </section>

          <section className="order-detail-card span-two">
            <h3>Order Activity</h3>
            {eventsLoading ? <div className="spinner" /> : events.length === 0 ? (
              <p className="muted">No status events recorded.</p>
            ) : (
              <div className="activity-timeline">
                {events.map((event) => (
                  <div className="activity-item" key={event.id}>
                    <span className="activity-dot" />
                    <div className="activity-content">
                      <strong>{statusLabel(event.status_code as OrderStatusCode)}</strong>
                      <span className="activity-time">{formatDhakaTime(event.changed_at)}</span>
                      {event.note && <p className="activity-note">{event.note}</p>}
                      <span className="activity-by">by {event.changed_by}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title, orderRef, fromStatus, toStatus, note, setNote, error, loading, onConfirm, onCancel, requireNote,
}: {
  title: string; orderRef: string; fromStatus: OrderStatusCode; toStatus: OrderStatusCode;
  note: string; setNote: (v: string) => void; error: string; loading: boolean;
  onConfirm: () => void; onCancel: () => void; requireNote?: boolean;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onCancel}><X /></button>
        <h2>{title}</h2>
        <div className="confirm-dialog-body">
          <div className="detail-row"><span>Order</span><strong>{orderRef}</strong></div>
          <div className="detail-row"><span>From</span><strong>{statusLabel(fromStatus)}</strong></div>
          <div className="detail-row"><span>To</span><strong>{statusLabel(toStatus)}</strong></div>
        </div>
        <label className="dashboard-field">
          {requireNote ? 'Cancellation Reason (required)' : 'Note (optional)'}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={requireNote ? 'Why is this order being cancelled?' : 'Add an optional note...'} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="dashboard-entry-actions">
          <button className="button button-primary" disabled={loading || (requireNote && !note.trim())} onClick={onConfirm}>
            {loading ? 'Updating...' : 'Confirm Update'}
          </button>
          <button className="button button-outline" onClick={onCancel} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ShopProfileTab({ tailor }: { tailor: Tailor }) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <h2>Shop Profile</h2>
        <Link className="button button-outline" to={`/tailor/${tailor.id}`}>View Public Profile <ArrowRight size={15} /></Link>
      </div>
      <div className="dashboard-profile-grid">
        <div className="order-detail-card">
          <h3>Shop Information</h3>
          <div className="detail-row"><span>Shop Name</span><strong>{tailor.shop_name}</strong></div>
          <div className="detail-row"><span>Owner</span><strong>{tailor.owner_name}</strong></div>
          <div className="detail-row"><span>Category</span><strong>{tailor.category}</strong></div>
          <div className="detail-row"><span>Area</span><strong>{tailor.area}</strong></div>
          <div className="detail-row"><span>Address</span><strong>{tailor.address}</strong></div>
          <div className="detail-row"><span>Phone</span><strong>{tailor.phone}</strong></div>
          <div className="detail-row"><span>Rating</span><strong>{tailor.rating.toFixed(1)} ({tailor.review_count} reviews)</strong></div>
        </div>
        <div className="order-detail-card">
          <h3>Services Offered</h3>
          <div className="profile-services">
            {tailor.services.map((s) => <span key={s}>{s}</span>)}
          </div>
          <div className="detail-row" style={{ marginTop: '16px' }}><span>Starting Price</span><strong>{formatServicePrice(tailor.starting_price)}</strong></div>
        </div>
        {tailor.bio && (
          <div className="order-detail-card span-two">
            <h3>About</h3>
            <p>{tailor.bio}</p>
          </div>
        )}
      </div>
    </section>
  );
}
