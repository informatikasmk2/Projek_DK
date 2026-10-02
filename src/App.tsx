import { useRoute, navigate, type Page } from '@/lib/router';
import { LayoutDashboard, Wrench, History, Users, Settings } from 'lucide-react';
import { Dashboard } from '@/pages/Dashboard';
import { NewService } from '@/pages/NewService';
import { HistoryPage } from '@/pages/History';
import { Customers } from '@/pages/Customers';
import { SettingsPage } from '@/pages/Settings';
import { ServiceDetail } from '@/pages/ServiceDetail';
import { EditService } from '@/pages/EditService';
import { ReceiptPage } from '@/pages/Receipt';
import { PricingPage } from '@/pages/Pricing';
import { BackupPage } from '@/pages/Backup';
import { PrinterPage } from '@/pages/Printer';

const NAV_ITEMS: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'history', label: 'Riwayat', icon: History },
  { page: 'new-service', label: 'Servis', icon: Wrench },
  { page: 'customers', label: 'Pelanggan', icon: Users },
  { page: 'settings', label: 'Pengaturan', icon: Settings },
];

export default function App() {
  const route = useRoute();

  const showNav = !['receipt', 'edit-service', 'detail'].includes(route.page);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 pb-20 max-w-2xl mx-auto w-full px-4 sm:px-6">
        {route.page === 'dashboard' && <Dashboard />}
        {route.page === 'new-service' && <NewService />}
        {route.page === 'history' && <HistoryPage />}
        {route.page === 'customers' && <Customers />}
        {route.page === 'settings' && <SettingsPage />}
        {route.page === 'detail' && <ServiceDetail repairId={route.params.id} />}
        {route.page === 'edit-service' && <EditService repairId={route.params.id} />}
        {route.page === 'receipt' && <ReceiptPage repairId={route.params.id} />}
        {route.page === 'pricing' && <PricingPage />}
        {route.page === 'backup' && <BackupPage />}
        {route.page === 'printer' && <PrinterPage />}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = route.page === item.page;
              const isCenter = item.page === 'new-service';
              return (
                <button
                  key={item.page}
                  onClick={() => navigate(item.page)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[60px] ${
                    isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {isCenter ? (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center -mt-4 shadow-lg transition-all ${
                      isActive ? 'bg-blue-600' : 'bg-blue-500'
                    }`}>
                      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  )}
                  <span className={`text-[11px] font-medium ${isCenter ? 'mt-0' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
