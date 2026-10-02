import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { formatRupiah, formatDate, formatDateTime, isWarrantyActive } from '@/lib/format';
import { REPAIR_STATUSES } from '@/lib/types';
import type { RepairWithDetails, RepairStatus, RepairDamage, RepairItem } from '@/lib/types';
import { ArrowLeft, Pencil, Printer, Trash2, MessageCircle, Phone, Smartphone, Wrench, StickyNote, Shield, Package } from 'lucide-react';

export function ServiceDetail({ repairId }: { repairId: string }) {
  const [repair, setRepair] = useState<RepairWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

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

  async function updateStatus(status: RepairStatus) {
    setStatusUpdating(true);
    await supabase.from('repairs').update({ status, updated_at: new Date().toISOString() }).eq('id', repairId);
    await loadRepair();
    setStatusUpdating(false);
  }

  async function handleDelete() {
    await supabase.from('repairs').delete().eq('id', repairId);
    navigate('history');
  }

  function sendWhatsApp() {
    if (!repair) return;
    const phone = (repair.customer?.phone ?? '').replace(/[^0-9]/g, '');
    const wp = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    const damages = repair.damages?.map((d: RepairDamage) => `- ${d.description}`).join('\n') ?? `- ${repair.damage_type}`;
    const spareparts = repair.items?.map((it: RepairItem) => `- ${it.sparepart_name} ${formatRupiah(Number(it.selling_price))}`).join('\n') ?? '';
    const jasa = repair.items?.map((it: RepairItem) => `- ${it.sparepart_name} ${formatRupiah(Number(it.installation_fee))}`).join('\n') ?? '';
    const warrantyText = repair.warranty_days > 0 ? `${repair.warranty_days} Hari` : 'Tidak ada';
    const msg = `Halo ${repair.customer?.name ?? 'Pelanggan'},\n\nServis HP Anda:\n\nHP: ${repair.device?.brand ?? '-'} ${repair.device?.model ?? ''}\n\nKerusakan:\n${damages}\n${spareparts ? `\nSparepart:\n${spareparts}\n` : ''}${jasa ? `\nJasa Pasang:\n${jasa}\n` : ''}\nTotal Sparepart: ${formatRupiah(Number(repair.total_sparepart || repair.sparepart_price))}\nTotal Jasa: ${formatRupiah(Number(repair.total_service || repair.installation_fee))}\n\nTOTAL: ${formatRupiah(Number(repair.total_price))}\n\nGaransi: ${warrantyText}\n\nTerima kasih.`;
    window.open(`https://wa.me/${wp}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  if (loading) return <div className="py-8 text-center text-slate-400 text-sm">Memuat data...</div>;
  if (!repair) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-500 mb-4">Data servis tidak ditemukan</p>
        <button onClick={() => navigate('history')} className="text-blue-600 font-medium">Kembali ke Riwayat</button>
      </div>
    );
  }

  const status = REPAIR_STATUSES.find((s) => s.value === repair.status);
  const warrantyActive = isWarrantyActive(repair.warranty_end);
  const damages = repair.damages ?? [];
  const items = repair.items ?? [];
  const totalSparepart = Number(repair.total_sparepart || repair.sparepart_price);
  const totalService = Number(repair.total_service || repair.installation_fee);

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('history')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Detail Servis</h1>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-400">{repair.invoice_number}</span>
          <span className={`inline-block text-xs px-3 py-1 rounded-full border ${status?.color}`}>{status?.label}</span>
        </div>
        <p className="text-xs text-slate-400">{formatDateTime(repair.created_at)}</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Data Pelanggan</h2>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Phone className="w-4 h-4 text-blue-600" /></div>
          <div><p className="font-semibold text-slate-800">{repair.customer?.name ?? 'Pelanggan tidak ditemukan'}</p><p className="text-sm text-slate-500">{repair.customer?.phone ?? '-'}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Data HP</h2>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Smartphone className="w-4 h-4 text-indigo-600" /></div>
          <div>
            <p className="font-semibold text-slate-800">{repair.device?.brand ?? '-'} {repair.device?.model ?? ''}</p>
            {repair.device?.imei && <p className="text-xs text-slate-500">IMEI: {repair.device.imei}</p>}
            {repair.device?.color && <p className="text-xs text-slate-500">Warna: {repair.device.color}</p>}
          </div>
        </div>
      </div>

      {/* Damages */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-amber-600" /> Kerusakan
        </h2>
        {damages.length > 0 ? (
          <ul className="space-y-1">
            {damages.map((d: RepairDamage) => (
              <li key={d.id} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="text-slate-400 mt-0.5">•</span> {d.description}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{repair.damage_type}</p>
        )}
      </div>

      {/* Sparepart items */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" /> Sparepart
          </h2>
          {items.map((it: RepairItem) => (
            <div key={it.id} className="border border-slate-100 rounded-xl p-3 space-y-1">
              <p className="font-semibold text-sm text-slate-800">{it.sparepart_name}</p>
              <div className="flex justify-between text-xs text-slate-500"><span>Harga Sparepart</span><span>{formatRupiah(Number(it.selling_price))}</span></div>
              <div className="flex justify-between text-xs text-slate-500"><span>Jasa Pasang</span><span>{formatRupiah(Number(it.installation_fee))}</span></div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-100"><span>Subtotal</span><span className="text-blue-600">{formatRupiah(Number(it.subtotal))}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ringkasan Harga</h2>
        <div className="flex justify-between text-sm"><span className="text-slate-300">Total Sparepart</span><span>{formatRupiah(totalSparepart)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-300">Total Jasa</span><span>{formatRupiah(totalService)}</span></div>
        {Number(repair.rounding) !== 0 && (
          <div className="flex justify-between text-sm pt-1 border-t border-slate-700"><span className="text-slate-300">Pembulatan</span><span>{Number(repair.rounding) >= 0 ? '+' : ''}{formatRupiah(Number(repair.rounding))}</span></div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700"><span>TOTAL</span><span className="text-blue-400">{formatRupiah(Number(repair.total_price))}</span></div>
      </div>

      {/* Warranty */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Garansi</h2>
        </div>
        {repair.warranty_days > 0 ? (
          <div className="space-y-1">
            <p className="text-sm text-slate-700">{repair.warranty_days} Hari</p>
            <p className="text-xs text-slate-500">Mulai: {repair.warranty_start ? formatDate(repair.warranty_start) : '-'}</p>
            <p className="text-xs text-slate-500">Berakhir: {repair.warranty_end ? formatDate(repair.warranty_end) : '-'}</p>
            <span className={`inline-block text-xs px-3 py-1 rounded-full border mt-1 ${warrantyActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
              {warrantyActive ? 'GARANSI AKTIF' : 'GARANSI BERAKHIR'}
            </span>
          </div>
        ) : <p className="text-sm text-slate-500">Tidak ada garansi</p>}
      </div>

      {/* Notes */}
      {(repair.technician_note || repair.customer_note) && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2"><StickyNote className="w-5 h-5 text-slate-500" /> Catatan</h2>
          {repair.technician_note && <div><p className="text-xs font-semibold text-slate-500 mb-0.5">Teknisi</p><p className="text-sm text-slate-700">{repair.technician_note}</p></div>}
          {repair.customer_note && <div><p className="text-xs font-semibold text-slate-500 mb-0.5">Pelanggan</p><p className="text-sm text-slate-700">{repair.customer_note}</p></div>}
        </div>
      )}

      {/* Status changer */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">Ubah Status</h2>
        <div className="grid grid-cols-2 gap-2">
          {REPAIR_STATUSES.map((s) => (
            <button key={s.value} onClick={() => updateStatus(s.value)} disabled={statusUpdating}
              className={`py-2.5 rounded-xl font-medium text-sm border-2 transition-all ${repair.status === s.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('edit-service', { id: repairId })} className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors"><Pencil className="w-4 h-4" /> Edit</button>
        <button onClick={() => navigate('receipt', { id: repairId })} className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors"><Printer className="w-4 h-4" /> Cetak Nota</button>
        <button onClick={sendWhatsApp} className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors"><MessageCircle className="w-4 h-4" /> Kirim WhatsApp</button>
        <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /> Hapus</button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-red-600" /></div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Hapus Transaksi?</h3>
            <p className="text-sm text-slate-500 text-center mb-4">Data servis akan dihapus permanen dan tidak dapat dikembalikan.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={handleDelete} className="bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
