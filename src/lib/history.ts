import { get, set } from "idb-keyval";

export interface HistoryItem {
  id: string;
  type: 'voice' | 'design' | 'sfx';
  createdAt: number;
  text?: string;
  prompt?: string;
  audioBlob: Blob;
  duration?: number;
}

export async function getHistoryEnabled(): Promise<boolean> {
  const val = localStorage.getItem('saveHistoryLocally');
  return val !== 'false'; // default true
}

export function setHistoryEnabled(enabled: boolean) {
  localStorage.setItem('saveHistoryLocally', String(enabled));
}

export async function saveToHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
  const enabled = await getHistoryEnabled();
  if (!enabled) return;

  const history = await get<HistoryItem[]>('genvoice_history') || [];
  const newItem: HistoryItem = {
    ...item,
    id: Date.now().toString(),
    createdAt: Date.now(),
  };
  history.unshift(newItem);
  await set('genvoice_history', history);
}

export async function getHistory(): Promise<HistoryItem[]> {
  return await get<HistoryItem[]>('genvoice_history') || [];
}

export async function clearHistory() {
  await set('genvoice_history', []);
}

export async function deleteHistoryItem(id: string) {
  const history = await get<HistoryItem[]>('genvoice_history') || [];
  await set('genvoice_history', history.filter(h => h.id !== id));
}
