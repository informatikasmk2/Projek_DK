import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { ArrowLeft, Download, Upload, AlertTriangle, Trash2 } from 'lucide-react';

export function BackupPage() {
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showSampleConfirm, setShowSampleConfirm] = useState(false);

  async function deleteSampleData() {
    setMessage('');
    setError('');
    try {
      await supabase.from('repairs').delete().in('invoice_number', ['GPS-20260929-0001', 'GPS-20260929-0002', 'GPS-20260928-0003', 'GPS-20260920-0004']);
      await supabase.from('devices').delete().in('id', ['b1b1b1b1-0001-0000-0000-000000000001', 'b1b1b1b1-0002-0000-0000-000000000002', 'b1b1b1b1-0003-0000-0000-000000000003', 'b1b1b1b1-0004-0000-0000-000000000004']);
      await supabase.from('customers').delete().in('id', ['a1a1a1a1-0001-0000-0000-000000000001', 'a1a1a1a1-0002-0000-0000-000000000002', 'a1a1a1a1-0003-0000-0000-000000000003']);
      setMessage('Data sample berhasil dihapus.');
      setShowSampleConfirm(false);
    } catch {
      setError('Gagal menghapus data sample.');
    }
  }

  async function handleBackup(format: 'json' | 'csv') {
    setMessage('');
    setError('');
    try {
      const [customers, devices, repairs, settings, pricing] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('devices').select('*'),
        supabase.from('repairs').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('pricing_settings').select('*'),
      ]);

      if (format === 'json') {
        const data = {
          exportDate: new Date().toISOString(),
          customers: customers.data,
          devices: devices.data,
          repairs: repairs.data,
          settings: settings.data,
          pricing_settings: pricing.data,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `gm-phone-service-backup-${new Date().toISOString().split('T')[0]}.json`);
        setMessage('Backup JSON berhasil diunduh');
      } else {
        const csv = repairsToCSV(repairs.data ?? []);
        downloadBlob(new Blob([csv], { type: 'text/csv' }), `gm-phone-service-repairs-${new Date().toISOString().split('T')[0]}.csv`);
        setMessage('Backup CSV berhasil diunduh');
      }
    } catch {
      setError('Gagal membuat backup');
    }
  }

  function repairsToCSV(repairs: any[]): string {
    if (repairs.length === 0) return 'No data';
    const headers = Object.keys(repairs[0]);
    const rows = repairs.map((r) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRestoreUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        setRestoreData(data);
        setShowRestoreConfirm(true);
      } catch {
        setError('File tidak valid. Pastikan file backup JSON yang benar.');
      }
    };
    reader.readAsText(file);
  }

  async function performRestore() {
    if (!restoreData) return;
    setMessage('');
    setError('');
    try {
      if (restoreData.customers) {
        for (const c of restoreData.customers) {
          await supabase.from('customers').upsert(c, { onConflict: 'id' });
        }
      }
      if (restoreData.devices) {
        for (const d of restoreData.devices) {
          await supabase.from('devices').upsert(d, { onConflict: 'id' });
        }
      }
      if (restoreData.repairs) {
        for (const r of restoreData.repairs) {
          await supabase.from('repairs').upsert(r, { onConflict: 'id' });
        }
      }
      if (restoreData.settings) {
        for (const s of restoreData.settings) {
          await supabase.from('settings').upsert(s, { onConflict: 'id' });
        }
      }
      if (restoreData.pricing_settings) {
        for (const p of restoreData.pricing_settings) {
          await supabase.from('pricing_settings').upsert(p, { onConflict: 'id' });
        }
      }
      setMessage('Restore berhasil! Semua data telah dipulihkan.');
      setShowRestoreConfirm(false);
      setRestoreData(null);
      setRestoreFile(null);
    } catch {
      setError('Gagal melakukan restore. Pastikan file backup valid.');
    }
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('settings')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Backup & Restore</h1>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-600" /> Backup Data
        </h2>
        <p className="text-xs text-slate-500">
          Unduh seluruh data untuk cadangan. Format JSON berisi semua data, CSV berisi data servis saja.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleBackup('json')}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4" /> JSON
          </button>
          <button
            onClick={() => handleBackup('csv')}
            className="flex items-center justify-center gap-2 bg-slate-700 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Upload className="w-4 h-4 text-amber-600" /> Restore Data
        </h2>
        <p className="text-xs text-slate-500">
          Pulihkan data dari file backup JSON. Data yang sudah ada akan ditimpa.
        </p>
        <label className="w-full flex items-center justify-center gap-2 bg-amber-50 border-2 border-dashed border-amber-300 text-amber-700 font-semibold py-4 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
          <Upload className="w-5 h-5" /> Pilih File Backup JSON
          <input type="file" accept=".json" className="hidden" onChange={handleRestoreUpload} />
        </label>
        {restoreFile && !showRestoreConfirm && (
          <p className="text-xs text-slate-500">File: {restoreFile.name}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" /> Hapus Data Sample
        </h2>
        <p className="text-xs text-slate-500">
          Hapus data contoh yang disediakan untuk testing. Data servis yang Anda buat sendiri tidak akan terhapus.
        </p>
        <button
          onClick={() => setShowSampleConfirm(true)}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Hapus Data Sample
        </button>
      </div>

      {showSampleConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSampleConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Hapus Data Sample?</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              Data contoh (Budi, Andi, Siti) akan dihapus permanen.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowSampleConfirm(false)}
                className="bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={deleteSampleData}
                className="bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRestoreConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Konfirmasi Restore</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              Data lama akan ditimpa dengan data dari file backup. Tindakan ini tidak dapat dibatalkan. Lanjutkan?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowRestoreConfirm(false); setRestoreData(null); setRestoreFile(null); }}
                className="bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={performRestore}
                className="bg-amber-600 text-white font-semibold py-3 rounded-xl hover:bg-amber-700 transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
