import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { formatRupiah, formatDate } from '@/lib/format';
import { REPAIR_STATUSES } from '@/lib/types';
import type { RepairWithDetails, RepairStatus } from '@/lib/types';
import { Search, ChevronRight, Filter } from 'lucide-react';

export function HistoryPage() {
  const [repairs, setRepairs] = useState<RepairWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRepairs();
  }, []);

  async function loadRepairs() {
    const { data } = await supabase
      .from('repairs')
      .select('*, customer:customers(*), device:devices(*), damages:repair_damages(*), items:repair_items(*)')
      .order('created_at', { ascending: false });
    setRepairs((data as unknown as RepairWithDetails[]) ?? []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return repairs.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (r.customer?.name.toLowerCase().includes(q) ?? false) ||
          (r.customer?.phone.includes(q) ?? false) ||
          (r.device?.brand.toLowerCase().includes(q) ?? false) ||
          (r.device?.model.toLowerCase().includes(q) ?? false) ||
          r.invoice_number.toLowerCase().includes(q) ||
          r.damage_type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [repairs, search, statusFilter, dateFrom, dateTo]);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 pt-2">Riwayat Servis</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800 text-base bg-white"
          placeholder="Cari nama, telepon, HP, nota..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter
        </span>
        <span className="text-xs text-slate-400">
          {statusFilter !== 'all' || dateFrom || dateTo ? 'Aktif' : 'Tidak ada filter'}
        </span>
      </button>

      {showFilters && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-800 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              {REPAIR_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dari Tanggal</label>
              <input
                type="date"
                className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-800"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sampai Tanggal</label>
              <input
                type="date"
                className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none text-slate-800"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={() => {
              setStatusFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
            className="w-full text-sm text-red-500 font-medium py-2"
          >
            Reset Filter
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          Tidak ada data ditemukan
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const status = REPAIR_STATUSES.find((s) => s.value === r.status);
            return (
              <button
                key={r.id}
                onClick={() => navigate('detail', { id: r.id })}
                className="w-full bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{r.invoice_number}</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${status?.color}`}>
                      {status?.label}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-800 truncate">{r.customer?.name ?? 'Pelanggan dihapus'}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {r.device?.brand ?? '-'} {r.device?.model ?? ''} — {r.damage_type}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(r.created_at)}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                  <p className="font-bold text-sm text-slate-800">{formatRupiah(Number(r.total_price))}</p>
                  <ChevronRight className="w-4 h-4 text-slate-300 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
