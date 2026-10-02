import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { formatRupiah, todayISO, addDays } from '@/lib/format';
import { calculateItem, calculateMultiItemTotal } from '@/lib/pricing';
import { usePricingSettings } from '@/lib/hooks';
import { RISK_LEVELS, WARRANTY_OPTIONS, ROUNDING_OPTIONS, REPAIR_STATUSES } from '@/lib/types';
import type { RiskLevel, RoundingMode, RepairWithDetails, RepairDamage, RepairItem, PricingSetting } from '@/lib/types';
import { ArrowLeft, Plus, Trash2, Wrench, Package } from 'lucide-react';

interface DamageEntry { id: string; description: string; dbId?: string }
interface ItemEntry {
  id: string;
  sparepartName: string;
  costPrice: string;
  riskLevel: RiskLevel;
  dbId?: string;
}

let editCounter = 0;
function nextEditId(): string { return `ed${++editCounter}` }

export function EditService({ repairId }: { repairId: string }) {
  const { pricing } = usePricingSettings();
  const [repair, setRepair] = useState<RepairWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [color, setColor] = useState('');

  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [items, setItems] = useState<ItemEntry[]>([]);
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('none');
  const [warrantyMode, setWarrantyMode] = useState('0');
  const [warrantyCustom, setWarrantyCustom] = useState('');
  const [techNote, setTechNote] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [status, setStatus] = useState('menunggu');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRepair(); }, [repairId]);

  async function loadRepair() {
    const { data } = await supabase
      .from('repairs')
      .select('*, customer:customers(*), device:devices(*), damages:repair_damages(*), items:repair_items(*)')
      .eq('id', repairId)
      .maybeSingle();
    const r = data as unknown as RepairWithDetails;
    if (r) {
      setRepair(r);
      setCustomerName(r.customer?.name ?? '');
      setCustomerPhone(r.customer?.phone ?? '');
      setBrand(r.device?.brand ?? '');
      setModel(r.device?.model ?? '');
      setImei(r.device?.imei ?? '');
      setColor(r.device?.color ?? '');
      setDamages((r.damages ?? []).map((d: RepairDamage) => ({ id: nextEditId(), description: d.description, dbId: d.id })));
      if (r.damages.length === 0) setDamages([{ id: nextEditId(), description: r.damage_type || '' }]);
      setItems((r.items ?? []).map((it: RepairItem) => ({
        id: nextEditId(),
        sparepartName: it.sparepart_name,
        costPrice: String(it.cost_price),
        riskLevel: it.risk_level,
        dbId: it.id,
      })));
      if (r.items.length === 0 && r.cost_price > 0) {
        setItems([{ id: nextEditId(), sparepartName: r.sparepart_name ?? '', costPrice: String(r.cost_price), riskLevel: r.risk_level }]);
      }
      setRoundingMode(r.rounding === 0 ? 'none' : Math.abs(r.rounding) <= 500 ? '500' : Math.abs(r.rounding) <= 1000 ? '1000' : Math.abs(r.rounding) <= 5000 ? '5000' : '10000');
      setWarrantyMode(r.warranty_days === 0 ? '0' : ['3','7','14','30'].includes(String(r.warranty_days)) ? String(r.warranty_days) : 'custom');
      if (!['0','3','7','14','30'].includes(String(r.warranty_days))) setWarrantyCustom(String(r.warranty_days));
      setTechNote(r.technician_note ?? '');
      setCustomerNote(r.customer_note ?? '');
      setStatus(r.status);
    }
    setLoading(false);
  }

  const itemCalcs = useMemo(() => {
    return items.map((item) => {
      const cp = parseFloat(item.costPrice) || 0;
      const p = pricing.find((pr) => pr.risk_level === item.riskLevel);
      if (!p || cp <= 0) return null;
      return calculateItem(cp, p.multiplier, p.installation_fee);
    });
  }, [items, pricing]);

  const totals = useMemo(() => {
    const valid = itemCalcs.filter((c): c is NonNullable<typeof c> => c !== null);
    return calculateMultiItemTotal(
      valid.map((c) => ({ sellingPrice: c.sellingPrice, installationFee: c.installationFee })),
      roundingMode
    );
  }, [itemCalcs, roundingMode]);

  const warrantyDays = useMemo(() => {
    if (warrantyMode === 'custom') return parseInt(warrantyCustom) || 0;
    return parseInt(warrantyMode);
  }, [warrantyMode, warrantyCustom]);

  function addDamage() { setDamages((prev) => [...prev, { id: nextEditId(), description: '' }]); }
  function removeDamage(id: string) { setDamages((prev) => prev.length > 1 ? prev.filter((d) => d.id !== id) : prev); }
  function updateDamage(id: string, description: string) { setDamages((prev) => prev.map((d) => d.id === id ? { ...d, description } : d)); }
  function addItem() { setItems((prev) => [...prev, { id: nextEditId(), sparepartName: '', costPrice: '', riskLevel: 'sedang' }]); }
  function removeItem(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)); }
  function updateItem(id: string, field: keyof ItemEntry, value: string) { setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i)); }

  async function handleSave() {
    if (!repair) return;
    setSaving(true);
    try {
      await supabase.from('customers').update({ name: customerName.trim(), phone: customerPhone.trim() }).eq('id', repair.customer_id);
      await supabase.from('devices').update({ brand: brand.trim(), model: model.trim(), imei: imei.trim() || null, color: color.trim() || null }).eq('id', repair.device_id);

      const validDamages = damages.filter((d) => d.description.trim());
      const damageSummary = validDamages.map((d) => d.description.trim()).join(', ');
      const firstValidCalc = itemCalcs.findIndex((c) => c !== null);

      const warrantyStart = warrantyDays > 0 ? (repair.warranty_start ?? todayISO()) : null;
      const warrantyEnd = warrantyDays > 0 ? addDays(warrantyStart!, warrantyDays) : null;

      await supabase.from('repairs').update({
        damage_type: damageSummary,
        sparepart_name: items.find((i) => i.sparepartName.trim())?.sparepartName ?? null,
        technician_note: techNote.trim() || null,
        customer_note: customerNote.trim() || null,
        status,
        risk_level: items[firstValidCalc >= 0 ? firstValidCalc : 0]?.riskLevel ?? 'sedang',
        risk_multiplier: itemCalcs[firstValidCalc >= 0 ? firstValidCalc : 0]?.multiplier ?? 1.65,
        installation_fee: totals.totalService,
        cost_price: itemCalcs.find((c) => c !== null)?.costPrice ?? 0,
        sparepart_price: totals.totalSparepart,
        rounding: totals.rounding,
        total_price: totals.total,
        total_sparepart: totals.totalSparepart,
        total_service: totals.totalService,
        warranty_days: warrantyDays,
        warranty_start: warrantyStart,
        warranty_end: warrantyEnd,
        updated_at: new Date().toISOString(),
      }).eq('id', repairId);

      // Replace damages
      await supabase.from('repair_damages').delete().eq('repair_id', repairId);
      for (const d of validDamages) {
        await supabase.from('repair_damages').insert({ repair_id: repairId, description: d.description.trim() });
      }

      // Replace items
      await supabase.from('repair_items').delete().eq('repair_id', repairId);
      for (let i = 0; i < items.length; i++) {
        const calc = itemCalcs[i];
        const item = items[i];
        if (!calc || !item.sparepartName.trim()) continue;
        await supabase.from('repair_items').insert({
          repair_id: repairId,
          sparepart_name: item.sparepartName.trim(),
          cost_price: calc.costPrice,
          risk_level: item.riskLevel,
          risk_multiplier: calc.multiplier,
          selling_price: calc.sellingPrice,
          installation_fee: calc.installationFee,
          subtotal: calc.subtotal,
        });
      }

      navigate('detail', { id: repairId });
    } catch {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-8 text-center text-slate-400 text-sm">Memuat data...</div>;
  if (!repair) return <div className="py-8 text-center text-slate-500">Data tidak ditemukan</div>;

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800 text-base';
  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('detail', { id: repairId })} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Edit Servis</h1>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Data Pelanggan</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Nama</label><input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
          <div><label className={labelClass}>Telepon</label><input className={inputClass} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" /></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Data HP</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Merk</label><input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
          <div><label className={labelClass}>Tipe</label><input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} /></div>
          <div><label className={labelClass}>IMEI</label><input className={inputClass} value={imei} onChange={(e) => setImei(e.target.value)} /></div>
          <div><label className={labelClass}>Warna</label><input className={inputClass} value={color} onChange={(e) => setColor(e.target.value)} /></div>
        </div>
      </div>

      {/* Multi-damage */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-600" /> Kerusakan
        </h2>
        {damages.map((d, idx) => (
          <div key={d.id} className="flex items-center gap-2">
            <input className={inputClass} value={d.description} onChange={(e) => updateDamage(d.id, e.target.value)} placeholder={`Kerusakan #${idx + 1}`} />
            {damages.length > 1 && (
              <button onClick={() => removeDamage(d.id)} className="shrink-0 w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            )}
          </div>
        ))}
        <button onClick={addDamage} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-medium text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Kerusakan
        </button>
      </div>

      {/* Multi-sparepart */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" /> Sparepart
        </h2>
        {items.map((item, idx) => {
          const calc = itemCalcs[idx];
          return (
            <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Sparepart #{idx + 1}</span>
                <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Nama</label><input className={inputClass + ' py-2.5 text-sm'} value={item.sparepartName} onChange={(e) => updateItem(item.id, 'sparepartName', e.target.value)} placeholder="LCD" /></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Harga Modal</label><input className={inputClass + ' py-2.5 text-sm'} value={item.costPrice} onChange={(e) => updateItem(item.id, 'costPrice', e.target.value.replace(/[^0-9]/g, ''))} placeholder="300000" inputMode="numeric" /></div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Risiko</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {RISK_LEVELS.map((r) => (
                    <button key={r.value} onClick={() => updateItem(item.id, 'riskLevel', r.value)} className={`py-2 rounded-lg font-medium text-xs border-2 transition-all ${item.riskLevel === r.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{r.label}</button>
                  ))}
                </div>
              </div>
              {calc && (
                <div className="bg-slate-50 rounded-lg p-2.5 text-xs space-y-1">
                  <div className="flex justify-between font-medium"><span className="text-slate-600">Harga Sparepart</span><span>{formatRupiah(calc.sellingPrice)}</span></div>
                  <div className="flex justify-between font-medium"><span className="text-slate-600">Jasa Pasang</span><span>{formatRupiah(calc.installationFee)}</span></div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200"><span>Subtotal</span><span className="text-blue-600">{formatRupiah(calc.subtotal)}</span></div>
                </div>
              )}
            </div>
          );
        })}
        <button onClick={addItem} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-medium text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">
          <Plus className="w-4 h-4" /> Tambah Sparepart
        </button>
      </div>

      {/* Totals */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white space-y-2">
        <div className="flex justify-between text-sm"><span className="text-slate-300">Total Sparepart</span><span>{formatRupiah(totals.totalSparepart)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-300">Total Jasa</span><span>{formatRupiah(totals.totalService)}</span></div>
        {roundingMode !== 'none' && (
          <>
            <div className="flex justify-between text-sm pt-1 border-t border-slate-700"><span className="text-slate-300">Subtotal</span><span>{formatRupiah(totals.subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-300">Pembulatan</span><span>{totals.rounding >= 0 ? '+' : ''}{formatRupiah(totals.rounding)}</span></div>
          </>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-700"><span>TOTAL</span><span className="text-blue-400">{formatRupiah(totals.total)}</span></div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Pembulatan</h2>
        <div className="grid grid-cols-2 gap-2">
          {ROUNDING_OPTIONS.map((r) => (
            <button key={r.value} onClick={() => setRoundingMode(r.value)} className={`py-2.5 rounded-xl font-medium text-sm border-2 transition-all ${roundingMode === r.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Garansi</h2>
        <div className="grid grid-cols-3 gap-2">
          {WARRANTY_OPTIONS.map((w) => (
            <button key={w.value} onClick={() => setWarrantyMode(w.value)} className={`py-2.5 rounded-xl font-medium text-xs border-2 transition-all ${warrantyMode === w.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{w.label}</button>
          ))}
        </div>
        {warrantyMode === 'custom' && <input className={inputClass} value={warrantyCustom} onChange={(e) => setWarrantyCustom(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Jumlah hari" inputMode="numeric" />}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Status</h2>
        <div className="grid grid-cols-2 gap-2">
          {REPAIR_STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatus(s.value)} className={`py-2.5 rounded-xl font-medium text-sm border-2 transition-all ${status === s.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Catatan</h2>
        <div><label className={labelClass}>Catatan Teknisi</label><textarea className={inputClass + ' min-h-[60px] resize-none'} value={techNote} onChange={(e) => setTechNote(e.target.value)} /></div>
        <div><label className={labelClass}>Catatan Pelanggan</label><textarea className={inputClass + ' min-h-[60px] resize-none'} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} /></div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('detail', { id: repairId })} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
      </div>
    </div>
  );
}
