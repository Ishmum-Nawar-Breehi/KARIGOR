import type { MeasurementUnit } from '@/types/order';

export type MeasurementField = {
  key: 'chest' | 'waist' | 'hip' | 'length' | 'shoulder' | 'sleeve';
  label: string;
  required: boolean;
};

// Garment-specific measurement field relevance
const FIELD_SETS: Record<string, MeasurementField[]> = {
  Panjabi: [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'shoulder', label: 'Shoulder Width', required: true },
    { key: 'sleeve', label: 'Sleeve Length', required: true },
    { key: 'length', label: 'Garment Length', required: true },
    { key: 'waist', label: 'Waist', required: false },
  ],
  Salwar: [
    { key: 'waist', label: 'Waist', required: true },
    { key: 'hip', label: 'Hip', required: true },
    { key: 'length', label: 'Length', required: true },
  ],
  Kameez: [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'waist', label: 'Waist', required: true },
    { key: 'hip', label: 'Hip', required: true },
    { key: 'length', label: 'Length', required: true },
    { key: 'shoulder', label: 'Shoulder Width', required: true },
    { key: 'sleeve', label: 'Sleeve Length', required: true },
  ],
  'Salwar Kameez (Full Set)': [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'waist', label: 'Waist', required: true },
    { key: 'hip', label: 'Hip', required: true },
    { key: 'length', label: 'Garment Length', required: true },
    { key: 'shoulder', label: 'Shoulder Width', required: true },
    { key: 'sleeve', label: 'Sleeve Length', required: true },
  ],
  Suit: [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'waist', label: 'Waist', required: true },
    { key: 'shoulder', label: 'Shoulder Width', required: true },
    { key: 'sleeve', label: 'Sleeve Length', required: true },
    { key: 'length', label: 'Garment Length', required: true },
  ],
  Blazer: [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'waist', label: 'Waist', required: true },
    { key: 'shoulder', label: 'Shoulder Width', required: true },
    { key: 'sleeve', label: 'Sleeve Length', required: true },
    { key: 'length', label: 'Length', required: true },
  ],
  Blouse: [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'waist', label: 'Waist', required: true },
    { key: 'shoulder', label: 'Shoulder Width', required: true },
    { key: 'sleeve', label: 'Sleeve Length', required: true },
    { key: 'length', label: 'Length', required: true },
  ],
  Shirt: [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'waist', label: 'Waist', required: true },
    { key: 'shoulder', label: 'Shoulder Width', required: true },
    { key: 'sleeve', label: 'Sleeve Length', required: true },
    { key: 'length', label: 'Length', required: true },
  ],
  'Pant/Trouser': [
    { key: 'waist', label: 'Waist', required: true },
    { key: 'length', label: 'Length', required: true },
    { key: 'hip', label: 'Hip', required: false },
  ],
  'Bridal / Lehenga': [
    { key: 'chest', label: 'Chest', required: true },
    { key: 'waist', label: 'Waist', required: true },
    { key: 'hip', label: 'Hip', required: true },
    { key: 'length', label: 'Garment Length', required: true },
  ],
};

// Alteration services use a generic set + notes
const ALTERATION_FIELDS: MeasurementField[] = [
  { key: 'chest', label: 'Chest', required: false },
  { key: 'waist', label: 'Waist', required: false },
  { key: 'hip', label: 'Hip', required: false },
  { key: 'length', label: 'Garment Length', required: false },
  { key: 'shoulder', label: 'Shoulder Width', required: false },
  { key: 'sleeve', label: 'Sleeve Length', required: false },
];

const ALTERATION_SERVICES = new Set([
  'Dress Alteration',
  'Shirt/Top Alteration',
  'Pant/Trouser Hemming',
  'Zipper/Stitching Repair',
  'Size Fitting/Resizing',
]);

export function getMeasurementFields(serviceName: string): MeasurementField[] {
  if (ALTERATION_SERVICES.has(serviceName)) return ALTERATION_FIELDS;
  return FIELD_SETS[serviceName] ?? ALTERATION_FIELDS;
}

export function validateMeasurementValue(value: number, unit: MeasurementUnit): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;
  const maxInches = 80;
  const maxCm = 200;
  return unit === 'inches' ? value <= maxInches : value <= maxCm;
}

export function formatMeasurementValue(value: number | null | undefined, unit: MeasurementUnit): string {
  if (value === null || value === undefined) return '—';
  return `${value} ${unit === 'inches' ? 'in' : 'cm'}`;
}
