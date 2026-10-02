import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/lib/router';
import { formatRupiah, formatDate } from '@/lib/format';
import { REPAIR_STATUSES } from '@/lib/types';
import type { Customer, RepairWithDetails } from '@/lib/types';
import { Search, Phone, ChevronRight, History, Trash2, CheckSquare, Square, Loader2, Check } from 'lucide-react';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerRepairs, setCustomerRepairs] = useState<RepairWithDetails[]>([]);
  const [loadingRepairs, setLoadingRepairs] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers((data as Customer[]) ?? []);
    setLoading(false);
  }

  async function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setLoadingRepairs(true);
    const { data } = await supabase
      .from('repairs')
      .select('*, customer:customers(*), device:devices(*), damages:repair_damages(*), items:repair_items(*)')
      .eq('customer_id', c.id)
      .order('created_at', { ascending: false });
    setCustomerRepairs((data as unknown as RepairWithDetails[]) ?? []);
    setLoadingRepairs(false);
  }

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const selectedCount = selectedIds.size;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const c of filtered) next.delete(c.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const c of filtered) next.add(c.id);
        return next;
      });
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBatchDelete() {
    setDeleting(true);
    setDeleteError('');
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;
      setShowDeleteConfirm(false);
      clearSelection();
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
      await loadCustomers();
    } catch {
      setDeleteError('Gagal menghapus pelanggan. Pastikan tidak ada data yang gagal terhapus.');
    }
    setDeleting(false);
  }

  if (selectedCustomer) {
    return (
      <div className="py-4 space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => setSelectedCustomer(null)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 rotate-180" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Riwayat Pelanggan</h1>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{selectedCustomer.name}</p>
              <p className="text-sm text-slate-500">{selectedCustomer.phone}</p>
            </div>
          </div>
        </div>

        <h2 className="text-sm font-bold text-slate-700 px-1">Riwayat Servis ({customerRepairs.length})</h2>

        {loadingRepairs ? (
          <div className="text-center py-8 text-slate-400 text-sm">Memuat...</div>
        ) : customerRepairs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            Belum ada riwayat servis
          </div>
        ) : (
          <div className="space-y-2">
            {customerRepairs.map((r) => {
              const status = REPAIR_STATUSES.find((s) => s.value === r.status);
              return (
                <button
                  key={r.id}
                  onClick={() => navigate('detail', { id: r.id })}
                  className="w-full bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">
                      {r.device?.brand ?? '-'} {r.device?.model ?? ''}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{r.damage_type}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(r.created_at)}</p>
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
    );
  }

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-800 pt-2">Pelanggan</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800 text-base bg-white"
          placeholder="Cari nama atau nomor telepon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Select All + Delete bar */}
      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-between gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 active:scale-95 transition-transform"
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-slate-400" />
            )}
            Pilih Semua
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              {selectedCount > 0 ? `${selectedCount} dipilih` : ''}
            </span>
            <button
              onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }}
              disabled={selectedCount === 0}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Terpilih{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          </div>
        </div>
      )}

      {deleteSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> Data pelanggan berhasil dihapus.
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          Belum ada pelanggan
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`w-full bg-white rounded-2xl p-3.5 border shadow-sm flex items-center gap-3 text-left transition-all ${
                  isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-100 hover:shadow-md'
                }`}
              >
                <button
                  onClick={() => toggleSelect(c.id)}
                  className="shrink-0 active:scale-90 transition-transform"
                  aria-label={isSelected ? 'Batal pilih' : 'Pilih pelanggan'}
                >
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Square className="w-6 h-6 text-slate-300" />
                  )}
                </button>
                <button
                  onClick={() => selectCustomer(c)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                  <History className="w-4 h-4 text-slate-300" />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Hapus Pelanggan?</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              Yakin ingin menghapus {selectedCount} data pelanggan yang dipilih? Riwayat transaksi tetap akan tersimpan.
            </p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-sm text-red-600 mb-3 text-center">{deleteError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
