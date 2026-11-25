import { CheckCircle2, Clock3, Star } from 'lucide-react';
import type { TailorServiceRate } from '@/types/service';
import { formatServicePrice } from '@/lib/formatting';

export function ServiceRateCard({ rate, selected = false, onSelect, compact = false }: { rate: TailorServiceRate; selected?: boolean; onSelect?: () => void; compact?: boolean }) {
  return <article className={`rate-card ${selected ? 'rate-card-selected' : ''} ${compact ? 'rate-card-compact' : ''}`}>
    <div className="rate-card-heading"><div><h3>{rate.service_name}</h3>{rate.is_estimated && <span className="estimated-rate"><Star size={12} />Estimated rate</span>}</div>{selected && <CheckCircle2 className="selected-icon" size={18} />}</div>
    <strong className="rate-price">{formatServicePrice(rate.price_bdt)}</strong>
    <span className="rate-time"><Clock3 size={14} />Estimated: {rate.turnaround_min_days}–{rate.turnaround_max_days} days</span>
    {onSelect && <button type="button" className={`button ${selected ? 'button-primary' : 'button-outline'} rate-select-button`} onClick={onSelect}>{selected ? 'Selected Service' : 'Select Service'}</button>}
  </article>;
}
