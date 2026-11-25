import { useState, type FormEvent } from 'react';
import { ArrowRight, Info, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatServicePrice } from '@/lib/formatting';
import type { CourierProvider, ManualMeasurements, MeasurementMode, ReturnMethod } from '@/types/order';
import type { TailorServiceRate } from '@/types/service';
import { RETURN_METHOD_LABELS, courierFee } from '@/lib/orders';
import { getMeasurementFields, validateMeasurementValue } from '@/lib/measurements';
import { MeasurementMethodSelector } from '@/components/MeasurementMethodSelector';
import { CourierSelector } from '@/components/CourierSelector';
import { OrderPriceSummary } from '@/components/OrderPriceSummary';
import { ManualMeasurementsForm } from '@/components/ManualMeasurementsForm';

type Props = {
  tailorId: string;
  tailorName: string;
  rate: TailorServiceRate;
  customerId: string;
  onLoginRequest: () => void;
  onSuccess: (orderId: string) => void;
};

export function OrderPlacementForm({ tailorId, tailorName, rate, customerId, onLoginRequest, onSuccess }: Props) {
  const [mode, setMode] = useState<MeasurementMode>('sample');
  const [pickupAddress, setPickupAddress] = useState('');
  const [returnSame, setReturnSame] = useState(true);
  const [returnAddress, setReturnAddress] = useState('');
  const [courier, setCourier] = useState<CourierProvider>('pathao');
  const [sampleConfirmed, setSampleConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [returnMethod, setReturnMethod] = useState<ReturnMethod>('pathao');
  const [measurements, setMeasurements] = useState<ManualMeasurements>({ unit: 'inches' });
  const [fabricArrangement, setFabricArrangement] = useState('');
  const [prototypeConfirmed, setPrototypeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const pickupFee = mode === 'sample' ? courierFee(courier, 'outbound') : 0;
  const returnFee = mode === 'manual' && returnMethod === 'pickup' ? 0 : courierFee(mode === 'manual' ? (returnMethod as CourierProvider) : courier, 'return');
  const showCod = mode === 'sample' || (mode === 'manual' && returnMethod !== 'pickup');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customerId) { onLoginRequest(); return; }
    setError('');

    if (mode === 'sample') {
      if (!pickupAddress.trim()) return setError('Please provide a pickup address.');
      if (!sampleConfirmed) return setError('Please confirm you will provide the sample garment and unstitched fabric.');
      if (!courier) return setError('Please select a courier.');
    } else {
      const fields = getMeasurementFields(rate.service_name);
      for (const field of fields) {
        const val = measurements[field.key];
        if (field.required && (val === null || val === undefined)) return setError(`Please enter your ${field.label}.`);
        if (val !== null && val !== undefined && !validateMeasurementValue(val, measurements.unit))
          return setError(`${field.label} must be a positive value within reasonable limits.`);
      }
      if (!fabricArrangement) return setError('Please select a fabric arrangement option.');
      if (returnMethod !== 'pickup') {
        if (!returnAddress.trim()) return setError('Please provide a return delivery address.');
      }
    }
    if (!prototypeConfirmed) return setError('Please confirm you understand this is a prototype order.');

    const finalReturnAddress = mode === 'sample'
      ? (returnSame ? pickupAddress : returnAddress)
      : (returnMethod === 'pickup' ? null : returnAddress);
    if (finalReturnAddress !== null && !finalReturnAddress.trim()) return setError('Please provide a return address.');

    setSaving(true);
    const result = await supabase.rpc('place_order', {
      p_customer_id: customerId,
      p_tailor_id: tailorId,
      p_service_rate_id: rate.id,
      p_measurement_mode: mode,
      p_manual_measurements: mode === 'manual' ? measurements : null,
      p_fabric_arrangement: mode === 'manual' ? fabricArrangement : null,
      p_courier_provider: mode === 'sample' ? courier : (mode === 'manual' && returnMethod !== 'pickup' ? returnMethod : null),
      p_pickup_address: mode === 'sample' ? pickupAddress.trim() : null,
      p_return_address: finalReturnAddress?.trim() ?? null,
      p_pickup_delivery_fee_bdt: pickupFee,
      p_return_delivery_fee_bdt: returnFee,
      p_customer_notes: notes.trim() || null,
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
        <p className="eyebrow">Place Your Tailoring Order</p>
        <h2>{tailorName}</h2>
        <div className="order-service-summary">
          <div><span>Selected Service</span><strong>{rate.service_name}</strong></div>
          <div><span>Stitching Price</span><strong>{formatServicePrice(rate.price_bdt)}</strong></div>
          <div><span>Estimated Completion</span><strong>{rate.turnaround_min_days}–{rate.turnaround_max_days} days</strong></div>
        </div>
      </div>

      <section className="order-section">
        <h3>Choose Measurement Method</h3>
        <MeasurementMethodSelector value={mode} onChange={setMode} />
      </section>

      {mode === 'sample' && (
        <>
          <section className="order-section">
            <h3>Sample & Fabric Shipment Details</h3>
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
            <label className="checkbox-label">
              <input type="checkbox" checked={sampleConfirmed} onChange={(e) => setSampleConfirmed(e.target.checked)} />
              I will provide one sample garment and the unstitched fabric needed for this order.
            </label>
          </section>

          <section className="order-section info-panel">
            <h3><Info size={16} /> How sample-based tailoring works</h3>
            <ol>
              <li>Pack a well-fitting sample garment together with the unstitched cloth.</li>
              <li>Arrange delivery through the selected courier after coordinating with the tailor.</li>
              <li>The tailor uses your sample to determine measurements.</li>
              <li>After stitching, your completed garment and original sample are returned together.</li>
              <li>Pay the agreed amount when receiving the return parcel if the COD arrangement is confirmed.</li>
            </ol>
          </section>
        </>
      )}

      {mode === 'manual' && (
        <>
          <section className="order-section">
            <h3>Enter Your Measurements</h3>
            <ManualMeasurementsForm serviceName={rate.service_name} measurements={measurements} onChange={setMeasurements} />
          </section>

          <section className="order-section">
            <h3>Fabric Arrangement</h3>
            <p className="muted">The listed tailoring price covers stitching only and does not include fabric material costs.</p>
            <div className="fabric-options">
              <label className={`radio-card ${fabricArrangement === 'ask_tailor' ? 'selected' : ''}`}>
                <input type="radio" name="fabric" value="ask_tailor" checked={fabricArrangement === 'ask_tailor'} onChange={() => setFabricArrangement('ask_tailor')} />
                Ask tailor about fabric availability
              </label>
              <label className={`radio-card ${fabricArrangement === 'self_arrange' ? 'selected' : ''}`}>
                <input type="radio" name="fabric" value="self_arrange" checked={fabricArrangement === 'self_arrange'} onChange={() => setFabricArrangement('self_arrange')} />
                I will arrange fabric separately with the tailor
              </label>
            </div>
          </section>

          <section className="order-section">
            <h3>Return Method</h3>
            <div className="return-method-grid">
              {(Object.keys(RETURN_METHOD_LABELS) as ReturnMethod[]).map((method) => (
                <button type="button" key={method} className={`return-method-card ${returnMethod === method ? 'selected' : ''}`} onClick={() => setReturnMethod(method)}>
                  {RETURN_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
            {returnMethod !== 'pickup' && (
              <label>Return Delivery Address <span className="required-asterisk">*</span>
                <textarea value={returnAddress} onChange={(e) => setReturnAddress(e.target.value)} maxLength={300} rows={2} placeholder="House, Road, Area, Dhaka" />
              </label>
            )}
            {returnMethod === 'pickup' && <p className="muted">You must coordinate collection directly with the tailor.</p>}
          </section>
        </>
      )}

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
          showOutbound={mode === 'sample'}
          showCod={showCod}
        />
        {mode === 'manual' && returnMethod !== 'pickup' && (
          <p className="muted">Outbound delivery: {formatServicePrice(0)} (manual measurements, no fabric pickup needed).</p>
        )}
        {mode === 'manual' && returnMethod === 'pickup' && (
          <p className="muted">Return delivery: {formatServicePrice(0)} (collect from tailor shop).</p>
        )}
      </section>

      <label className="checkbox-label prototype-confirm">
        <input type="checkbox" checked={prototypeConfirmed} onChange={(e) => setPrototypeConfirmed(e.target.checked)} />
        I understand that this is a prototype order. Courier pickup, payment, and tailoring arrangements must be confirmed separately.
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="button button-primary full-button" disabled={saving}>
        {saving ? 'Placing Order...' : <>Place Order <ArrowRight size={16} /></>}
      </button>

      <p className="prototype-note">
        <Package size={12} /> Academic prototype: please use fictional test names, phone numbers, addresses, and measurements. Karigor does not book couriers or process payments.
      </p>
    </form>
  );
}
