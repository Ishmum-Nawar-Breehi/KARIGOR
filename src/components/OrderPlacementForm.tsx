import { useState, type FormEvent } from 'react';
import { ArrowRight, Banknote, Info, Package, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatServicePrice } from '@/lib/formatting';
import type { CourierProvider, FabricShortageResolution, ManualMeasurements, MeasurementMode } from '@/types/order';
import type { TailorServiceRate } from '@/types/service';
import { courierFee, FABRIC_SHORTAGE_LABELS } from '@/lib/orders';
import { getMeasurementFields } from '@/lib/measurements';
import { CourierSelector } from '@/components/CourierSelector';
import { OrderPriceSummary } from '@/components/OrderPriceSummary';

type PaymentMethod = 'cod' | 'bkash' | 'nagad';

type Props = {
  tailorId: string;
  tailorName: string;
  rate: TailorServiceRate;
  customerId: string;
  customerName: string;
  customerPhone: string;
  initialMode: MeasurementMode;
  initialMeasurements: ManualMeasurements;
  initialFabricShortage: FabricShortageResolution;
  initialFabricArrangement: string | null;
  onLoginRequest: () => void;
  onSuccess: (orderId: string) => void;
};

const ALTERATION_SERVICES = new Set([
  'Dress Alteration', 'Shirt/Top Alteration', 'Pant/Trouser Hemming',
  'Zipper/Stitching Repair', 'Size Fitting/Resizing',
]);

