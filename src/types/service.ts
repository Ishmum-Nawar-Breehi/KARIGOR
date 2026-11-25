export type TailorServiceRate = {
  id: string;
  tailor_id: string;
  service_name: string;
  price_bdt: number;
  turnaround_min_days: number;
  turnaround_max_days: number;
  is_estimated: boolean;
  created_at?: string;
  updated_at?: string;
};
