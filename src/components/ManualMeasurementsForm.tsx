import type { ManualMeasurements, MeasurementUnit } from '@/types/order';
import { getMeasurementFields, validateMeasurementValue } from '@/lib/measurements';

export function ManualMeasurementsForm({
  serviceName,
  measurements,
  onChange,
}: {
  serviceName: string;
  measurements: ManualMeasurements;
  onChange: (measurements: ManualMeasurements) => void;
}) {
  const fields = getMeasurementFields(serviceName);

  const setUnit = (unit: MeasurementUnit) => onChange({ ...measurements, unit });
  const setField = (key: 'chest' | 'waist' | 'hip' | 'length' | 'shoulder' | 'sleeve', raw: string) => {
    const parsed = raw === '' ? null : Number(raw);
    onChange({ ...measurements, [key]: parsed });
  };

  return (
    <div className="manual-measurements">
      <div className="measurement-unit-selector">
        <label>Unit</label>
        <div className="unit-toggle">
          <button type="button" className={measurements.unit === 'inches' ? 'selected' : ''} onClick={() => setUnit('inches')}>Inches</button>
          <button type="button" className={measurements.unit === 'cm' ? 'selected' : ''} onClick={() => setUnit('cm')}>Centimeters</button>
        </div>
      </div>
      <div className="measurement-field-grid">
        {fields.map((field) => {
          const val = measurements[field.key];
          const numVal = val === null || val === undefined ? '' : val;
          const hasError = numVal !== '' && !validateMeasurementValue(Number(numVal), measurements.unit);
          return (
            <label key={field.key} className="measurement-field-label">
              {field.label} {field.required && <span className="required-asterisk">*</span>}
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={numVal}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={measurements.unit === 'inches' ? 'e.g. 38' : 'e.g. 96'}
                className={hasError ? 'input-error' : ''}
              />
              {hasError && <small className="field-error">Enter a positive value within reasonable limits.</small>}
            </label>
          );
        })}
      </div>
      <label className="measurement-field-label span-two">
        Additional Measurement Notes
        <textarea
          value={measurements.notes ?? ''}
          onChange={(e) => onChange({ ...measurements, notes: e.target.value })}
          maxLength={500}
          rows={2}
          placeholder="e.g. Prefer a relaxed fit. Note any specific fitting preferences."
        />
      </label>
    </div>
  );
}
