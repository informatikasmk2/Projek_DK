import { formatRupiah, formatDate, formatDateTime } from './format';
import type { RepairWithDetails, StoreSettings } from './types';

export type PrintMode = 'rpp02n' | 'android' | 'preview';

export const CLEANTER_URL = 'http://localhost:9100';

export type CleanterContentItem =
  | { type: 'text'; text: string; align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 'normal' | 'large' }
  | { type: 'divider' }
  | { type: 'row'; left: string; right: string; bold?: boolean }
  | { type: 'feed'; lines: number };

export interface CleanterPayload {
  cut: boolean;
  content: CleanterContentItem[];
}

export interface HealthResult {
  status: 'bridge_down' | 'bridge_up' | 'printer_connected';
  connected: boolean;
  message?: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
}

export function charsForPaper(paperWidth: number): number {
  if (paperWidth <= 58) return 32;
  if (paperWidth <= 80) return 48;
  return Math.floor(paperWidth / 1.8);
}

function wrapText(text: string, chars: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= chars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function checkHealth(): Promise<HealthResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${CLEANTER_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { status: 'bridge_down', connected: false, message: 'Cleanter merespons dengan error.' };
    }

    const body = await res.json().catch(() => null);
    const connected = body?.printer?.connected === true || body?.connected === true;
    return {
      status: connected ? 'printer_connected' : 'bridge_up',
      connected,
      message: body?.printer?.name ? `Printer: ${body.printer.name}` : undefined,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { status: 'bridge_down', connected: false, message: 'Cleanter tidak merespons (timeout).' };
    }
    return { status: 'bridge_down', connected: false, message: 'Tidak dapat terhubung ke Cleanter.' };
  }
}

export function buildReceiptPayload(
  repair: RepairWithDetails,
  settings: StoreSettings | null,
  paperWidth: number
): CleanterPayload {
  const chars = charsForPaper(paperWidth);
  const content: CleanterContentItem[] = [];
  const storeName = settings?.store_name ?? 'GM Phone Service';
  const storeAddress = settings?.address ?? '';
  const storePhone = settings?.phone ?? '';
  const footer = settings?.footer ?? 'Terima kasih telah mempercayakan HP Anda kepada kami.';

  const damages = repair.damages ?? [];
  const items = repair.items ?? [];
  const totalSparepart = Number(repair.total_sparepart || repair.sparepart_price);
  const totalService = Number(repair.total_service || repair.installation_fee);

  // Header
  content.push({ type: 'text', text: storeName, align: 'center', bold: true, size: 'large' });
  if (storeAddress) {
    for (const l of wrapText(storeAddress, chars)) content.push({ type: 'text', text: l, align: 'center' });
  }
  if (storePhone) content.push({ type: 'text', text: `Telp: ${storePhone}`, align: 'center' });
  content.push({ type: 'divider' });

  // Invoice info
  content.push({ type: 'text', text: 'NOTA SERVIS', align: 'center', bold: true });
  content.push({ type: 'text', text: repair.invoice_number, align: 'center' });
  content.push({ type: 'text', text: formatDateTime(repair.created_at), align: 'center' });
  content.push({ type: 'divider' });

  // Customer
  content.push({ type: 'row', left: 'Pelanggan', right: repair.customer?.name ?? '-' });
  content.push({ type: 'row', left: 'Telp', right: repair.customer?.phone ?? '-' });
  content.push({ type: 'row', left: 'HP', right: `${repair.device?.brand ?? '-'} ${repair.device?.model ?? ''}`.trim() });
  if (repair.device?.imei) content.push({ type: 'row', left: 'IMEI', right: repair.device.imei });
  content.push({ type: 'divider' });

  // Damages — multi-damage, bullet points
  content.push({ type: 'text', text: 'KERUSAKAN:', bold: true });
  if (damages.length > 0) {
    for (const d of damages) {
      for (const l of wrapText(`• ${d.description}`, chars)) content.push({ type: 'text', text: l });
    }
  } else {
    content.push({ type: 'text', text: `• ${repair.damage_type}` });
  }
  content.push({ type: 'divider' });

  // Sparepart items — only selling price, no cost/multiplier
  if (items.length > 0) {
    content.push({ type: 'text', text: 'SPAREPART:', bold: true });
    for (const it of items) {
      content.push({ type: 'row', left: it.sparepart_name, right: formatRupiah(Number(it.selling_price)) });
    }
    content.push({ type: 'divider' });

    // Jasa Pasang per item
    content.push({ type: 'text', text: 'JASA PASANG:', bold: true });
    for (const it of items) {
      content.push({ type: 'row', left: it.sparepart_name, right: formatRupiah(Number(it.installation_fee)) });
    }
    content.push({ type: 'divider' });
  }

  // Totals — no internal info
  content.push({ type: 'row', left: 'Total Sparepart', right: formatRupiah(totalSparepart) });
  content.push({ type: 'row', left: 'Total Jasa', right: formatRupiah(totalService) });
  if (Number(repair.rounding) !== 0) {
    const rSign = Number(repair.rounding) >= 0 ? '+' : '';
    content.push({ type: 'row', left: 'Pembulatan', right: `${rSign}${formatRupiah(Number(repair.rounding))}` });
  }
  content.push({ type: 'divider' });
  content.push({ type: 'row', left: 'TOTAL', right: formatRupiah(Number(repair.total_price)), bold: true });

  // Warranty
  content.push({ type: 'divider' });
  if (repair.warranty_days > 0) {
    content.push({ type: 'row', left: 'Garansi', right: `${repair.warranty_days} Hari` });
    content.push({ type: 'text', text: 'Berlaku sampai:' });
    content.push({ type: 'text', text: repair.warranty_end ? formatDate(repair.warranty_end) : '-' });
  } else {
    content.push({ type: 'row', left: 'Garansi', right: 'Tidak ada' });
  }

  // Notes
  if (repair.technician_note || repair.customer_note) {
    content.push({ type: 'divider' });
    content.push({ type: 'text', text: 'Catatan:', bold: true });
    if (repair.technician_note) {
      for (const l of wrapText(repair.technician_note, chars)) content.push({ type: 'text', text: l });
    }
    if (repair.customer_note) {
      for (const l of wrapText(repair.customer_note, chars)) content.push({ type: 'text', text: l });
    }
  }

  // Footer
  content.push({ type: 'divider' });
  for (const l of wrapText(footer, chars)) content.push({ type: 'text', text: l, align: 'center' });
  content.push({ type: 'text', text: 'Terima kasih', align: 'center', bold: true });
  content.push({ type: 'feed', lines: 3 });

  return { cut: true, content };
}