export function OrderPlacementForm({
  tailorId, tailorName, rate, customerId, customerName, customerPhone,
  initialMode, initialMeasurements, initialFabricShortage, initialFabricArrangement,
  onLoginRequest, onSuccess,
}: Props) {
  const [mode] = useState<MeasurementMode>(initialMode);
  const [measurements] = useState<ManualMeasurements>(initialMeasurements);
  const [fabricShortage] = useState<FabricShortageResolution>(initialFabricShortage);
  const [fabricArrangement] = useState<string | null>(initialFabricArrangement);
  const [name, setName] = useState(customerName);
  const [phone, setPhone] = useState(customerPhone);
  const [pickupAddress, setPickupAddress] = useState('');
  const [returnSame, setReturnSame] = useState(true);
  const [returnAddress, setReturnAddress] = useState('');
  const [courier, setCourier] = useState<CourierProvider>('pathao');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isAlteration = ALTERATION_SERVICES.has(rate.service_name);
  const pickupFee = courierFee(courier, 'outbound');
  const returnFee = courierFee(courier, 'return');
  const total = rate.price_bdt + pickupFee + returnFee;
  const measurementFields = mode === 'manual' ? getMeasurementFields(rate.service_name) : [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customerId) { onLoginRequest(); return; }
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    if (!/^01[0-9]{9}$/.test(phone.trim())) return setError('Please enter a valid 11-digit phone number starting with 01.');
    if (!pickupAddress.trim()) return setError('Please provide a pickup address.');
    if (!courier) return setError('Please select a courier.');
    const finalReturnAddress = returnSame ? pickupAddress : returnAddress;
    if (!finalReturnAddress.trim()) return setError('Please provide a return address.');
    setSaving(true);
    const result = await supabase.rpc('place_order', {
      p_customer_id: customerId,
      p_tailor_id: tailorId,
      p_service_rate_id: rate.id,
      p_measurement_mode: mode,
      p_manual_measurements: mode === 'manual' ? measurements : null,
      p_fabric_arrangement: mode === 'manual' ? fabricArrangement : null,
      p_courier_provider: courier,
      p_pickup_address: pickupAddress.trim(),
      p_return_address: finalReturnAddress.trim(),
      p_pickup_delivery_fee_bdt: pickupFee,
      p_return_delivery_fee_bdt: returnFee,
      p_customer_notes: notes.trim() || null,
      p_fabric_shortage_resolution: fabricShortage,
    });
    if (result.error || !result.data) {
      setError('We could not place your order. Please try again.');
      setSaving(false);
      return;
    }
    onSuccess(result.data.id);
  };

  return (
    <form onSubmit={submit} className="order-placement-form">
      <div className="order-header">
        <p className="eyebrow">Checkout — Pickup &amp; Delivery</p>
        <h2>{tailorName}</h2>
      </div>

      <section className="order-section checkout-summary">
        <h3>Order Summary</h3>
        <div className="checkout-summary-grid">
          <div className="summary-row"><span>Service</span><strong>{rate.service_name}</strong></div>
          <div className="summary-row"><span>Stitching Price</span><strong>{formatServicePrice(rate.price_bdt)}</strong></div>
          <div className="summary-row"><span>Estimated Completion</span><strong>{rate.turnaround_min_days}–{rate.turnaround_max_days} days</strong></div>
          <div className="summary-row"><span>Measurement Method</span><strong>{mode === 'sample' ? 'Send Sample + Cloth' : 'Manual Measurements'}</strong></div>
          {mode === 'manual' && measurementFields.length > 0 && (
            <div className="summary-row summary-measurements">
              <span>Measurements ({measurements.unit})</span>
              <div className="measurement-chips">
                {measurementFields.map((field) => {
                  const val = measurements[field.key];
                  return val !== null && val !== undefined
                    ? <span key={field.key} className="meas-chip">{field.label}: {val}</span>
                    : null;
                })}
                {measurements.notes && <span className="meas-chip meas-notes">Notes: {measurements.notes}</span>}
              </div>
            </div>
          )}
          {mode === 'manual' && fabricArrangement && (
            <div className="summary-row">
              <span>Fabric Arrangement</span>
              <strong>{fabricArrangement === 'ask_tailor' ? 'Ask tailor about fabric' : 'Self-arrange with tailor'}</strong>
            </div>
          )}
          <div className="summary-row">
            <span>Short Fabric Preference</span>
            <strong>{FABRIC_SHORTAGE_LABELS[fabricShortage]}</strong>
          </div>
        </div>
      </section>

      <section className="order-section">
        <h3>Customer Information</h3>
        <div className="checkout-form-grid">
          <label>Full Name <span className="required-asterisk">*</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your name" />
          </label>
          <label>Phone Number <span className="required-asterisk">*</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="tel" placeholder="01XXXXXXXXX" />
          </label>
        </div>
      </section>

      <section className="order-section">
        <h3>Pickup &amp; Return Delivery</h3>
        <p className="muted">{isAlteration ? 'Your existing garment will be picked up for alteration and returned via the selected courier.' : 'Your unstitched cloth' + (mode === 'sample' ? ' and sample garment' : '') + ' will be picked up and the completed garment returned via the selected courier.'}</p>
        <label>Pickup Address <span className="required-asterisk">*</span>
          <textarea value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} maxLength={300} rows={2} placeholder="House, Road, Area, Dhaka" />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={returnSame} onChange={(e) => setReturnSame(e.target.checked)} />
          Use pickup address for return delivery.
        </label>
        {!returnSame && (
          <label>Return Delivery Address <span className="required-asterisk">*</span>
            <textarea value={returnAddress} onChange={(e) => setReturnAddress(e.target.value)} maxLength={300} rows={2} placeholder="House, Road, Area, Dhaka" />
          </label>
        )}
        <CourierSelector value={courier} onChange={setCourier} />
      </section>

      <section className="order-section">
        <h3>Payment Method</h3>
        <div className="payment-method-grid">
          <label className={`payment-card ${paymentMethod === 'cod' ? 'selected' : ''}`}>
            <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
            <div className="payment-icon"><Banknote size={20} /></div>
            <div className="payment-info"><strong>Cash on Delivery</strong><span>Pay when you receive your garment</span></div>
          </label>
          <label className={`payment-card ${paymentMethod === 'bkash' ? 'selected' : ''}`}>
            <input type="radio" name="payment" value="bkash" checked={paymentMethod === 'bkash'} onChange={() => setPaymentMethod('bkash')} />
            <div className="payment-icon bkash"><Smartphone size={20} /></div>
            <div className="payment-info"><strong>bKash</strong><span>Send money to 01XXXXXXXXX</span></div>
          </label>
          <label className={`payment-card ${paymentMethod === 'nagad' ? 'selected' : ''}`}>
            <input type="radio" name="payment" value="nagad" checked={paymentMethod === 'nagad'} onChange={() => setPaymentMethod('nagad')} />
            <div className="payment-icon nagad"><Smartphone size={20} /></div>
            <div className="payment-info"><strong>Nagad</strong><span>Send money to 01XXXXXXXXX</span></div>
          </label>
        </div>
        {paymentMethod !== 'cod' && (
          <p className="payment-note"><Info size={14} /> Mobile payment is a demonstration option. For this prototype, please confirm payment arrangements directly with the tailor.</p>
        )}
      </section>

      <section className="order-section">
        <h3>Special Instructions</h3>
        <label>Notes for the tailor <span className="muted">(optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="e.g. Please use the sample garment for fitting and return it with my completed garment." />
        </label>
      </section>

      <section className="order-section">
        <h3>Price Breakdown</h3>
        <OrderPriceSummary
          serviceName={rate.service_name}
          garmentPrice={rate.price_bdt}
          pickupFee={pickupFee}
          returnFee={returnFee}
          showOutbound={true}
          showCod={true}
        />
      </section>

      {error && <p className="form-error">{error}</p>}

      <button className="button button-primary full-button place-order-button" disabled={saving}>
        {saving ? 'Placing Order...' : <>Place Order · {formatServicePrice(total)} <ArrowRight size={16} /></>}
      </button>

      <p className="prototype-note">
        <Package size={12} /> Academic prototype: please use fictional test names, phone numbers, addresses, and measurements. Karigor does not book couriers or process payments.
      </p>
    </form>
  );
}
