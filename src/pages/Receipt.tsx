import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { useSettings, usePrinterSettings } from '@/lib/hooks';
import { formatRupiah, formatDate, formatDateTime } from '@/lib/format';
import { REPAIR_STATUSES } from '@/lib/types';
import type { RepairWithDetails, StoreSettings, RepairDamage, RepairItem } from '@/lib/types';
import { sendToCleanter, buildReceiptPayload, charsForPaper } from '@/lib/cleanter';
import { ArrowLeft, Printer, Share2, Save, Check, Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';

export function ReceiptPage({ repairId }: { repairId: string }) {
  const { settings } = useSettings();
  const { paperWidth, printMode } = usePrinterSettings();
  const [repair, setRepair] = useState<RepairWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadRepair(); }, [repairId]);

  async function loadRepair() {
    const { data } = await supabase
      .from('repairs')
      .select('*, customer:customers(*), device:devices(*), damages:repair_damages(*), items:repair_items(*)')
      .eq('id', repairId)
      .maybeSingle();
    setRepair(data as unknown as RepairWithDetails | null);
    setLoading(false);
  }

  async function handlePrint() {
    if (!repair) return;
    setPrinting(true);
    setPrintResult(null);
    setShowFallback(false);

    if (printMode === 'rpp02n') {
      const payload = buildReceiptPayload(repair, settings as StoreSettings | null, paperWidth);
      const result = await sendToCleanter(payload);
      setPrintResult(result);
      setPrinting(false);
      if (!result.success) setShowFallback(true);
    } else if (printMode === 'android') {
      setPrinting(false);
      openAndroidPrint();
    } else {
      setPrinting(false);
      openPreviewPrint();
    }
  }

  function openAndroidPrint() {
    const receiptContent = receiptRef.current?.innerHTML ?? '';
    const widthPx = paperWidth === 58 ? 210 : paperWidth === 80 ? 290 : Math.round(paperWidth * 3.6);
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    win.document.write(`<html><head><title>Nota ${repair?.invoice_number ?? ''}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Courier New', monospace; width: ${widthPx}px; padding: 8px; font-size: ${paperWidth === 58 ? '11px' : '13px'}; line-height: 1.5; color: #000; } .center { text-align: center; } .bold { font-weight: bold; } .divider { border-top: 1px dashed #000; margin: 6px 0; } .row { display: flex; justify-content: space-between; } .label { color: #555; } .total { font-size: ${paperWidth === 58 ? '13px' : '15px'}; font-weight: bold; } .section { margin-top: 4px; } .logo { max-width: 120px; max-height: 60px; margin: 0 auto 4px; display: block; }</style></head><body>${receiptContent}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  }

  function openPreviewPrint() {
    const receiptContent = receiptRef.current?.innerHTML ?? '';
    const widthPx = paperWidth === 58 ? 210 : paperWidth === 80 ? 290 : Math.round(paperWidth * 3.6);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Nota-${repair?.invoice_number ?? ''}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Courier New', monospace; width: ${widthPx}px; padding: 8px; font-size: ${paperWidth === 58 ? '11px' : '13px'}; line-height: 1.5; color: #000; } .center { text-align: center; } .bold { font-weight: bold; } .divider { border-top: 1px dashed #000; margin: 6px 0; } .row { display: flex; justify-content: space-between; } .label { color: #555; } .total { font-size: ${paperWidth === 58 ? '13px' : '15px'}; font-weight: bold; } .section { margin-top: 4px; } .logo { max-width: 120px; max-height: 60px; margin: 0 auto 4px; display: block; }</style></head><body>${receiptContent}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); }, 250);
  }

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  if (loading) return <div className="py-8 text-center text-slate-400 text-sm">Memuat data...</div>;
  if (!repair) return <div className="py-8 text-center text-slate-500">Data tidak ditemukan</div>;

  const status = REPAIR_STATUSES.find((s) => s.value === repair.status);
  const s = settings as StoreSettings | null;
  const storeName = s?.store_name ?? 'GM Phone Service';
  const storeAddress = s?.address ?? '';
  const storePhone = s?.phone ?? '';
  const footer = s?.footer ?? 'Terima kasih telah mempercayakan HP Anda kepada kami.';

  const chars = charsForPaper(paperWidth);
  const receiptWidth = paperWidth === 58 ? 'w-[210px]' : paperWidth === 80 ? 'w-[290px]' : `w-[${Math.round(paperWidth * 3.6)}px]`;
  const fontSize = paperWidth === 58 ? 'text-[11px]' : 'text-[13px]';

  const damages = repair.damages ?? [];
  const items = repair.items ?? [];
  const totalSparepart = Number(repair.total_sparepart || repair.sparepart_price);
  const totalService = Number(repair.total_service || repair.installation_fee);

  const modeLabels: Record<string, string> = { rpp02n: 'RPP02N Bluetooth', android: 'Android System Print', preview: 'Preview / PDF' };

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('detail', { id: repairId })} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Preview Nota</h1>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Lebar: {paperWidth} mm ({chars} karakter)</span>
        <span>Mode: {modeLabels[printMode]}</span>
      </div>

      {/* Receipt preview — customer-facing, NO internal info */}
      <div className="flex justify-center py-4 bg-slate-800 rounded-2xl">
        <div ref={receiptRef} className={`bg-white ${receiptWidth} ${fontSize} p-2 font-mono text-black leading-relaxed`} style={{ fontFamily: "'Courier New', monospace" }}>
          <div className="text-center">
            {s?.logo && <img src={s.logo} alt="Logo" className="logo" />}
            <p className="font-bold text-sm">{storeName}</p>
            {storeAddress && <p className="text-[10px]">{storeAddress}</p>}
            {storePhone && <p className="text-[10px]">Telp: {storePhone}</p>}
          </div>
          <div className="border-t border-dashed border-black my-1.5" />
          <div className="text-center">
            <p className="font-bold">NOTA SERVIS</p>
            <p>{repair.invoice_number}</p>
            <p className="text-[10px]">{formatDateTime(repair.created_at)}</p>
          </div>
          <div className="border-t border-dashed border-black my-1.5" />
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-gray-600">Pelanggan</span><span>{repair.customer?.name ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Telp</span><span>{repair.customer?.phone ?? '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">HP</span><span>{repair.device?.brand ?? '-'} {repair.device?.model ?? ''}</span></div>
            {repair.device?.imei && <div className="flex justify-between"><span className="text-gray-600">IMEI</span><span>{repair.device.imei}</span></div>}
          </div>
          <div className="border-t border-dashed border-black my-1.5" />
          {/* Damages */}
          <div className="space-y-0.5">
            <p className="font-bold">KERUSAKAN:</p>
            {damages.length > 0 ? (
              damages.map((d: RepairDamage) => (
                <p key={d.id} className="text-[10px]">• {d.description}</p>
              ))
            ) : (
              <p className="text-[10px]">• {repair.damage_type}</p>
            )}
          </div>
          {/* Sparepart items */}
          {items.length > 0 && (
            <>
              <div className="border-t border-dashed border-black my-1.5" />
              <div className="space-y-0.5">
                <p className="font-bold">SPAREPART:</p>
                {items.map((it: RepairItem) => (
                  <div key={it.id} className="flex justify-between text-[10px]">
                    <span>{it.sparepart_name}</span>
                    <span>{formatRupiah(Number(it.selling_price))}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-black my-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">JASA PASANG:</p>
                {items.map((it: RepairItem) => (
                  <div key={it.id} className="flex justify-between text-[10px]">
                    <span>{it.sparepart_name}</span>
                    <span>{formatRupiah(Number(it.installation_fee))}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="border-t border-dashed border-black my-1.5" />
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="text-gray-600">Total Sparepart</span><span>{formatRupiah(totalSparepart)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Total Jasa</span><span>{formatRupiah(totalService)}</span></div>
            {Number(repair.rounding) !== 0 && (
              <div className="flex justify-between text-[10px]"><span className="text-gray-600">Pembulatan</span><span>{Number(repair.rounding) >= 0 ? '+' : ''}{formatRupiah(Number(repair.rounding))}</span></div>
            )}
            <div className="border-t border-dashed border-black my-0.5" />
            <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>{formatRupiah(Number(repair.total_price))}</span></div>
          </div>
          <div className="border-t border-dashed border-black my-1.5" />
          <div className="space-y-0.5">
            {repair.warranty_days > 0 ? (
              <>
                <p className="font-bold">Garansi: {repair.warranty_days} Hari</p>
                <p className="text-[10px]">Berlaku sampai:</p>
                <p className="text-[10px]">{repair.warranty_end ? formatDate(repair.warranty_end) : '-'}</p>
              </>
            ) : (
              <p>Garansi: Tidak ada</p>
            )}
          </div>
          {(repair.technician_note || repair.customer_note) && (
            <>
              <div className="border-t border-dashed border-black my-1.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Catatan:</p>
                {repair.technician_note && <p className="text-[10px]">{repair.technician_note}</p>}
                {repair.customer_note && <p className="text-[10px]">{repair.customer_note}</p>}
              </div>
            </>
          )}
          <div className="border-t border-dashed border-black my-1.5" />
          <div className="text-center space-y-0.5">
            <p className="text-[10px]">{footer}</p>
            <p className="font-bold">Terima kasih</p>
          </div>
          <div className="border-t border-dashed border-black my-1.5" />
          <div className="text-center text-[9px] text-gray-500"><p>Status: {status?.label}</p></div>
        </div>
      </div>

      {/* Print result message */}
      {printResult && (
        <div className={`rounded-xl p-3 text-sm flex items-start gap-2 ${printResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
          {printResult.success ? <Check className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{printResult.message}</span>
        </div>
      )}

      {/* Fallback buttons when RPP02N fails */}
      {showFallback && !printResult?.success && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700 text-center mb-2">Pencetakan RPP02N gagal. Pilih alternatif:</p>
          <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"><RefreshCw className="w-4 h-4" /> Coba Lagi</button>
          <button onClick={openAndroidPrint} className="w-full flex items-center justify-center gap-2 bg-slate-700 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors"><Printer className="w-4 h-4" /> Cetak Melalui Android</button>
          <button onClick={openPreviewPrint} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors"><FileText className="w-4 h-4" /> Lihat Preview</button>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={handlePrint} disabled={printing} className="flex flex-col items-center gap-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
          {printing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
          <span className="text-xs">{printing ? 'Mengirim...' : 'Cetak'}</span>
        </button>
        <button onClick={openPreviewPrint} className="flex flex-col items-center gap-1 bg-slate-700 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors">
          <Share2 className="w-5 h-5" /><span className="text-xs">PDF</span>
        </button>
        <button onClick={handleSave} className={`flex flex-col items-center gap-1 font-semibold py-3 rounded-xl transition-colors text-white ${saved ? 'bg-emerald-600' : 'bg-slate-600 hover:bg-slate-700'}`}>
          {saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          <span className="text-xs">{saved ? 'OK' : 'Simpan'}</span>
        </button>
      </div>

      <button onClick={() => navigate('detail', { id: repairId })} className="w-full text-slate-500 font-medium py-3 rounded-xl hover:bg-slate-100 transition-colors">Kembali</button>
    </div>
  );
}
