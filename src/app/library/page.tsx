'use client';

import { useState, useEffect } from 'react';
import { getHistory, HistoryItem, deleteHistoryItem, clearHistory, getHistoryEnabled, setHistoryEnabled, renameHistoryItem } from '@/lib/history';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Trash2, Mic, Wand2, AudioLines, Settings, Library, Pencil, Check, X } from 'lucide-react';

export default function LibraryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('saveHistoryLocally') !== 'false';
    }
    return true;
  });
  const [populateFromLibrary, setPopulateFromLibrary] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('populateFromLibrary') === 'true';
    }
    return false;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  useEffect(() => {
    const isPopulate = localStorage.getItem('populateFromLibrary') === 'true';
    setPopulateFromLibrary(isPopulate);
    const isEnabled = localStorage.getItem('saveHistoryLocally') !== 'false';
    setEnabled(isEnabled);
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const history = await getHistory();
    setItems(history);
    setLoading(false);
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnabled(e.target.checked);
    setHistoryEnabled(e.target.checked);
  };

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id);
    setItems(items.filter(i => i.id !== id));
  };

  const handleRename = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await renameHistoryItem(id, trimmed);
    setItems(items.map(i => i.id === id ? { ...i, name: trimmed } : i));
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear your entire local library? This cannot be undone.")) {
      await clearHistory();
      setItems([]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'voice': return <Mic size={16} />;
      case 'design': return <Wand2 size={16} />;
      case 'sfx': return <AudioLines size={16} />;
      default: return <Mic size={16} />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'voice': return 'Voice Clone';
      case 'design': return 'Voice Design';
      case 'sfx': return 'Sound Effect';
      default: return 'Generation';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-base flex flex-col items-center">
      <div className="w-full max-w-4xl p-6 md:p-12 pb-24 md:pb-12 pt-20 md:pt-12 space-y-8 animate-in fade-in duration-500 relative">
        <header className="flex flex-col gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent-bg/10 flex items-center justify-center border border-accent-bg/20 shrink-0 mt-1 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <Settings size={20} className="text-text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">Local Library</h1>
              <p className="text-text-secondary text-sm md:text-base max-w-xl leading-relaxed mt-1">
                All your generated audio and metadata is stored locally on your device in the browser's secure IndexedDB storage. It never touches our cloud.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 border border-border-color rounded-xl bg-bg-panel/50 mt-2">
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary">Save Generations to Library</h3>
              <p className="text-xs text-text-secondary">Automatically save new Voice Clones, Voice Designs, and Sound Effects to this local history.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" checked={enabled} onChange={handleToggle} suppressHydrationWarning className="sr-only peer" />
              <div className={`w-11 h-6 bg-border-color peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 ${mounted ? 'after:transition-all' : ''} peer-checked:bg-accent-bg`}></div>
            </label>
          </div>

          <div className="flex items-center gap-4 p-4 border border-border-color rounded-xl bg-bg-panel/50 mt-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary">Show Library in Custom Voices</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-hover text-text-muted">Optional</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically populate the Voice Generator dropdown with voices designed and saved in this history.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                checked={populateFromLibrary} 
                suppressHydrationWarning
                onChange={(e) => {
                  const val = e.target.checked;
                  setPopulateFromLibrary(val);
                  localStorage.setItem('populateFromLibrary', String(val));
                  window.dispatchEvent(new CustomEvent('genvoice-populate-library-changed', { detail: val }));
                }} 
                className="sr-only peer" 
              />
              <div className={`w-11 h-6 bg-border-color peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 ${mounted ? 'after:transition-all' : ''} peer-checked:bg-accent-bg`}></div>
            </label>
          </div>
        </header>

        <div className="flex items-center justify-between border-b border-border-color pb-4">
          <h2 className="text-lg font-semibold text-text-primary">Your History</h2>
          {items.length > 0 && (
            <button 
              onClick={handleClear}
              className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              Clear History
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-text-secondary text-center py-12">Loading local library...</div>
        ) : items.length === 0 ? (
          <div className="text-text-muted text-center py-20 flex flex-col items-center gap-3">
            <Library size={48} className="opacity-20" />
            <p>Your library is empty.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.id} className="p-5 border border-border-color rounded-2xl bg-bg-panel/50 space-y-4 shadow-sm hover:border-border-color/80 transition-colors relative group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-bg-base border border-border-color rounded-md text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                      {getIcon(item.type)}
                      {getLabel(item.type)}
                    </span>
                    <span className="text-xs text-text-muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete from Library"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (editingName.trim()) {
                              handleRename(item.id, editingName.trim());
                            }
                            setEditingId(null);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingId(null);
                          }
                        }}
                        className="flex-1 min-w-0 bg-bg-input border border-border-color rounded-lg px-2.5 py-1 text-xs sm:text-sm text-text-primary outline-none focus:border-border-color"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingName.trim()) {
                            handleRename(item.id, editingName.trim());
                          }
                          setEditingId(null);
                        }}
                        className="p-1 rounded text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors shrink-0"
                        title="Save name"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {item.name || (item.prompt ? (item.prompt.length > 40 ? item.prompt.slice(0, 40) + '...' : item.prompt) : getLabel(item.type))}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name || (item.prompt ? (item.prompt.length > 40 ? item.prompt.slice(0, 40) + '...' : item.prompt) : getLabel(item.type)));
                        }}
                        className="p-1 text-text-muted hover:text-text-primary hover:bg-accent-bg/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        title="Rename item"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {item.prompt && (
                  <div className="text-sm font-medium text-text-primary">
                    <span className="text-xs text-text-muted uppercase tracking-wider block mb-1">Prompt</span>
                    {item.prompt}
                  </div>
                )}
                
                {item.text && (
                  <div className="text-sm text-text-secondary italic border-l-2 border-border-color pl-3">
                    {item.text}
                  </div>
                )}

                <div className="pt-2">
                  <AudioPlayer 
                    src={URL.createObjectURL(item.audioBlob)} 
                    name={`genvoice_${item.type}_${item.id}.wav`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
