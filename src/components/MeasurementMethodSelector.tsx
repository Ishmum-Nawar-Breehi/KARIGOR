import { Package, Ruler } from 'lucide-react';
import type { MeasurementMode } from '@/types/order';

export function MeasurementMethodSelector({
  value,
  onChange,
}: {
  value: MeasurementMode;
  onChange: (mode: MeasurementMode) => void;
}) {
  return (
    <div className="method-selector">
      <button
        type="button"
        className={`method-card ${value === 'sample' ? 'selected' : ''}`}
        onClick={() => onChange('sample')}
      >
        <div className="method-icon"><Package size={24} /></div>
        <div className="method-content">
          <div className="method-title-row"><h3>Send Sample + Unstitched Cloth</h3><span className="method-badge">Recommended</span></div>
          <p>Send a sample garment that fits you well, along with your unstitched fabric, so the tailor can use it for measurements and stitching.</p>
        </div>
      </button>
      <button
        type="button"
        className={`method-card ${value === 'manual' ? 'selected' : ''}`}
        onClick={() => onChange('manual')}
      >
        <div className="method-icon"><Ruler size={24} /></div>
        <div className="method-content">
          <h3>Enter Manual Measurements</h3>
          <p>Provide your measurements yourself if you prefer not to send a physical sample garment.</p>
        </div>
      </button>
    </div>
  );
}
