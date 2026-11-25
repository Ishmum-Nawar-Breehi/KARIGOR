import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OrderPlacementForm } from '@/components/OrderPlacementForm';
import type { FabricShortageResolution, ManualMeasurements, MeasurementMode } from '@/types/order';
import type { TailorServiceRate } from '@/types/service';

type Props = {
  customer: { id: string; name: string } | null;
  onLoginRequest: () => void;
  showToast: (message: string) => void;
};

const VALID_SHORTAGE_VALUES: FabricShortageResolution[] = ['send_additional_fabric', 'contact_tailor', 'tailor_adjust'];

export function NewOrderPage({ customer, onLoginRequest, showToast }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tailorId = params.get('tailor') ?? '';
  const rateId = params.get('service') ?? '';
  const modeParam = params.get('mode') ?? 'sample';
  const initialMode: MeasurementMode = modeParam === 'manual' ? 'manual' : 'sample';

  const measurementsParam = params.get('measurements');
  const initialMeasurements: ManualMeasurements = measurementsParam
    ? (() => { try { return JSON.parse(measurementsParam) as ManualMeasurements; } catch { return { unit: 'inches' }; } })()
    : { unit: 'inches' };

  const shortageParam = params.get('fabricShortage') ?? '';
  const initialFabricShortage: FabricShortageResolution = VALID_SHORTAGE_VALUES.includes(shortageParam as FabricShortageResolution)
    ? shortageParam as FabricShortageResolution
    : 'contact_tailor';

  const initialFabricArrangement = params.get('fabricArrangement');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tailorName, setTailorName] = useState('');
  const [rate, setRate] = useState<TailorServiceRate | null>(null);
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    if (!tailorId || !rateId) { setError('Missing tailor or service selection.'); setLoading(false); return; }
    void (async () => {
      setLoading(true);
      const [tailorRes, rateRes] = await Promise.all([
        supabase.from('tailors').select('shop_name').eq('id', tailorId).maybeSingle(),
        supabase.from('tailor_service_rates').select('*').eq('id', rateId).maybeSingle(),
      ]);
      if (tailorRes.error || rateRes.error || !tailorRes.data || !rateRes.data) {
        setError('We could not load the selected service. Please go back and try again.');
      } else {
        setTailorName(tailorRes.data.shop_name);
        setRate(rateRes.data as TailorServiceRate);
        if (customer) {
          const phoneRes = await supabase.from('users').select('phone').eq('id', customer.id).maybeSingle();
          if (!phoneRes.error && phoneRes.data) setCustomerPhone((phoneRes.data as { phone: string }).phone ?? '');
        }
      }
      setLoading(false);
    })();
  }, [tailorId, rateId, customer]);

  if (loading) return <main className="order-page"><div className="container empty-state"><div className="spinner" /><p>Loading order form...</p></div></main>;
  if (error || !rate) return <main className="order-page"><div className="container empty-state"><SearchX /><h2>Service not found</h2><p>{error || 'We could not find the selected service.'}</p><button className="button button-primary" onClick={() => navigate('/')}>Back to Tailors</button></div></main>;

  return <main className="order-page">
    <div className="container">
      <button className="back-link" onClick={() => navigate(`/tailor/${tailorId}`)}><ArrowLeft size={16} />Back to Tailor Profile</button>
      <OrderPlacementForm
        tailorId={tailorId}
        tailorName={tailorName}
        rate={rate}
        customerId={customer?.id ?? ''}
        customerName={customer?.name ?? ''}
        customerPhone={customerPhone}
        initialMode={initialMode}
        initialMeasurements={initialMeasurements}
        initialFabricShortage={initialFabricShortage}
        initialFabricArrangement={initialFabricArrangement}
        onLoginRequest={onLoginRequest}
        onSuccess={(orderId) => { showToast('Your order has been placed successfully!'); navigate(`/order/${orderId}`); }}
      />
    </div>
  </main>;
}
