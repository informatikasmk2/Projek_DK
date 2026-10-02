import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { formatRupiah, todayISO, addDays } from '@/lib/format';
import { calculateItem, calculateMultiItemTotal, getTransactionInstallationFee, generateInvoiceNumber } from '@/lib/pricing';
import { usePricingSettings } from '@/lib/hooks';
import { RISK_LEVELS, WARRANTY_OPTIONS, ROUNDING_OPTIONS } from '@/lib/types';
import type { RiskLevel, RoundingMode, Customer, Device, PricingSetting } from '@/lib/types';
import { ArrowLeft, Check, Phone, Plus, Trash2, Wrench, Package } from 'lucide-react';

interface DamageEntry { id: string; description: string }
interface ItemEntry {
  id: string;
  sparepartName: string;
  costPrice: string;
  riskLevel: RiskLevel;
}

let entryCounter = 0;
function nextId(): string { return `e${++entryCounter}` }

export function NewService() {
  const { pricing, loading: pricingLoading } = usePricingSettings();
  const [step, setStep] = useState(1);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [phoneSearchResults, setPhoneSearchResults] = useState<Customer[]>([]);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [color, setColor] = useState('');

  const [damages, setDamages] = useState<DamageEntry[]>([{ id: nextId(), description: '' }]);
  const [items, setItems] = useState<ItemEntry[]>([
    { id: nextId(), sparepartName: '', costPrice: '', riskLevel: 'sedang' },
  ]);

  const [roundingMode, setRoundingMode] = useState<RoundingMode>('none');
  const [warrantyMode, setWarrantyMode] = useState('0');
  const [warrantyCustom, setWarrantyCustom] = useState('');
  const [techNote, setTechNote] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedId, setSavedId] = useState('');

  const itemCalcs = useMemo(() => {
    return items.map((item) => {
      const cp = parseFloat(item.costPrice) || 0;
      const p = pricing.find((pr) => pr.risk_level === item.riskLevel);
      if (!p || cp <= 0) return null;
      return calculateItem(cp, p.multiplier);
    });
  }, [items, pricing]);

  const transactionFee = useMemo(() => {
    const validItems = items.filter((_, i) => itemCalcs[i] !== null);
    return getTransactionInstallationFee(validItems, pricing);
  }, [items, itemCalcs, pricing]);

  const totals = useMemo(() => {
    const valid = itemCalcs.filter((c): c is NonNullable<typeof c> => c !== null);
    return calculateMultiItemTotal(
      valid.map((c) => ({ sellingPrice: c.sellingPrice })),
      transactionFee,
      roundingMode
    );
  }, [itemCalcs, transactionFee, roundingMode]);

  const warrantyDays = useMemo(() => {
    if (warrantyMode === 'custom') return parseInt(warrantyCustom) || 0;
    return parseInt(warrantyMode);
  }, [warrantyMode, warrantyCustom]);

  const warrantyEnd = useMemo(() => {
    if (warrantyDays <= 0) return null;
    return addDays(todayISO(), warrantyDays);
  }, [warrantyDays]);

  function addDamage() {
    setDamages((prev) => [...prev, { id: nextId(), description: '' }]);
  }
  function removeDamage(id: string) {
    setDamages((prev) => (prev.length > 1 ? prev.filter((d) => d.id !== id) : prev));
  }
  function updateDamage(id: string, description: string) {
    setDamages((prev) => prev.map((d) => (d.id === id ? { ...d, description } : d)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: nextId(), sparepartName: '', costPrice: '', riskLevel: 'sedang' }]);
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }
  function updateItem(id: string, field: keyof ItemEntry, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  async function searchPhone(phone: string) {
    if (phone.length < 4) { setPhoneSearchResults([]); setExistingCustomer(null); return; }
    const { data } = await supabase.from('customers').select('*').ilike('phone', `%${phone}%`).limit(5);
    setPhoneSearchResults((data as Customer[]) ?? []);
  }

  function selectExistingCustomer(c: Customer) {
    setExistingCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setPhoneSearchResults([]);
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = 'Nama pelanggan wajib diisi';
    if (!customerPhone.trim()) e.customerPhone = 'Nomor telepon wajib diisi';
    if (!brand.trim()) e.brand = 'Merk HP wajib diisi';
    if (!model.trim()) e.model = 'Tipe HP wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    const validDamages = damages.filter((d) => d.description.trim());
    if (validDamages.length === 0) e.damages = 'Minimal 1 kerusakan wajib diisi';
    for (const item of items) {
      if (item.sparepartName.trim() && !item.costPrice.trim()) {
        e[`item_${item.id}`] = 'Harga modal wajib diisi';
      } else if (item.sparepartName.trim() && (isNaN(parseFloat(item.costPrice)) || parseFloat(item.costPrice) < 0)) {
        e[`item_${item.id}`] = 'Harga modal harus berupa angka';
      }
    }
    if (warrantyMode === 'custom' && (!warrantyCustom || parseInt(warrantyCustom) <= 0))
      e.warrantyCustom = 'Masukkan jumlah hari yang valid';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validateStep2() || totals.total <= 0) return;
    setSaving(true);
    try {
      let customerId = existingCustomer?.id;
      if (!customerId) {
        const { data: cust } = await supabase.from('customers').insert({ name: customerName.trim(), phone: customerPhone.trim() }).select().single();
        customerId = (cust as Customer)?.id;
      }
      let deviceId: string | undefined;
      if (customerId) {
        const { data: dev } = await supabase.from('devices').insert({
          customer_id: customerId, brand: brand.trim(), model: model.trim(),
          imei: imei.trim() || null, color: color.trim() || null,
        }).select().single();
        deviceId = (dev as Device)?.id;
      }

      const { data: invoices } = await supabase.from('repairs').select('invoice_number');
      const invoiceNumber = generateInvoiceNumber((invoices as { invoice_number: string }[])?.map((r) => r.invoice_number) ?? []);

      const validDamages = damages.filter((d) => d.description.trim());
      const damageSummary = validDamages.map((d) => d.description.trim()).join(', ');
      const firstItem = itemCalcs.findIndex((c) => c !== null);

      const { data: repair } = await supabase.from('repairs').insert({
        invoice_number: invoiceNumber,
        customer_id: customerId,
        device_id: deviceId,
        damage_type: damageSummary,
        damage_description: null,
        sparepart_name: items.find((i) => i.sparepartName.trim())?.sparepartName ?? null,
        technician_note: techNote.trim() || null,
        customer_note: customerNote.trim() || null,
        status: 'menunggu',
        risk_level: items[firstItem >= 0 ? firstItem : 0]?.riskLevel ?? 'sedang',
        risk_multiplier: itemCalcs[firstItem >= 0 ? firstItem : 0]?.multiplier ?? 1.65,
        installation_fee: totals.totalService,
        cost_price: itemCalcs.find((c) => c !== null)?.costPrice ?? 0,
        sparepart_price: totals.totalSparepart,
        rounding: totals.rounding,
        total_price: totals.total,
        total_sparepart: totals.totalSparepart,
        total_service: totals.totalService,
        warranty_days: warrantyDays,
        warranty_start: warrantyDays > 0 ? todayISO() : null,
        warranty_end: warrantyEnd,
      }).select().single();

      const repairId = (repair as { id: string })?.id;
      if (repairId) {
        for (const d of validDamages) {
          await supabase.from('repair_damages').insert({ repair_id: repairId, description: d.description.trim() });
        }
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
            installation_fee: 0,
            subtotal: calc.sellingPrice,
          });
        }
      }

      setSavedId(repairId);
      setSuccess(true);
    } catch {
      setErrors({ submit: 'Gagal menyimpan servis. Coba lagi.' });
    }
    setSaving(false);
  }

  if (success) {
    return (
      <div className="py-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="w-8 h-8 text-emerald-600" strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Servis Berhasil Disimpan</h2>
        <div className="w-full space-y-3 max-w-xs">
          <button onClick={() => navigate('receipt', { id: savedId })} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-sm hover:bg-blue-700 transition-colors">Cetak Nota</button>
          <button onClick={() => navigate('new-service')} className="w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors">Servis Baru</button>
          <button onClick={() => navigate('dashboard')} className="w-full text-slate-500 font-medium py-3 rounded-xl hover:bg-slate-100 transition-colors">Kembali ke Dashboard</button>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800 text-base';
  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';
  const errorClass = 'text-xs text-red-500 mt-1';

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('dashboard')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Servis Baru</h1>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      {/* Step 1: Customer & Device */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Data Pelanggan</h2>
            <div>
              <label className={labelClass}>Nama Pelanggan *</label>
              <input className={inputClass} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Contoh: Budi" />
              {errors.customerName && <p className={errorClass}>{errors.customerName}</p>}
            </div>
            <div>
              <label className={labelClass}>Nomor Telepon *</label>
              <div className="relative">
                <input className={inputClass} value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); searchPhone(e.target.value); }} placeholder="08xxxxxxxxxx" inputMode="tel" />
                {phoneSearchResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {phoneSearchResults.map((c) => (
                      <button key={c.id} onClick={() => selectExistingCustomer(c)} className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100 last:border-0">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <div><p className="text-sm font-medium text-slate-700">{c.name}</p><p className="text-xs text-slate-400">{c.phone}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.customerPhone && <p className={errorClass}>{errors.customerPhone}</p>}
              {existingCustomer && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Pelanggan lama ditemukan</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Data HP</h2>
            <div>
              <label className={labelClass}>Merk HP *</label>
              <input className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Contoh: Samsung" />
              {errors.brand && <p className={errorClass}>{errors.brand}</p>}
            </div>
            <div>
              <label className={labelClass}>Tipe HP *</label>
              <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Contoh: Galaxy A52" />
              {errors.model && <p className={errorClass}>{errors.model}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>IMEI (opsional)</label><input className={inputClass} value={imei} onChange={(e) => setImei(e.target.value)} placeholder="123456789012345" inputMode="numeric" /></div>
              <div><label className={labelClass}>Warna (opsional)</label><input className={inputClass} value={color} onChange={(e) => setColor(e.target.value)} placeholder="Hitam" /></div>
            </div>
          </div>

          <button onClick={() => { if (validateStep1()) setStep(2); }} className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:bg-blue-700 transition-colors">Lanjut</button>
        </div>
      )}

      {/* Step 2: Damages & Spareparts */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Multi-damage */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" /> Kerusakan
            </h2>
            {damages.map((d, idx) => (
              <div key={d.id} className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={d.description}
                  onChange={(e) => updateDamage(d.id, e.target.value)}
                  placeholder={`Kerusakan #${idx + 1}`}
                />
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
            {errors.damages && <p className={errorClass}>{errors.damages}</p>}
          </div>

          {/* Multi-sparepart */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" /> Sparepart
            </h2>
            {items.map((item, idx) => {
              const calc = itemCalcs[idx];
              const p = pricing.find((pr) => pr.risk_level === item.riskLevel);
              return (
                <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Sparepart #{idx + 1}</span>
                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Sparepart</label>
                    <input className={inputClass + ' py-2.5 text-sm'} value={item.sparepartName} onChange={(e) => updateItem(item.id, 'sparepartName', e.target.value)} placeholder="Contoh: LCD" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Harga Modal</label>
                    <input className={inputClass + ' py-2.5 text-sm'} value={item.costPrice} onChange={(e) => updateItem(item.id, 'costPrice', e.target.value.replace(/[^0-9]/g, ''))} placeholder="300000" inputMode="numeric" />
                    {errors[`item_${item.id}`] && <p className={errorClass}>{errors[`item_${item.id}`]}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Risiko</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {RISK_LEVELS.map((r) => (
                        <button key={r.value} onClick={() => updateItem(item.id, 'riskLevel', r.value)}
                          className={`py-2 rounded-lg font-medium text-xs border-2 transition-all ${item.riskLevel === r.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {calc && p && (
                    <div className="bg-slate-50 rounded-lg p-2.5 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Modal</span><span>{formatRupiah(calc.costPrice)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Faktor</span><span>×{calc.multiplier}</span></div>
                      <div className="flex justify-between font-medium"><span className="text-slate-600">Harga Sparepart</span><span>{formatRupiah(calc.sellingPrice)}</span></div>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addItem} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-medium text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">
              <Plus className="w-4 h-4" /> Tambah Sparepart
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">Kembali</button>
            <button onClick={() => { if (validateStep2()) setStep(3); }} className="flex-1 bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:bg-blue-700 transition-colors">Lanjut</button>
          </div>
        </div>
      )}

      {/* Step 3: Totals, Warranty, Notes */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Calculation summary */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ringkasan Harga</h3>
            {itemCalcs.map((c, i) => c && (
              <div key={i} className="text-xs text-slate-400">
                {items[i].sparepartName || `Item ${i + 1}`}: {formatRupiah(c.sellingPrice)}
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-slate-700"><span className="text-slate-300">Total Sparepart</span><span>{formatRupiah(totals.totalSparepart)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-300">Jasa Pasang (1×)</span><span>{formatRupiah(totals.totalService)}</span></div>
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
            {warrantyMode === 'custom' && (
              <div>
                <input className={inputClass} value={warrantyCustom} onChange={(e) => setWarrantyCustom(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Jumlah hari" inputMode="numeric" />
                {errors.warrantyCustom && <p className={errorClass}>{errors.warrantyCustom}</p>}
              </div>
            )}
            {warrantyEnd && <p className="text-xs text-emerald-600">Garansi berakhir: {warrantyEnd}</p>}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Catatan</h2>
            <div><label className={labelClass}>Catatan Teknisi</label><textarea className={inputClass + ' min-h-[60px] resize-none'} value={techNote} onChange={(e) => setTechNote(e.target.value)} placeholder="LCD ada shadow, body lecet, fingerprint normal..." /></div>
            <div><label className={labelClass}>Catatan Pelanggan</label><textarea className={inputClass + ' min-h-[60px] resize-none'} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} placeholder="Catatan dari pelanggan..." /></div>
          </div>

          {errors.submit && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{errors.submit}</div>}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-200 transition-colors">Kembali</button>
            <button onClick={handleSave} disabled={saving || pricingLoading} className="flex-1 bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Servis'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
