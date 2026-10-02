import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { usePricingSettings } from '@/lib/hooks';
import { formatRupiah } from '@/lib/format';
import { ArrowLeft, Save } from 'lucide-react';
import type { RiskLevel } from '@/lib/types';

export function PricingPage() {
  const { pricing, reload } = usePricingSettings();
  const [values, setValues] = useState<Record<string, { multiplier: string; installation_fee: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize values from loaded pricing
  if (pricing.length > 0 && Object.keys(values).length === 0 && !saved) {
    const init: Record<string, { multiplier: string; installation_fee: string }> = {};
    pricing.forEach((p) => {
      init[p.risk_level] = { multiplier: String(p.multiplier), installation_fee: String(p.installation_fee) };
    });
    setValues(init);
  }

  async function handleSave() {
    setSaving(true);
    for (const p of pricing) {
      const v = values[p.risk_level];
      if (v) {
        await supabase.from('pricing_settings').update({
          multiplier: parseFloat(v.multiplier),
          installation_fee: parseFloat(v.installation_fee),
        }).eq('id', p.id);
      }
    }
    setSaving(false);
    setSaved(true);
    reload();
    setTimeout(() => setSaved(false), 2000);
  }

  const labels: Record<string, string> = { ringan: 'Ringan', sedang: 'Sedang', sulit: 'Sulit' };
  const colors: Record<string, string> = {
    ringan: 'border-emerald-200 bg-emerald-50',
    sedang: 'border-blue-200 bg-blue-50',
    sulit: 'border-red-200 bg-red-50',
  };

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('settings')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Pengaturan Harga</h1>
      </div>

      <p className="text-sm text-slate-500 px-1">
        Ubah faktor risiko dan jasa pasang. Perubahan otomatis berlaku untuk servis baru.
      </p>

      {pricing.map((p) => (
        <div key={p.id} className={`bg-white rounded-2xl p-4 border-2 ${colors[p.risk_level] ?? 'border-slate-100'} shadow-sm space-y-3`}>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Risiko {labels[p.risk_level] ?? p.risk_level}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Faktor Modal</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-base"
                value={values[p.risk_level]?.multiplier ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [p.risk_level]: { ...prev[p.risk_level], multiplier: e.target.value.replace(/[^0-9.]/g, '') },
                  }))
                }
                inputMode="decimal"
                placeholder="1.5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jasa Pasang</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-base"
                value={values[p.risk_level]?.installation_fee ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [p.risk_level]: { ...prev[p.risk_level], installation_fee: e.target.value.replace(/[^0-9]/g, '') },
                  }))
                }
                inputMode="numeric"
                placeholder="50000"
              />
            </div>
          </div>
          {values[p.risk_level] && (
            <p className="text-xs text-slate-500">
              Contoh: Modal Rp83.000 × {values[p.risk_level].multiplier || p.multiplier} = {formatRupiah(83000 * parseFloat(values[p.risk_level].multiplier || '0'))}
            </p>
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" /> {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Pengaturan Harga'}
      </button>
    </div>
  );
}
