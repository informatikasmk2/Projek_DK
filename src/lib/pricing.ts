import type { RiskLevel, RoundingMode, PricingSetting } from './types';

export function getPricing(pricingSettings: PricingSetting[], risk: RiskLevel): PricingSetting | null {
  return pricingSettings.find((p) => p.risk_level === risk) ?? null;
}

export function calculateSparepartPrice(costPrice: number, multiplier: number): number {
  return costPrice * multiplier;
}

export function calculateSubtotal(sparepartPrice: number, installationFee: number): number {
  return sparepartPrice + installationFee;
}

export function applyRounding(subtotal: number, mode: RoundingMode): { rounded: number; difference: number } {
  if (mode === 'none') return { rounded: subtotal, difference: 0 };
  const factor = parseInt(mode, 10);
  const rounded = Math.round(subtotal / factor) * factor;
  return { rounded, difference: rounded - subtotal };
}

export function calculateTotal(
  costPrice: number,
  multiplier: number,
  installationFee: number,
  roundingMode: RoundingMode
): {
  sparepartPrice: number;
  subtotal: number;
  rounding: number;
  total: number;
} {
  const sparepartPrice = calculateSparepartPrice(costPrice, multiplier);
  const subtotal = calculateSubtotal(sparepartPrice, installationFee);
  const { rounded, difference } = applyRounding(subtotal, roundingMode);
  return {
    sparepartPrice,
    subtotal,
    rounding: difference,
    total: rounded,
  };
}

export interface ItemCalc {
  costPrice: number;
  multiplier: number;
  installationFee: number;
  sellingPrice: number;
  subtotal: number;
}

export function calculateItem(
  costPrice: number,
  multiplier: number,
  installationFee: number
): ItemCalc {
  const sellingPrice = costPrice * multiplier;
  const subtotal = sellingPrice + installationFee;
  return { costPrice, multiplier, installationFee, sellingPrice, subtotal };
}

export interface MultiItemTotal {
  totalSparepart: number;
  totalService: number;
  subtotal: number;
  rounding: number;
  total: number;
}

export function calculateMultiItemTotal(
  items: { sellingPrice: number; installationFee: number }[],
  roundingMode: RoundingMode
): MultiItemTotal {
  const totalSparepart = items.reduce((sum, i) => sum + i.sellingPrice, 0);
  const totalService = items.reduce((sum, i) => sum + i.installationFee, 0);
  const subtotal = totalSparepart + totalService;
  const { rounded, difference } = applyRounding(subtotal, roundingMode);
  return { totalSparepart, totalService, subtotal, rounding: difference, total: rounded };
}

export function generateInvoiceNumber(existing: string[]): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const prefix = `GPS-${ymd}-`;
  const todayInvoices = existing.filter((n) => n.startsWith(prefix));
  const nextNum = String(todayInvoices.length + 1).padStart(4, '0');
  return `${prefix}${nextNum}`;
}
