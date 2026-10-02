import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { formatRupiah, formatDateTime, isToday, isThisMonth, isWarrantyActive } from '@/lib/format';
import { REPAIR_STATUSES } from '@/lib/types';
import type { RepairWithDetails } from '@/lib/types';
import { useSettings } from '@/lib/hooks';
import { Wrench, TrendingUp, Calendar, Clock, CheckCircle, Shield, Plus, ChevronRight } from 'lucide-react';

export function Dashboard() {
  const { settings } = useSettings();
  const [repairs, setRepairs] = useState<RepairWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepairs();
  }, []);

  async function loadRepairs() {
    const { data } = await supabase
      .from('repairs')
      .select('*, customer:customers(*), device:devices(*), damages:repair_damages(*), items:repair_items(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    setRepairs((data as unknown as RepairWithDetails[]) ?? []);
    setLoading(false);
  }

  const todayRepairs = repairs.filter((r) => isToday(r.created_at));
  const monthRepairs = repairs.filter((r) => isThisMonth(r.created_at));
  const todayRevenue = todayRepairs
    .filter((r) => r.status !== 'batal')
    .reduce((sum, r) => sum + Number(r.total_price), 0);
  const inProgress = repairs.filter((r) => r.status === 'dikerjakan');
  const done = repairs.filter((r) => r.status === 'selesai');
  const warrantyActive = repairs.filter((r) => isWarrantyActive(r.warranty_end));

  const stats = [
    { label: 'Servis Hari Ini', value: todayRepairs.length, icon: Wrench, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pendapatan Hari Ini', value: formatRupiah(todayRevenue), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Servis Bulan Ini', value: monthRepairs.length, icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Sedang Dikerjakan', value: inProgress.length, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Selesai', value: done.length, icon: CheckCircle, color: 'text-teal-600 bg-teal-50' },
    { label: 'Garansi Aktif', value: warrantyActive.length, icon: Shield, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{settings?.store_name ?? 'GM Phone Service'}</h1>
          <p className="text-xs text-slate-500">{settings?.store_subtitle ?? 'Dashboard Servis HP'}</p>
        </div>
      </div>

      <button
        onClick={() => navigate('new-service')}
        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
        SERVIS BARU
      </button>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {typeof stat.value === 'number' ? stat.value : stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">Transaksi Terakhir</h2>
          <button
            onClick={() => navigate('history')}
            className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
          >
            Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Memuat data...</div>
        ) : repairs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            Belum ada transaksi
          </div>
        ) : (
          <div className="space-y-2">
            {repairs.slice(0, 5).map((r) => {
              const status = REPAIR_STATUSES.find((s) => s.value === r.status);
              return (
                <button
                  key={r.id}
                  onClick={() => navigate('detail', { id: r.id })}
                  className="w-full bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400">{r.invoice_number}</span>
                    </div>
                    <p className="font-semibold text-sm text-slate-800 truncate">{r.customer?.name ?? 'Pelanggan dihapus'}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.device?.brand ?? '-'} {r.device?.model ?? ''} — {r.damage_type}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(r.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-slate-800">{formatRupiah(Number(r.total_price))}</p>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-1 ${status?.color}`}>
                      {status?.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
