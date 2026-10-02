import { useState, useEffect, useCallback } from 'react';
import { navigate } from '@/lib/router';
import { usePrinterSettings } from '@/lib/hooks';
import { checkHealth, sendToCleanter, buildTestPrintPayload } from '@/lib/cleanter';
import type { HealthResult } from '@/lib/cleanter';
import type { PrintMode } from '@/lib/types';
import { ArrowLeft, Printer, RefreshCw, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export function PrinterPage() {
  const { paperWidth, updatePaperWidth, printMode, updatePrintMode } = usePrinterSettings();
  const [mode, setMode] = useState<'58' | '80' | 'custom'>(
    paperWidth === 58 ? '58' : paperWidth === 80 ? '80' : 'custom'
  );
  const [customWidth, setCustomWidth] = useState(
    paperWidth !== 58 && paperWidth !== 80 ? String(paperWidth) : ''
  );
  const [saved, setSaved] = useState(false);

  const [health, setHealth] = useState<HealthResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const checkBridge = useCallback(async () => {
    setChecking(true);
    setTestResult(null);
    const result = await checkHealth();
    setHealth(result);
    setChecking(false);
  }, []);

  useEffect(() => {
    checkBridge();
  }, [checkBridge]);

  function handleSave() {
    const width = mode === '58' ? 58 : mode === '80' ? 80 : parseInt(customWidth) || 58;
    updatePaperWidth(width);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTestPrint() {
    setTesting(true);
    setTestResult(null);
    const result = await sendToCleanter(buildTestPrintPayload(paperWidth));
    setTestResult(result);
    setTesting(false);
    if (result.success) {
      setHealth({ status: 'printer_connected', connected: true });
    } else {
      await checkBridge();
    }
  }

  const printModes: { value: PrintMode; label: string; desc: string }[] = [
    { value: 'rpp02n', label: 'RPP02N Bluetooth', desc: 'Via Cleanter bridge (localhost:9100)' },
    { value: 'android', label: 'Android System Print', desc: 'Cetak melalui sistem print Android' },
    { value: 'preview', label: 'Preview / PDF', desc: 'Simpan atau cetak sebagai PDF' },
  ];

  const bridgeDown = health?.status === 'bridge_down';
  const printerConnected = health?.status === 'printer_connected';
  const bridgeUpNotConnected = health?.status === 'bridge_up';

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('settings')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Pengaturan Printer</h1>
      </div>

      {/* Bridge Status */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Status Bridge</h2>
          <button
            onClick={checkBridge}
            disabled={checking}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} /> Cek Ulang
          </button>
        </div>

        <div className="flex items-center gap-3">
          {checking ? (
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          ) : printerConnected ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : bridgeUpNotConnected ? (
            <AlertCircle className="w-6 h-6 text-amber-500" />
          ) : bridgeDown ? (
            <XCircle className="w-6 h-6 text-red-500" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200" />
          )}
          <div>
            {checking ? (
              <p className="text-sm font-medium text-slate-500">Mengecek bridge...</p>
            ) : printerConnected ? (
              <div>
                <p className="text-sm font-semibold text-emerald-600">Printer Terhubung</p>
                <p className="text-xs text-slate-500">RPP02N</p>
              </div>
            ) : bridgeUpNotConnected ? (
              <p className="text-sm font-semibold text-amber-600">Printer Belum Terhubung</p>
            ) : bridgeDown ? (
              <div>
                <p className="text-sm font-semibold text-red-600">Cleanter Tidak Aktif</p>
                <p className="text-xs text-slate-500">Buka aplikasi Cleanter dan pastikan Print Bridge aktif.</p>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-400">Belum dicek</p>
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 space-y-0.5">
          <p>Printer: RPP02N</p>
          <p>Koneksi: Bluetooth Classic (SPP)</p>
          <p>Paper: {paperWidth} mm</p>
        </div>

        {bridgeDown && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
            <p className="font-semibold">Petunjuk:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Nyalakan Bluetooth.</li>
              <li>Pair RPP02N melalui Pengaturan Android.</li>
              <li>Buka aplikasi Cleanter.</li>
              <li>Pilih RPP02N di Cleanter.</li>
              <li>Pastikan Cleanter aktif.</li>
              <li>Kembali ke aplikasi servis.</li>
              <li>Tekan Test Print.</li>
            </ol>
          </div>
        )}

        {bridgeUpNotConnected && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            <p>Cleanter aktif tetapi RPP02N belum terhubung. Pilih RPP02N di aplikasi Cleanter.</p>
          </div>
        )}

        <button
          onClick={handleTestPrint}
          disabled={testing || bridgeDown}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
          {testing ? 'Mengirim...' : 'TEST PRINT'}
        </button>

        {testResult && (
          <div className={`rounded-xl p-3 text-sm ${testResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* Print Mode */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Mode Cetak</h2>
        <div className="space-y-2">
          {printModes.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updatePrintMode(opt.value)}
              className={`w-full p-3.5 rounded-xl border-2 text-left transition-all ${
                printMode === opt.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${printMode === opt.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                  {printMode === opt.value && <div className="w-2.5 h-2.5 bg-white rounded-full m-auto mt-0.5" />}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Paper Width */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Printer className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Lebar Kertas</h2>
        </div>

        <div className="space-y-2">
          {[
            { value: '58', label: '58 mm', desc: 'Thermal printer standar (32 karakter)' },
            { value: '80', label: '80 mm', desc: 'Thermal printer lebar (48 karakter)' },
            { value: 'custom', label: 'Custom', desc: 'Atur sendiri lebar kertas' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value as '58' | '80' | 'custom')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                mode === opt.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${mode === opt.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                  {mode === opt.value && <div className="w-2.5 h-2.5 bg-white rounded-full m-auto mt-0.5" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        {mode === 'custom' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lebar Kertas (mm)</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800 text-base"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="76"
              inputMode="numeric"
            />
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        className={`w-full font-semibold py-3.5 rounded-xl shadow-sm transition-colors ${
          saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
      </button>
    </div>
  );
}