export function buildTestPrintPayload(_paperWidth: number): CleanterPayload {
  return {
    cut: true,
    content: [
      { type: 'text', text: 'TEST PRINT', align: 'center', bold: true, size: 'large' },
      { type: 'divider' },
      { type: 'text', text: 'TEST PRINT', align: 'center', bold: true, size: 'large' },
      { type: 'feed', lines: 1 },
      { type: 'row', left: 'Printer', right: 'RPP02N' },
      { type: 'row', left: 'Koneksi', right: 'Bluetooth' },
      { type: 'divider' },
      { type: 'text', text: 'Jika nota ini tercetak,', align: 'center' },
      { type: 'text', text: 'printer siap digunakan.', align: 'center' },
      { type: 'feed', lines: 3 },
    ],
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  printer_not_connected: 'Printer RPP02N belum terhubung ke Cleanter. Pilih RPP02N di aplikasi Cleanter.',
  printer_unreachable: 'Printer RPP02N tidak dapat dijangkau. Pastikan printer menyala dan dalam jangkauan Bluetooth.',
  bluetooth_disabled: 'Bluetooth dalam keadaan mati. Nyalakan Bluetooth di Android Anda.',
  bluetooth_permission_missing: 'Aplikasi Cleanter tidak memiliki izin Bluetooth. Berikan izin di pengaturan Android.',
  printer_not_paired: 'Printer RPP02N belum dipair. Pair RPP02N melalui pengaturan Bluetooth Android.',
};

export async function sendToCleanter(payload: CleanterPayload): Promise<PrintResult> {
  const health = await checkHealth();

  if (health.status === 'bridge_down') {
    return { success: false, message: 'Cleanter tidak dapat dihubungi. Pastikan aplikasi Cleanter sudah dibuka dan Print Bridge aktif.' };
  }

  if (!health.connected) {
    return { success: false, message: 'Printer RPP02N belum terhubung ke Cleanter. Hubungkan printer melalui Bluetooth Android dan pilih RPP02N di Cleanter.' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${CLEANTER_URL}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      return { success: true, message: 'Nota berhasil dikirim ke printer.' };
    }

    const body = await res.json().catch(() => null);
    const errorCode = body?.error ?? body?.code ?? '';
    const fix = body?.fix ?? '';

    if (ERROR_MESSAGES[errorCode]) {
      return { success: false, message: fix ? `${ERROR_MESSAGES[errorCode]} ${fix}` : ERROR_MESSAGES[errorCode] };
    }

    const rawMsg = body?.message ?? body?.error ?? '';
    return { success: false, message: rawMsg || `Cleanter merespons dengan error (HTTP ${res.status}).` };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, message: 'Cleanter tidak merespons (timeout). Pastikan aplikasi Cleanter masih aktif.' };
    }
    return { success: false, message: 'Gagal mengirim ke printer. Pastikan Cleanter aktif.' };
  }
}
