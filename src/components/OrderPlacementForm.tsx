import { useState, type FormEvent } from 'react';
import { ArrowRight, Info, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatServicePrice } from '@/lib/formatting';
import type { CourierProvider, FabricShortageResolution, ManualMeasurements, MeasurementMode } from '@/types/order';
import type { TailorServiceRate } from '@/types/service';
import { courierFee } from '@/lib/orders';
import { getMeasurementFields, validateMeasurementValue } from '@/lib/measurements';
import { CourierSelector } from '@/components/CourierSelector';
import { OrderPriceSummary } from '@/components/OrderPriceSummary';
import { ManualMeasurementsForm } from '@/components/ManualMeasurementsForm';

type Props = {
  tailorId: string;
  tailorName: string;
  rate: TailorServiceRate;
  customerId: string;
  initialMode: MeasurementMode;
  onLoginRequest: () => void;
  onSuccess: (orderId: string) => void;
};

const ALTERATION_SERVICES = new Set([
  'Dress Alteration', 'Shirt/Top Alteration', 'Pant/Trouser Hemming',
  'Zipper/Stitching Repair', 'Size Fitting/Resizing',
]);

export function OrderPlacementForm({ tailorId, tailorName, rate, customerId, initialMode, onLoginRequest, onSuccess }: Props) {
  const [mode] = useState<MeasurementMode>(initialMode);
  const [pickupAddress, setPickupAddress] = useState('');
  const [returnSame, setReturnSame] = useState(true);
  const [returnAddress, setReturnAddress] = useState('');
  const [courier, setCourier] = useState<CourierProvider>('pathao');
  const [sampleConfirmed, setSampleConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState<ManualMeasurements>({ unit: 'inches' });
  const [fabricArrangement, setFabricArrangement] = useState('');
  const [fabricShortage, setFabricShortage] = useState<FabricShortageResolution | ''>('');
  const [prototypeConfirmed, setPrototypeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isAlteration = ALTERATION_SERVICES.has(rate.service_name);
  const pickupFee = courierFee(courier, 'outbound');
  const returnFee = courierFee(courier, 'return');

  const pickupLabel = isAlteration ? 'Pickup Address (existing garment)' : 'Pickup Address (unstitched cloth' + (mode === 'sample' ? ' + sample garment' : '') + ')';
  const packageConfirmText = isAlteration
    ? 'I will provide the existing garment to be altered.'
    : mode === 'sample'
      ? 'I will provide one sample garment and the unstitched fabric needed for this order.'
      : 'I will provide the unstitched fabric needed for this order.';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customerId) { onLoginRequest(); return; }
    setError('');

    if (!pickupAddress.trim()) return setError('Please provide a pickup address.');
    if (!courier) return setError('Please select a courier.');

    if (mode === 'sample') {
      if (!sampleConfirmed) return setError('Please confirm you will provide the sample garment and unstitched fabric.');
    } else {
      const fields = getMeasurementFields(rate.service_name);
      for (const field of fields) {
        const val = measurements[field.key];
        if (field.required && (val === null || val === undefined)) return setError(`Please enter your ${field.label}.`);
        if (val !== null && val !== undefined && !validateMeasurementValue(val, measurements.unit))
          return setError(`${field.label} must be a positive value within reasonable limits.`);
      }
      if (!fabricArrangement) return setError('Please select a fabric arrangement option.');
    }

    if (!fabricShortage) return setError('Please select a fabric shortage resolution preference.');
    if (!prototypeConfirmed) return setError('Please confirm you understand this is a prototype order.');

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
        <p className="eyebrow">Place Your Tailoring Order</p>
        <h2>{tailorName}</h2>
        <div className="order-service-summary">
          <div><span>Selected Service</span><strong>{rate.service_name}</strong></div>
          <div><span>Stitching Price</span><strong>{formatServicePrice(rate.price_bdt)}</strong></div>
          <div><span>Estimated Completion</span><strong>{rate.turnaround_min_days}–{rate.turnaround_max_days} days</strong></div>
          <div><span>Measurement Method</span><strong>{mode === 'sample' ? 'Send Sample + Cloth' : 'Manual Measurements'}</strong></div>
        </div>
      </div>

      <section className="order-section">
        <h3>Pickup & Return Delivery</h3>
        <p className="muted">{isAlteration ? 'Your existing garment will be picked up for alteration and returned via the selected courier.' : 'Your unstitched cloth' + (mode === 'sample' ? ' and sample garment' : '') + ' will be picked up and the completed garment returned via the selected courier.'}</p>
        <label>{pickupLabel} <span className="required-asterisk">*</span>
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
          {packageConfirmText}
        </label>
      </section>

      {mode === 'sample' && (
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
        </>
      )}

      <section className="order-section">
        <h3>Short Fabric / Material Shortage Preference</h3>
        <p className="muted">If the provided fabric is short for this garment, how would you like to resolve it?</p>
        <div className="fabric-options">
          <label className={`radio-card ${fabricShortage === 'send_additional_fabric' ? 'selected' : ''}`}>
            <input type="radio" name="fabric_shortage" value="send_additional_fabric" checked={fabricShortage === 'send_additional_fabric'} onChange={() => setFabricShortage('send_additional_fabric')} />
            Customer sends additional fabric
          </label>
          <label className={`radio-card ${fabricShortage === 'contact_tailor' ? 'selected' : ''}`}>
            <input type="radio" name="fabric_shortage" value="contact_tailor" checked={fabricShortage === 'contact_tailor'} onChange={() => setFabricShortage('contact_tailor')} />
            Customer contacts the tailor
          </label>
          <label className={`radio-card ${fabricShortage === 'tailor_adjust' ? 'selected' : ''}`}>
            <input type="radio" name="fabric_shortage" value="tailor_adjust" checked={fabricShortage === 'tailor_adjust'} onChange={() => setFabricShortage('tailor_adjust')} />
            Tailor updates/adjusts the order details and price
          </label>
        </div>
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
