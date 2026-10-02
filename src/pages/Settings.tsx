import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { useSettings } from '@/lib/hooks';
import { ArrowLeft, Save, Store, Tag, DollarSign, Database, Printer, Trash2 } from 'lucide-react';

export function SettingsPage() {
  const { settings, reload } = useSettings();
  const [storeName, setStoreName] = useState('');
  const [storeSubtitle, setStoreSubtitle] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [footer, setFooter] = useState('');
  const [logo, setLogo] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize from loaded settings
  if (settings && storeName === '' && !saved) {
    setStoreName(settings.store_name);
    setStoreSubtitle(settings.store_subtitle ?? 'Dashboard Servis HP');
    setAddress(settings.address);
    setPhone(settings.phone);
    setWhatsapp(settings.whatsapp);
    setFooter(settings.footer);
    setLogo(settings.logo);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!storeName.trim()) return;
    setSaving(true);
    if (settings) {
      await supabase.from('settings').update({
        store_name: storeName,
        store_subtitle: storeSubtitle,
        address,
        phone,
        whatsapp,
        footer,
        logo,
      }).eq('id', settings.id);
    } else {
      await supabase.from('settings').insert({
        store_name: storeName || 'GM Phone Service',
        store_subtitle: storeSubtitle || 'Dashboard Servis HP',
        address,
        phone,
        whatsapp,
        footer,
        logo,
      });
    }
    setSaving(false);
    setSaved(true);
    reload();
    setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800 text-base';
  const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 pt-2">Pengaturan</h1>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Store className="w-4 h-4 text-blue-600" /> Identitas Toko
        </h2>

        <div>
          <label className={labelClass}>Nama Toko / Nama Service</label>
          <input className={inputClass} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="GM Phone Service" />
          {storeName.trim() === '' && <p className="text-xs text-red-500 mt-1">Nama toko tidak boleh kosong</p>}
        </div>
        <div>
          <label className={labelClass}>Subjudul</label>
          <input className={inputClass} value={storeSubtitle} onChange={(e) => setStoreSubtitle(e.target.value)} placeholder="Dashboard Servis HP" />
        </div>
        <div>
          <label className={labelClass}>Alamat</label>
          <textarea className={inputClass + ' min-h-[60px] resize-none'} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Contoh No. 123" />
        </div>
        <div>
          <label className={labelClass}>Nomor Telepon</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
        </div>
        <div>
          <label className={labelClass}>WhatsApp</label>
          <input className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
        </div>
        <div>
          <label className={labelClass}>Footer Nota</label>
          <textarea className={inputClass + ' min-h-[60px] resize-none'} value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Terima kasih..." />
        </div>
        <div>
          <label className={labelClass}>Logo Toko</label>
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                <Store className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <label className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm cursor-pointer hover:bg-slate-200 transition-colors">
              Upload Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            {logo && (
              <button onClick={() => setLogo('')} className="text-red-500 text-sm font-medium">Hapus</button>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !storeName.trim()}
        className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" /> {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
      </button>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 text-center font-medium">
          Pengaturan berhasil disimpan
        </div>
      )}

      <div className="space-y-2 pt-2">
        <h2 className="text-sm font-bold text-slate-700 px-1">Menu Lainnya</h2>
        <button
          onClick={() => navigate('pricing')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-slate-800">Pengaturan Harga</p>
            <p className="text-xs text-slate-500">Faktor risiko & jasa pasang</p>
          </div>
        </button>
        <button
          onClick={() => navigate('printer')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Printer className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-slate-800">Pengaturan Printer</p>
            <p className="text-xs text-slate-500">Ukuran kertas thermal</p>
          </div>
        </button>
        <button
          onClick={() => navigate('backup')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Database className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-slate-800">Backup & Restore</p>
            <p className="text-xs text-slate-500">Ekspor / impor data</p>
          </div>
        </button>
      </div>
    </div>
  );
}
