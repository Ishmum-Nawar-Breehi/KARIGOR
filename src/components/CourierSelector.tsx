import { ExternalLink } from 'lucide-react';
import type { CourierProvider } from '@/types/order';
import { COURIER_CONFIG } from '@/lib/orders';
import { formatServicePrice } from '@/lib/formatting';

export function CourierSelector({
  value,
  onChange,
  label = 'Courier Selection',
}: {
  value: CourierProvider | null;
  onChange: (provider: CourierProvider) => void;
  label?: string;
}) {
  const providers = Object.keys(COURIER_CONFIG) as CourierProvider[];
  return (
    <fieldset className="courier-fieldset">
      <legend>{label}</legend>
      <div className="courier-radio-grid">
        {providers.map((provider) => {
          const config = COURIER_CONFIG[provider];
          const selected = value === provider;
          return (
            <label key={provider} className={`courier-radio-card ${selected ? 'selected' : ''}`}>
              <input
                type="radio"
                name="courier"
                value={provider}
                checked={selected}
                onChange={() => onChange(provider)}
              />
              <strong>{config.label}</strong>
              <span className="courier-fee">Est. outbound {formatServicePrice(config.outboundFee)}</span>
              <span className="courier-fee">Est. return {formatServicePrice(config.returnFee)}</span>
              <a href={config.infoUrl} target="_blank" rel="noopener noreferrer" className="courier-info-link" onClick={(e) => e.stopPropagation()}>
                Courier info <ExternalLink size={11} />
              </a>
            </label>
          );
        })}
      </div>
      <p className="courier-disclaimer">Estimated delivery charges for demonstration only. Actual courier fees and COD charges may vary.</p>
    </fieldset>
  );
}
