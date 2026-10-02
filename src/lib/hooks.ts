import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { StoreSettings, PricingSetting, PrintMode } from '@/lib/types';

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').maybeSingle();
    setSettings(data as StoreSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, loading, reload: load };
}

export function usePricingSettings() {
  const [pricing, setPricing] = useState<PricingSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('pricing_settings').select('*').order('multiplier');
    setPricing((data as PricingSetting[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { pricing, loading, reload: load };
}

export function usePrinterSettings() {
  const [paperWidth, setPaperWidth] = useState<number>(58);
  const [printMode, setPrintMode] = useState<PrintMode>('rpp02n');

  useEffect(() => {
    const savedWidth = localStorage.getItem('printer_paper_width');
    if (savedWidth) setPaperWidth(parseInt(savedWidth, 10));
    const savedMode = localStorage.getItem('printer_print_mode') as PrintMode | null;
    if (savedMode) setPrintMode(savedMode);
  }, []);

  const updatePaperWidth = (width: number) => {
    setPaperWidth(width);
    localStorage.setItem('printer_paper_width', String(width));
  };

  const updatePrintMode = (mode: PrintMode) => {
    setPrintMode(mode);
    localStorage.setItem('printer_print_mode', mode);
  };

  return { paperWidth, updatePaperWidth, printMode, updatePrintMode };
}
