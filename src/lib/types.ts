export type RiskLevel = 'ringan' | 'sedang' | 'sulit';

export type RepairStatus =
  | 'menunggu'
  | 'dikerjakan'
  | 'menunggu_sparepart'
  | 'selesai'
  | 'sudah_diambil'
  | 'batal';

export type RoundingMode = 'none' | '500' | '1000' | '5000' | '10000';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export interface Device {
  id: string;
  customer_id: string | null;
  brand: string;
  model: string;
  imei: string | null;
  color: string | null;
  created_at: string;
}

export interface RepairDamage {
  id: string;
  repair_id: string;
  description: string;
  created_at: string;
}

export interface RepairItem {
  id: string;
  repair_id: string;
  sparepart_name: string;
  cost_price: number;
  risk_level: RiskLevel;
  risk_multiplier: number;
  selling_price: number;
  installation_fee: number;
  subtotal: number;
  created_at: string;
}

export interface Repair {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  device_id: string | null;
  damage_type: string;
  damage_description: string | null;
  sparepart_name: string | null;
  technician_note: string | null;
  customer_note: string | null;
  status: RepairStatus;
  risk_level: RiskLevel;
  risk_multiplier: number;
  installation_fee: number;
  cost_price: number;
  sparepart_price: number;
  rounding: number;
  total_price: number;
  total_sparepart: number;
  total_service: number;
  warranty_days: number;
  warranty_start: string | null;
  warranty_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepairWithDetails extends Repair {
  customer: Customer | null;
  device: Device | null;
  damages: RepairDamage[];
  items: RepairItem[];
}

export interface PricingSetting {
  id: string;
  risk_level: RiskLevel;
  multiplier: number;
  installation_fee: number;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  store_subtitle: string;
  address: string;
  phone: string;
  whatsapp: string;
  footer: string;
  logo: string;
}

export type PrintMode = 'rpp02n' | 'android' | 'preview';

export interface PrinterSettings {
  paperWidth: number;
  printMode: PrintMode;
}

export const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: 'ringan', label: 'Ringan' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
];

export const REPAIR_STATUSES: { value: RepairStatus; label: string; color: string }[] = [
  { value: 'menunggu', label: 'Menunggu', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'dikerjakan', label: 'Dikerjakan', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'menunggu_sparepart', label: 'Menunggu Sparepart', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'selesai', label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'sudah_diambil', label: 'Sudah Diambil', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'batal', label: 'Batal', color: 'bg-red-100 text-red-700 border-red-200' },
];

export const WARRANTY_OPTIONS = [
  { value: '0', label: 'Tidak Ada Garansi' },
  { value: '3', label: '3 Hari' },
  { value: '7', label: '7 Hari' },
  { value: '14', label: '14 Hari' },
  { value: '30', label: '30 Hari' },
  { value: 'custom', label: 'Custom' },
];

export const ROUNDING_OPTIONS: { value: RoundingMode; label: string }[] = [
  { value: 'none', label: 'Tidak dibulatkan' },
  { value: '500', label: 'Bulat ke Rp500' },
  { value: '1000', label: 'Bulat ke Rp1.000' },
  { value: '5000', label: 'Bulat ke Rp5.000' },
  { value: '10000', label: 'Bulat ke Rp10.000' },
];
