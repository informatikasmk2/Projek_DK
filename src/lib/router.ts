import { useState, useEffect } from 'react';

export type Page =
  | 'dashboard'
  | 'new-service'
  | 'history'
  | 'customers'
  | 'settings'
  | 'detail'
  | 'edit-service'
  | 'receipt'
  | 'pricing'
  | 'backup'
  | 'printer';

export interface RouteState {
  page: Page;
  params: Record<string, string>;
}

let listeners: Array<(s: RouteState) => void> = [];
let currentState: RouteState = { page: 'dashboard', params: {} };

export function navigate(page: Page, params: Record<string, string> = {}) {
  currentState = { page, params };
  listeners.forEach((fn) => fn(currentState));
  window.scrollTo(0, 0);
}

export function useRoute(): RouteState {
  const [state, setState] = useState<RouteState>(currentState);
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((fn) => fn !== setState);
    };
  }, []);
  return state;
}
